// Executes every pointer dereference and native call on the game Framework thread.
#include "game_runtime.hpp"

#include <Windows.h>

#include <MinHook.h>

#include <algorithm>
#include <array>
#include <cctype>
#include <cmath>
#include <cstring>
#include <stdexcept>
#include <thread>

namespace bridge {
namespace {

constexpr std::size_t kMaximumCharacters = 64;
constexpr std::uint32_t kMaximumConfigEntries = 4096;
constexpr std::uint32_t kSnapshotIntervalTicks = 30;
constexpr std::uint8_t kButtonClickEvent = 25;
constexpr std::int32_t kMaximumInventorySlots = 200;
constexpr std::size_t kMaximumGlamourDresserSlots = 800;

struct InventoryDefinition final {
  std::uint32_t type;
  const char* name;
};

constexpr std::array<InventoryDefinition, 18> kInventoryDefinitions{{
    {1000, "equipped"},
    {0, "inventory_1"},
    {1, "inventory_2"},
    {2, "inventory_3"},
    {3, "inventory_4"},
    {3500, "armory_main_hand"},
    {3200, "armory_off_hand"},
    {3201, "armory_head"},
    {3202, "armory_body"},
    {3203, "armory_hands"},
    {3204, "armory_waist"},
    {3205, "armory_legs"},
    {3206, "armory_feet"},
    {3207, "armory_ear"},
    {3208, "armory_neck"},
    {3209, "armory_wrist"},
    {3300, "armory_rings"},
    {3400, "armory_soul_crystal"},
}};

using GetUiModule = void*(__fastcall*)(void* framework);
using GetAgentByInternalId = void*(__fastcall*)(void* agent_module, std::uint32_t id);
using GetInventoryContainer = void*(__fastcall*)(void* inventory_manager,
                                                 std::uint32_t inventory_type);
using Utf8SetString = void(__fastcall*)(void* value, const char* text);
using ReleaseLobbyContext = void(__fastcall*)(void* network_module);
using ReturnToTitle = void(__fastcall*)(void* agent_lobby);
using GetAddonByName = void*(__fastcall*)(void* unit_manager, const char* name, int index);
using GetComponentButtonById = void*(__fastcall*)(void* addon, std::uint32_t node_id);
using ReceiveEvent = void(__fastcall*)(void* addon, std::uint8_t event_type, int event_param,
                                       void* event, void* event_data);

template <typename T>
T read_value(const std::byte* base, std::size_t offset) {
  const auto* address = base + offset;
  if (!is_readable(address, sizeof(T))) throw std::runtime_error("unreadable game field");
  return *reinterpret_cast<const T*>(address);
}

template <typename T>
T* read_pointer(const std::byte* base, std::size_t offset) {
  return read_value<T*>(base, offset);
}

template <typename T>
T vtable_function(void* instance, std::size_t index) {
  if (!is_readable(instance, sizeof(void*))) throw std::runtime_error("invalid vtable owner");
  auto** vtable = *reinterpret_cast<void***>(instance);
  if (!is_readable(vtable + index, sizeof(void*))) throw std::runtime_error("invalid vtable slot");
  return reinterpret_cast<T>(vtable[index]);
}

bool valid_hostname(const std::string& value) {
  if (value.empty() || value.size() > 253 || value.front() == '.' || value.back() == '.')
    return false;
  std::size_t label_length = 0;
  bool label_starts_with_hyphen = false;
  unsigned char previous = 0;
  for (const unsigned char character : value) {
    if (character == '.') {
      if (label_length == 0 || label_length > 63 || label_starts_with_hyphen || previous == '-') {
        return false;
      }
      label_length = 0;
      label_starts_with_hyphen = false;
      previous = character;
      continue;
    }
    if (!(std::isalnum(character) || character == '-')) return false;
    if (label_length == 0) label_starts_with_hyphen = character == '-';
    ++label_length;
    previous = character;
  }
  return label_length > 0 && label_length <= 63 && !label_starts_with_hyphen && previous != '-';
}

std::string fixed_string(const char* value, std::size_t capacity) {
  if (!is_readable(value, capacity)) throw std::runtime_error("unreadable fixed string");
  const auto* end = static_cast<const char*>(std::memchr(value, '\0', capacity));
  if (!end) throw std::runtime_error("unterminated fixed string");
  return std::string(value, end);
}

std::string bounded_cstring(const char* value, std::size_t maximum) {
  if (!value) throw std::runtime_error("null string pointer");
  std::string result;
  result.reserve(maximum);
  for (std::size_t index = 0; index < maximum; ++index) {
    if (!is_readable(value + index, 1)) throw std::runtime_error("unreadable string field");
    if (value[index] == '\0') return result;
    result.push_back(value[index]);
  }
  throw std::runtime_error("unterminated string field");
}

CommandOutcome failure(std::string code, std::string message) {
  return {false, std::move(code), std::move(message), std::nullopt, std::nullopt, std::nullopt, {}};
}

CommandOutcome acknowledgement() {
  return {true, {}, {}, std::nullopt, std::nullopt, std::nullopt, {}};
}

template <std::size_t N>
void write_shared_string(std::array<char, N>& output, const std::string& value) {
  const auto length = std::min(value.size(), N - 1);
  std::copy_n(value.data(), length, output.data());
  output[length] = '\0';
}

template <std::size_t N>
std::string read_shared_string(const std::array<char, N>& value, std::uint32_t length) {
  if (length == 0 || length >= N) throw std::runtime_error("invalid shared command string");
  return std::string(value.data(), length);
}

}  // namespace

GameRuntime* GameRuntime::active_ = nullptr;

RegionTarget::~RegionTarget() { SecureZeroMemory(game_session.data(), game_session.size()); }

GameRuntime::GameRuntime(Layout layout, bool private_layout_verified, ResolvedAddresses addresses,
                         SharedBridge* shared)
    : layout_(layout),
      private_layout_verified_(private_layout_verified),
      addresses_(addresses),
      shared_(shared) {}

GameRuntime::~GameRuntime() { stop(); }

void GameRuntime::start() {
  if (active_) throw std::runtime_error("game runtime is already active");
  if (!shared_ || shared_->magic != kSharedMagic || shared_->abi_version != kSharedAbiVersion ||
      shared_->struct_size != sizeof(SharedBridge)) {
    throw std::runtime_error("invalid shared-memory ABI");
  }
  if (!is_readable(addresses_.framework_instance_slot, sizeof(void*))) {
    throw std::runtime_error("framework instance slot is unreadable");
  }
  if (!is_readable(addresses_.local_player_slot, sizeof(void*)) ||
      !is_readable(addresses_.game_main_instance, sizeof(void*))) {
    throw std::runtime_error("active character roots are unreadable");
  }
  if (!is_readable(addresses_.inventory_manager_instance, sizeof(void*))) {
    throw std::runtime_error("inventory manager is unreadable");
  }
  auto* framework = *addresses_.framework_instance_slot;
  if (!framework) throw std::runtime_error("framework instance is null");
  hook_target_ = vtable_function<void*>(framework, layout_.framework_tick_vtable_index);

  const auto initialize_status = MH_Initialize();
  if (initialize_status != MH_OK && initialize_status != MH_ERROR_ALREADY_INITIALIZED) {
    throw std::runtime_error("unable to initialize hook backend");
  }
  active_ = this;
  if (MH_CreateHook(hook_target_, reinterpret_cast<void*>(&tick_detour),
                    reinterpret_cast<void**>(&original_tick_)) != MH_OK ||
      MH_EnableHook(hook_target_) != MH_OK) {
    active_ = nullptr;
    MH_RemoveHook(hook_target_);
    MH_Uninitialize();
    throw std::runtime_error("unable to install Framework hook");
  }
}

void GameRuntime::stop() {
  if (stopped_.exchange(true, std::memory_order_acq_rel)) return;
  stopping_.store(true, std::memory_order_release);
  if (hook_target_) {
    MH_DisableHook(hook_target_);
    while (active_callbacks_.load(std::memory_order_acquire) != 0) {
      std::this_thread::yield();
    }
    MH_RemoveHook(hook_target_);
    MH_Uninitialize();
    hook_target_ = nullptr;
  }
  active_ = nullptr;
}

bool __fastcall GameRuntime::tick_detour(void* framework) {
  auto* runtime = active_;
  if (!runtime || !runtime->original_tick_) return false;
  runtime->active_callbacks_.fetch_add(1, std::memory_order_acq_rel);
  runtime->on_tick(framework);
  const auto result = runtime->original_tick_(framework);
  runtime->active_callbacks_.fetch_sub(1, std::memory_order_acq_rel);
  return result;
}

bool GameRuntime::on_tick(void* framework) noexcept {
  try {
    if (!stopping_.load(std::memory_order_acquire)) {
      std::atomic_ref(shared_->heartbeat).fetch_add(1, std::memory_order_relaxed);
      process_shared_command(framework);
      if (++sampling_counter_ >= kSnapshotIntervalTicks) {
        sampling_counter_ = 0;
        // Periodic snapshots are best-effort. A transient or version-specific layout failure must
        // not stop command processing and leave later requests waiting forever in the queue.
        try {
          auto outcome = capture_snapshot(framework);
          if (outcome.success && outcome.snapshot) write_latest_snapshot(*outcome.snapshot);
        } catch (...) {
        }
      }
    }
    return true;
  } catch (const std::exception& error) {
    write_shared_string(shared_->fatal_code, "game_thread_failed");
    write_shared_string(shared_->fatal_message, error.what());
    std::atomic_ref(shared_->payload_state)
        .store(static_cast<std::uint32_t>(SharedPayloadState::Faulted), std::memory_order_release);
    stopping_.store(true, std::memory_order_release);
    return false;
  }
}

void GameRuntime::process_shared_command(void* framework) {
  const auto sequence = std::atomic_ref(shared_->request_sequence).load(std::memory_order_acquire);
  if (sequence == 0 || sequence == last_request_sequence_) return;
  last_request_sequence_ = sequence;

  const auto kind = shared_->command.kind;
  CommandOutcome outcome;
  try {
    switch (kind) {
      case SharedCommandKind::CaptureSnapshot:
        outcome = capture_snapshot(framework);
        break;
      case SharedCommandKind::CaptureActiveCharacter:
        outcome = capture_active_character();
        break;
      case SharedCommandKind::CaptureInventory:
        outcome = capture_inventory(framework);
        break;
      case SharedCommandKind::ReturnToTitle:
        outcome = return_to_title(framework);
        break;
      case SharedCommandKind::SwitchRegion: {
        RegionTarget target;
        const auto& source = shared_->command.switch_region;
        target.region_name = read_shared_string(source.region_name, source.region_name_length);
        target.lobby_host = read_shared_string(source.lobby_host, source.lobby_host_length);
        target.save_data_host =
            read_shared_string(source.save_data_host, source.save_data_host_length);
        target.gm_host = read_shared_string(source.gm_host, source.gm_host_length);
        target.game_session = read_shared_string(source.game_session, source.game_session_length);
        outcome = switch_region(framework, target);
        SecureZeroMemory(shared_->command.switch_region.game_session.data(),
                         shared_->command.switch_region.game_session.size());
        break;
      }
      case SharedCommandKind::TriggerLogin:
        outcome = trigger_login(framework);
        break;
      case SharedCommandKind::Shutdown:
        outcome = acknowledgement();
        break;
      default:
        outcome = failure("invalid_command", "Unknown shared-memory command.");
        break;
    }
  } catch (const std::exception& error) {
    outcome = failure("game_access_failed", error.what());
  } catch (...) {
    outcome = failure("game_access_failed", "Unknown game access failure.");
  }
  write_response(sequence, kind, outcome);
}

CommandOutcome GameRuntime::capture_snapshot(void* framework) {
  auto* agent = static_cast<std::byte*>(get_agent_lobby(framework));
  if (!agent) return failure("lobby_unavailable", "The lobby agent is not available.");
  const auto selected_index =
      read_value<std::uint8_t>(agent, layout_.agent_selected_character_index);
  if (selected_index == 0xff) return failure("character_unavailable", "No character is selected.");

  auto* vector = agent + layout_.agent_lobby_data + layout_.lobby_entries_vector;
  auto** begin = read_value<std::byte**>(vector, 0);
  auto** end = read_value<std::byte**>(vector, sizeof(void*));
  if (!begin || !end || end < begin || static_cast<std::size_t>(end - begin) > kMaximumCharacters ||
      selected_index >= static_cast<std::size_t>(end - begin) ||
      !is_readable(begin, static_cast<std::size_t>(end - begin) * sizeof(void*))) {
    return failure("character_vector_invalid", "The character list is invalid.");
  }
  auto* entry = begin[selected_index];
  if (!entry) return failure("character_unavailable", "The selected character is unavailable.");

  GameSnapshot snapshot;
  const auto content_id = read_value<std::uint64_t>(entry, layout_.entry_content_id);
  const auto selected_content_id =
      read_value<std::uint64_t>(agent, layout_.agent_selected_content_id);
  if (selected_content_id != 0 && selected_content_id != content_id) {
    return failure("character_changed", "The selected character changed during capture.");
  }
  snapshot.content_id = std::to_string(content_id);
  snapshot.character_name = fixed_string(reinterpret_cast<const char*>(entry + layout_.entry_name),
                                         layout_.entry_name_capacity);
  snapshot.current_world_id = read_value<std::uint16_t>(entry, layout_.entry_current_world_id);
  snapshot.home_world_id = read_value<std::uint16_t>(entry, layout_.entry_home_world_id);
  snapshot.login_flags = read_value<std::uint8_t>(entry, layout_.entry_login_flags);
  snapshot.sequence = next_snapshot_sequence_++;
  return {true, {}, {}, snapshot, std::nullopt, std::nullopt, {}};
}

CommandOutcome GameRuntime::capture_active_character() {
  auto* local_player = *addresses_.local_player_slot;
  if (!local_player) {
    return failure("not_in_world",
                   "The local player is not available. Enter the game world first.");
  }

  auto* game_main = addresses_.game_main_instance;
  const auto connected_to_zone = read_value<bool>(game_main, layout_.game_main_connected_to_zone);
  const auto territory_load_state =
      read_value<std::uint32_t>(game_main, layout_.game_main_territory_load_state);
  const auto territory_id =
      read_value<std::uint32_t>(game_main, layout_.game_main_current_territory);
  if (!connected_to_zone || territory_load_state != 2 || territory_id == 0) {
    return failure("territory_not_ready", "The current territory is not fully loaded.");
  }

  ActiveCharacterSnapshot snapshot;
  snapshot.character_name =
      fixed_string(reinterpret_cast<const char*>(local_player + layout_.active_character_name),
                   layout_.active_character_name_capacity);
  snapshot.entity_id = read_value<std::uint32_t>(local_player, layout_.active_character_entity_id);
  const auto position = read_value<Position3>(local_player, layout_.active_character_position);
  if (!std::isfinite(position.x) || !std::isfinite(position.y) || !std::isfinite(position.z)) {
    return failure("position_invalid", "The local player position is invalid.");
  }
  snapshot.position = position;

  auto* character_data = local_player + layout_.active_character_data;
  snapshot.current_hp = read_value<std::uint32_t>(character_data, layout_.active_character_health);
  snapshot.max_hp = read_value<std::uint32_t>(character_data, layout_.active_character_max_health);
  snapshot.current_mp = read_value<std::uint32_t>(character_data, layout_.active_character_mana);
  snapshot.max_mp = read_value<std::uint32_t>(character_data, layout_.active_character_max_mana);
  snapshot.class_job_id =
      read_value<std::uint8_t>(character_data, layout_.active_character_class_job);
  snapshot.level = read_value<std::uint8_t>(character_data, layout_.active_character_level);

  const auto content_id =
      read_value<std::uint64_t>(local_player, layout_.active_character_content_id);
  if (content_id == 0 || snapshot.character_name.empty()) {
    return failure("character_invalid", "The local player identity is incomplete.");
  }
  snapshot.content_id = std::to_string(content_id);
  snapshot.current_world_id =
      read_value<std::uint16_t>(local_player, layout_.active_character_current_world);
  snapshot.home_world_id =
      read_value<std::uint16_t>(local_player, layout_.active_character_home_world);
  snapshot.territory_id = territory_id;
  snapshot.territory_load_state = territory_load_state;
  snapshot.connected_to_zone = connected_to_zone;
  return {true, {}, {}, std::nullopt, snapshot, std::nullopt, {}};
}

CommandOutcome GameRuntime::capture_inventory(void* framework) {
  if (!*addresses_.local_player_slot) {
    return failure("not_in_world",
                   "The local player is not available. Enter the game world first.");
  }

  PlayerInventorySnapshot snapshot;
  snapshot.containers.reserve(kInventoryDefinitions.size());
  auto get_container = reinterpret_cast<GetInventoryContainer>(addresses_.get_inventory_container);
  for (const auto& definition : kInventoryDefinitions) {
    InventoryContainerSnapshot container_snapshot;
    container_snapshot.name = definition.name;
    container_snapshot.inventory_type = definition.type;

    auto* container = static_cast<std::byte*>(
        get_container(addresses_.inventory_manager_instance, definition.type));
    if (!container) {
      snapshot.containers.push_back(std::move(container_snapshot));
      continue;
    }

    container_snapshot.loaded = read_value<bool>(container, layout_.inventory_container_loaded);
    container_snapshot.size = read_value<std::int32_t>(container, layout_.inventory_container_size);
    if (container_snapshot.size < 0 || container_snapshot.size > kMaximumInventorySlots) {
      return failure("inventory_size_invalid", "An inventory container has an invalid size.");
    }
    if (!container_snapshot.loaded || container_snapshot.size == 0) {
      snapshot.containers.push_back(std::move(container_snapshot));
      continue;
    }

    const auto actual_type = read_value<std::uint32_t>(container, layout_.inventory_container_type);
    if (actual_type != definition.type) {
      return failure("inventory_type_mismatch", "An inventory container has an unexpected type.");
    }
    auto* items = read_pointer<std::byte>(container, layout_.inventory_container_items);
    if (!items) {
      return failure("inventory_items_unavailable", "An inventory container has no item array.");
    }

    container_snapshot.items.reserve(static_cast<std::size_t>(container_snapshot.size));
    for (std::int32_t index = 0; index < container_snapshot.size; ++index) {
      auto* item = items + static_cast<std::size_t>(index) * layout_.inventory_item_size;
      const auto is_symbolic = read_value<bool>(item, layout_.inventory_item_symbolic);
      const auto item_id =
          is_symbolic ? 0U : read_value<std::uint32_t>(item, layout_.inventory_item_id);
      if (!is_symbolic && item_id == 0) continue;

      InventoryItemSnapshot item_snapshot;
      item_snapshot.inventory_type =
          read_value<std::uint32_t>(item, layout_.inventory_item_container);
      item_snapshot.slot = read_value<std::int16_t>(item, layout_.inventory_item_slot);
      item_snapshot.item_id = item_id;
      item_snapshot.quantity = read_value<std::int32_t>(item, layout_.inventory_item_quantity);
      item_snapshot.spiritbond_or_collectability =
          read_value<std::uint16_t>(item, layout_.inventory_item_spiritbond);
      item_snapshot.condition = read_value<std::uint16_t>(item, layout_.inventory_item_condition);
      item_snapshot.flags = read_value<std::uint8_t>(item, layout_.inventory_item_flags);
      item_snapshot.glamour_id = read_value<std::uint32_t>(item, layout_.inventory_item_glamour_id);
      item_snapshot.is_symbolic = is_symbolic;
      if (is_symbolic) {
        item_snapshot.linked_slot =
            read_value<std::uint16_t>(item, layout_.inventory_item_linked_slot);
        item_snapshot.linked_inventory_type =
            read_value<std::uint16_t>(item, layout_.inventory_item_linked_type);
      }
      for (std::size_t materia_index = 0; materia_index < item_snapshot.materia.size();
           ++materia_index) {
        item_snapshot.materia[materia_index] = read_value<std::uint16_t>(
            item, layout_.inventory_item_materia + materia_index * sizeof(std::uint16_t));
        item_snapshot.materia_grades[materia_index] =
            read_value<std::uint8_t>(item, layout_.inventory_item_materia_grades + materia_index);
      }
      for (std::size_t stain_index = 0; stain_index < item_snapshot.stains.size(); ++stain_index) {
        item_snapshot.stains[stain_index] =
            read_value<std::uint8_t>(item, layout_.inventory_item_stains + stain_index);
      }
      container_snapshot.items.push_back(std::move(item_snapshot));
    }
    snapshot.containers.push_back(std::move(container_snapshot));
  }

  auto* ui_module = reinterpret_cast<GetUiModule>(addresses_.get_ui_module)(framework);
  if (ui_module) {
    auto get_item_finder = vtable_function<void*(__fastcall*)(void*)>(
        ui_module, layout_.get_item_finder_module_vtable_index);
    auto* item_finder = static_cast<std::byte*>(get_item_finder(ui_module));
    if (item_finder) {
      snapshot.glamour_dresser.cached =
          read_value<bool>(item_finder, layout_.item_finder_glamour_cached);
      snapshot.glamour_dresser.may_be_stale = snapshot.glamour_dresser.cached;
      if (snapshot.glamour_dresser.cached) {
        const auto capacity = layout_.item_finder_glamour_capacity;
        if (capacity == 0 || capacity > kMaximumGlamourDresserSlots) {
          return failure("glamour_cache_invalid",
                         "The glamour dresser cache has an invalid capacity.");
        }
        snapshot.glamour_dresser.items.reserve(capacity);
        for (std::size_t index = 0; index < capacity; ++index) {
          const auto item_id = read_value<std::uint32_t>(
              item_finder, layout_.item_finder_glamour_item_ids + index * sizeof(std::uint32_t));
          if (item_id == 0) continue;
          const auto unlock_bits = read_value<std::uint16_t>(
              item_finder, layout_.item_finder_glamour_unlock_bits + index * sizeof(std::uint16_t));
          snapshot.glamour_dresser.items.push_back(
              {static_cast<std::uint16_t>(index), item_id, unlock_bits});
        }
      }
    }
  }

  return {true, {}, {}, std::nullopt, std::nullopt, snapshot, {}};
}

void GameRuntime::write_response(std::uint64_t sequence, SharedCommandKind kind,
                                 const CommandOutcome& outcome) {
  auto& response = shared_->response;
  SecureZeroMemory(&response, sizeof(response));
  response.request_id = shared_->command.request_id;
  response.kind = kind;
  if (!outcome.success) {
    response.status = SharedResponseStatus::Error;
    write_shared_string(response.error_code, outcome.code);
    write_shared_string(response.error_message, outcome.message);
  } else {
    response.status = SharedResponseStatus::Success;
    if (outcome.snapshot) {
      const auto& source = *outcome.snapshot;
      response.snapshot.content_id = std::stoull(source.content_id);
      write_shared_string(response.snapshot.character_name, source.character_name);
      response.snapshot.current_world_id = source.current_world_id;
      response.snapshot.home_world_id = source.home_world_id;
      response.snapshot.login_flags = source.login_flags;
      response.snapshot.sequence = source.sequence;
    }
    if (outcome.active_character) {
      const auto& source = *outcome.active_character;
      response.active_character.content_id = std::stoull(source.content_id);
      write_shared_string(response.active_character.character_name, source.character_name);
      response.active_character.entity_id = source.entity_id;
      response.active_character.current_world_id = source.current_world_id;
      response.active_character.home_world_id = source.home_world_id;
      response.active_character.class_job_id = source.class_job_id;
      response.active_character.level = source.level;
      response.active_character.current_hp = source.current_hp;
      response.active_character.max_hp = source.max_hp;
      response.active_character.current_mp = source.current_mp;
      response.active_character.max_mp = source.max_mp;
      response.active_character.position = {source.position.x, source.position.y,
                                            source.position.z};
      response.active_character.territory_id = source.territory_id;
      response.active_character.territory_load_state = source.territory_load_state;
      response.active_character.connected_to_zone = source.connected_to_zone ? 1 : 0;
    }
    if (outcome.inventory) {
      const auto& source = *outcome.inventory;
      if (source.containers.size() > kMaximumSharedContainers ||
          source.glamour_dresser.items.size() > kMaximumSharedDresserItems) {
        response.status = SharedResponseStatus::Error;
        write_shared_string(response.error_code, "shared_response_too_large");
        write_shared_string(response.error_message,
                            "The inventory response exceeds shared-memory ABI limits.");
      } else {
        auto& target = response.inventory;
        target.container_count = static_cast<std::uint32_t>(source.containers.size());
        target.dresser_cached = source.glamour_dresser.cached ? 1 : 0;
        target.dresser_may_be_stale = source.glamour_dresser.may_be_stale ? 1 : 0;
        std::size_t item_cursor = 0;
        for (std::size_t container_index = 0; container_index < source.containers.size();
             ++container_index) {
          const auto& source_container = source.containers[container_index];
          if (source_container.items.size() > kMaximumSharedItems - item_cursor) {
            response.status = SharedResponseStatus::Error;
            write_shared_string(response.error_code, "shared_response_too_large");
            write_shared_string(response.error_message,
                                "The inventory item count exceeds shared-memory ABI limits.");
            break;
          }
          auto& target_container = target.containers[container_index];
          write_shared_string(target_container.name, source_container.name);
          target_container.inventory_type = source_container.inventory_type;
          target_container.loaded = source_container.loaded ? 1 : 0;
          target_container.size = source_container.size;
          target_container.item_start = static_cast<std::uint32_t>(item_cursor);
          target_container.item_count = static_cast<std::uint32_t>(source_container.items.size());
          for (const auto& source_item : source_container.items) {
            auto& target_item = target.items[item_cursor++];
            target_item.inventory_type = source_item.inventory_type;
            target_item.slot = source_item.slot;
            target_item.flags = source_item.flags;
            target_item.is_symbolic = source_item.is_symbolic ? 1 : 0;
            target_item.item_id = source_item.item_id;
            target_item.quantity = source_item.quantity;
            target_item.spiritbond_or_collectability = source_item.spiritbond_or_collectability;
            target_item.condition = source_item.condition;
            target_item.glamour_id = source_item.glamour_id;
            target_item.stains = source_item.stains;
            target_item.materia = source_item.materia;
            target_item.materia_grades = source_item.materia_grades;
            target_item.linked_inventory_type = source_item.linked_inventory_type;
            target_item.linked_slot = source_item.linked_slot;
          }
        }
        target.item_count = static_cast<std::uint32_t>(item_cursor);
        if (response.status == SharedResponseStatus::Success) {
          target.dresser_item_count =
              static_cast<std::uint32_t>(source.glamour_dresser.items.size());
          for (std::size_t index = 0; index < source.glamour_dresser.items.size(); ++index) {
            const auto& source_item = source.glamour_dresser.items[index];
            target.dresser_items[index] = {source_item.slot, source_item.set_unlock_bits,
                                           source_item.item_id};
          }
        }
      }
    }
  }
  std::atomic_ref(shared_->response_sequence).store(sequence, std::memory_order_release);
}

void GameRuntime::write_latest_snapshot(const GameSnapshot& snapshot) {
  auto& target = shared_->latest_snapshot;
  SecureZeroMemory(&target, sizeof(target));
  target.content_id = std::stoull(snapshot.content_id);
  write_shared_string(target.character_name, snapshot.character_name);
  target.current_world_id = snapshot.current_world_id;
  target.home_world_id = snapshot.home_world_id;
  target.login_flags = snapshot.login_flags;
  target.sequence = snapshot.sequence;
  std::atomic_ref(shared_->snapshot_sequence).fetch_add(1, std::memory_order_release);
}

CommandOutcome GameRuntime::return_to_title(void* framework) {
  auto* agent = get_agent_lobby(framework);
  if (!agent) return failure("lobby_unavailable", "The lobby agent is not available.");
  reinterpret_cast<ReturnToTitle>(addresses_.return_to_title)(agent);
  return acknowledgement();
}

CommandOutcome GameRuntime::switch_region(void* framework, RegionTarget& target) {
  if (!private_layout_verified_) {
    return failure("private_layout_unverified",
                   "The private Lobby layout has not been verified for this game version.");
  }
  if (!valid_hostname(target.lobby_host) || !valid_hostname(target.save_data_host) ||
      !valid_hostname(target.gm_host) || target.region_name.empty() ||
      target.game_session.empty() || target.game_session.size() > 4096) {
    return failure("invalid_region_target", "The region target contains invalid host data.");
  }
  auto* framework_bytes = static_cast<std::byte*>(framework);
  auto* proxy = read_pointer<std::byte>(framework_bytes, layout_.framework_network_module_proxy);
  if (!proxy) return failure("network_unavailable", "The network proxy is unavailable.");
  auto* network = read_pointer<std::byte>(proxy, layout_.network_module_proxy_network_module);
  auto* agent = static_cast<std::byte*>(get_agent_lobby(framework));
  if (!network || !agent)
    return failure("network_unavailable", "The lobby network is unavailable.");

  auto* config = framework_bytes + layout_.framework_dev_config;
  const auto count = read_value<std::uint32_t>(config, layout_.config_count);
  auto* entries = read_pointer<std::byte>(config, layout_.config_entries);
  if (!entries || count > kMaximumConfigEntries) {
    return failure("config_invalid", "The game configuration is invalid.");
  }
  std::array<std::byte*, 3> config_values{};
  for (std::uint32_t index = 0; index < count; ++index) {
    auto* entry = entries + index * layout_.config_entry_size;
    const auto* name = read_pointer<char>(entry, layout_.config_entry_name);
    auto* value = read_pointer<std::byte>(entry, layout_.config_entry_value);
    if (!name || !value) continue;
    const auto config_name = bounded_cstring(name, 64);
    if (config_name == "GMServerHost") config_values[0] = value;
    if (config_name == "SaveDataBankHost") config_values[1] = value;
    if (config_name == "LobbyHost01") config_values[2] = value;
  }
  auto* lobby_client = agent + layout_.agent_lobby_data + layout_.lobby_ui_client;
  auto** context = reinterpret_cast<void**>(lobby_client + layout_.lobby_context);
  auto* state = reinterpret_cast<std::uint8_t*>(lobby_client + layout_.lobby_state);
  if (std::ranges::any_of(config_values,
                          [](const auto* value) {
                            return value == nullptr || !is_writable(value, sizeof(void*));
                          }) ||
      !is_writable(network + layout_.network_active_lobby_host, sizeof(void*)) ||
      !is_writable(network + layout_.network_lobby_hosts, sizeof(void*)) ||
      !is_writable(network + layout_.network_save_data_bank_host, sizeof(void*)) ||
      !is_writable(context, sizeof(void*)) || !is_writable(state, sizeof(std::uint8_t)) ||
      !is_writable(agent + layout_.agent_game_session, sizeof(void*))) {
    return failure("lobby_context_invalid", "The lobby context is not writable.");
  }

  auto set_string = reinterpret_cast<Utf8SetString>(addresses_.utf8_set_string);
  set_string(network + layout_.network_active_lobby_host, target.lobby_host.c_str());
  set_string(network + layout_.network_lobby_hosts, target.lobby_host.c_str());
  set_string(network + layout_.network_save_data_bank_host, target.save_data_host.c_str());
  set_string(config_values[0], target.gm_host.c_str());
  set_string(config_values[1], target.save_data_host.c_str());
  set_string(config_values[2], target.lobby_host.c_str());
  set_string(agent + layout_.agent_game_session, target.game_session.c_str());
  reinterpret_cast<ReleaseLobbyContext>(addresses_.release_lobby_context)(network);
  *context = nullptr;
  *state = 0;
  return {true, {}, {}, std::nullopt, std::nullopt, std::nullopt, target.region_name};
}

CommandOutcome GameRuntime::trigger_login(void* framework) {
  auto* ui_module = reinterpret_cast<GetUiModule>(addresses_.get_ui_module)(framework);
  if (!ui_module) return failure("ui_unavailable", "The game UI module is unavailable.");
  auto get_rapture_module = vtable_function<void*(__fastcall*)(void*)>(ui_module, 7);
  auto* rapture_module = static_cast<std::byte*>(get_rapture_module(ui_module));
  if (!rapture_module) return failure("ui_unavailable", "The game UI module is unavailable.");
  auto* unit_manager = rapture_module + layout_.rapture_atk_unit_manager;
  auto* addon =
      reinterpret_cast<GetAddonByName>(addresses_.get_addon_by_name)(unit_manager, "_TitleMenu", 1);
  if (!addon) return failure("title_menu_unavailable", "The title menu is unavailable.");
  auto* button =
      reinterpret_cast<GetComponentButtonById>(addresses_.get_component_button_by_id)(addon, 4);
  if (!button) return failure("login_button_unavailable", "The login button is unavailable.");
  auto* node = read_pointer<std::byte>(static_cast<std::byte*>(button), layout_.component_res_node);
  if (!node) return failure("login_event_unavailable", "The login event is unavailable.");
  auto* event = read_pointer<void>(node, layout_.res_node_event);
  if (!event) return failure("login_event_unavailable", "The login event is unavailable.");
  auto receive_event = vtable_function<ReceiveEvent>(addon, layout_.receive_event_vtable_index);
  receive_event(addon, kButtonClickEvent, 1, event, nullptr);
  return acknowledgement();
}

void* GameRuntime::get_agent_lobby(void* framework) const {
  auto* ui_module = reinterpret_cast<GetUiModule>(addresses_.get_ui_module)(framework);
  if (!ui_module) return nullptr;
  auto get_agent_module = vtable_function<void*(__fastcall*)(void*)>(ui_module, 37);
  auto* agent_module = get_agent_module(ui_module);
  if (!agent_module) return nullptr;
  return reinterpret_cast<GetAgentByInternalId>(addresses_.get_agent_by_internal_id)(agent_module,
                                                                                     0);
}

}  // namespace bridge
