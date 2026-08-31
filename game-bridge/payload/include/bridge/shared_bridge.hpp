// Fixed shared-memory ABI between the Rust host and the native game-access layer.
#pragma once

#include <array>
#include <cstddef>
#include <cstdint>

namespace bridge {

inline constexpr std::uint32_t kSharedMagic = 0x4742524F;
inline constexpr std::uint32_t kSharedAbiVersion = 1;
inline constexpr std::size_t kMaximumSharedContainers = 18;
inline constexpr std::size_t kMaximumSharedItems = 1024;
inline constexpr std::size_t kMaximumSharedDresserItems = 800;

enum class SharedPayloadState : std::uint32_t {
  Initializing = 0,
  Ready = 1,
  Faulted = 2,
  ShuttingDown = 3,
};

enum class SharedCommandKind : std::uint32_t {
  None = 0,
  CaptureSnapshot = 1,
  CaptureActiveCharacter = 2,
  CaptureInventory = 3,
  ReturnToTitle = 4,
  SwitchRegion = 5,
  TriggerLogin = 6,
  Shutdown = 7,
};

enum class SharedResponseStatus : std::uint32_t {
  Idle = 0,
  Success = 1,
  Error = 2,
};

struct SharedGameLayout final {
  std::uint32_t framework_tick_vtable_index{};
  std::uint32_t framework_network_module_proxy{};
  std::uint32_t framework_dev_config{};
  std::uint32_t network_module_proxy_network_module{};
  std::uint32_t network_lobby_hosts{};
  std::uint32_t network_save_data_bank_host{};
  std::uint32_t network_active_lobby_host{};
  std::uint32_t agent_lobby_data{};
  std::uint32_t agent_game_session{};
  std::uint32_t agent_selected_character_index{};
  std::uint32_t agent_selected_content_id{};
  std::uint32_t lobby_entries_vector{};
  std::uint32_t lobby_ui_client{};
  std::uint32_t lobby_context{};
  std::uint32_t lobby_state{};
  std::uint32_t entry_content_id{};
  std::uint32_t entry_login_flags{};
  std::uint32_t entry_current_world_id{};
  std::uint32_t entry_home_world_id{};
  std::uint32_t entry_name{};
  std::uint32_t entry_name_capacity{};
  std::uint32_t config_count{};
  std::uint32_t config_entries{};
  std::uint32_t config_entry_size{};
  std::uint32_t config_entry_name{};
  std::uint32_t config_entry_value{};
  std::uint32_t rapture_atk_unit_manager{};
  std::uint32_t component_res_node{};
  std::uint32_t res_node_event{};
  std::uint32_t receive_event_vtable_index{};
  std::uint32_t active_character_name{};
  std::uint32_t active_character_name_capacity{};
  std::uint32_t active_character_entity_id{};
  std::uint32_t active_character_position{};
  std::uint32_t active_character_data{};
  std::uint32_t active_character_health{};
  std::uint32_t active_character_max_health{};
  std::uint32_t active_character_mana{};
  std::uint32_t active_character_max_mana{};
  std::uint32_t active_character_class_job{};
  std::uint32_t active_character_level{};
  std::uint32_t active_character_content_id{};
  std::uint32_t active_character_current_world{};
  std::uint32_t active_character_home_world{};
  std::uint32_t game_main_connected_to_zone{};
  std::uint32_t game_main_territory_load_state{};
  std::uint32_t game_main_current_territory{};
  std::uint32_t get_item_finder_module_vtable_index{};
  std::uint32_t inventory_container_items{};
  std::uint32_t inventory_container_type{};
  std::uint32_t inventory_container_size{};
  std::uint32_t inventory_container_loaded{};
  std::uint32_t inventory_item_size{};
  std::uint32_t inventory_item_container{};
  std::uint32_t inventory_item_slot{};
  std::uint32_t inventory_item_symbolic{};
  std::uint32_t inventory_item_id{};
  std::uint32_t inventory_item_linked_slot{};
  std::uint32_t inventory_item_linked_type{};
  std::uint32_t inventory_item_quantity{};
  std::uint32_t inventory_item_spiritbond{};
  std::uint32_t inventory_item_condition{};
  std::uint32_t inventory_item_flags{};
  std::uint32_t inventory_item_materia{};
  std::uint32_t inventory_item_materia_grades{};
  std::uint32_t inventory_item_stains{};
  std::uint32_t inventory_item_glamour_id{};
  std::uint32_t item_finder_glamour_cached{};
  std::uint32_t item_finder_glamour_item_ids{};
  std::uint32_t item_finder_glamour_unlock_bits{};
  std::uint32_t item_finder_glamour_capacity{};
};

struct SharedGameApi final {
  std::uint32_t private_layout_verified{};
  std::uint32_t reserved{};
  std::uint64_t framework_instance_slot{};
  std::uint64_t local_player_slot{};
  std::uint64_t game_main_instance{};
  std::uint64_t inventory_manager_instance{};
  std::uint64_t get_inventory_container{};
  std::uint64_t get_ui_module{};
  std::uint64_t get_agent_by_internal_id{};
  std::uint64_t utf8_set_string{};
  std::uint64_t release_lobby_context{};
  std::uint64_t return_to_title{};
  std::uint64_t get_addon_by_name{};
  std::uint64_t get_component_button_by_id{};
  SharedGameLayout layout;
};

struct SharedSwitchRegion final {
  std::uint32_t region_name_length{};
  std::uint32_t lobby_host_length{};
  std::uint32_t save_data_host_length{};
  std::uint32_t gm_host_length{};
  std::uint32_t game_session_length{};
  std::array<char, 64> region_name{};
  std::array<char, 256> lobby_host{};
  std::array<char, 256> save_data_host{};
  std::array<char, 256> gm_host{};
  std::array<char, 4096> game_session{};
};

struct SharedCommand final {
  std::uint64_t request_id{};
  SharedCommandKind kind{SharedCommandKind::None};
  std::uint32_t reserved{};
  SharedSwitchRegion switch_region;
};

struct SharedGameSnapshot final {
  std::uint64_t content_id{};
  std::array<char, 64> character_name{};
  std::uint16_t current_world_id{};
  std::uint16_t home_world_id{};
  std::uint8_t login_flags{};
  std::array<std::uint8_t, 3> reserved{};
  std::uint64_t sequence{};
};

struct SharedPosition3 final {
  float x{};
  float y{};
  float z{};
};

struct SharedActiveCharacter final {
  std::uint64_t content_id{};
  std::array<char, 64> character_name{};
  std::uint32_t entity_id{};
  std::uint16_t current_world_id{};
  std::uint16_t home_world_id{};
  std::uint8_t class_job_id{};
  std::uint8_t level{};
  std::array<std::uint8_t, 2> reserved{};
  std::uint32_t current_hp{};
  std::uint32_t max_hp{};
  std::uint32_t current_mp{};
  std::uint32_t max_mp{};
  SharedPosition3 position;
  std::uint32_t territory_id{};
  std::uint32_t territory_load_state{};
  std::uint8_t connected_to_zone{};
  std::array<std::uint8_t, 3> trailing_reserved{};
};

struct SharedInventoryItem final {
  std::uint32_t inventory_type{};
  std::int16_t slot{};
  std::uint8_t flags{};
  std::uint8_t is_symbolic{};
  std::uint32_t item_id{};
  std::int32_t quantity{};
  std::uint16_t spiritbond_or_collectability{};
  std::uint16_t condition{};
  std::uint32_t glamour_id{};
  std::array<std::uint8_t, 2> stains{};
  std::array<std::uint16_t, 5> materia{};
  std::array<std::uint8_t, 5> materia_grades{};
  std::uint8_t reserved{};
  std::uint16_t linked_inventory_type{};
  std::uint16_t linked_slot{};
};

struct SharedInventoryContainer final {
  std::array<char, 32> name{};
  std::uint32_t inventory_type{};
  std::uint8_t loaded{};
  std::array<std::uint8_t, 3> reserved{};
  std::int32_t size{};
  std::uint32_t item_start{};
  std::uint32_t item_count{};
};

struct SharedDresserItem final {
  std::uint16_t slot{};
  std::uint16_t set_unlock_bits{};
  std::uint32_t item_id{};
};

struct SharedInventorySnapshot final {
  std::uint32_t container_count{};
  std::uint32_t item_count{};
  std::uint32_t dresser_item_count{};
  std::uint8_t dresser_cached{};
  std::uint8_t dresser_may_be_stale{};
  std::array<std::uint8_t, 2> reserved{};
  std::array<SharedInventoryContainer, kMaximumSharedContainers> containers{};
  std::array<SharedInventoryItem, kMaximumSharedItems> items{};
  std::array<SharedDresserItem, kMaximumSharedDresserItems> dresser_items{};
};

struct SharedResponse final {
  std::uint64_t request_id{};
  SharedResponseStatus status{SharedResponseStatus::Idle};
  SharedCommandKind kind{SharedCommandKind::None};
  std::array<char, 64> error_code{};
  std::array<char, 256> error_message{};
  SharedGameSnapshot snapshot;
  SharedActiveCharacter active_character;
  SharedInventorySnapshot inventory;
};

struct SharedBridge final {
  std::uint32_t magic{};
  std::uint32_t abi_version{};
  std::uint32_t struct_size{};
  std::uint32_t payload_state{};
  alignas(8) std::uint64_t heartbeat{};
  alignas(8) std::uint64_t request_sequence{};
  alignas(8) std::uint64_t response_sequence{};
  alignas(8) std::uint64_t snapshot_sequence{};
  std::array<char, 64> fatal_code{};
  std::array<char, 256> fatal_message{};
  SharedGameApi game_api;
  SharedCommand command;
  SharedResponse response;
  SharedGameSnapshot latest_snapshot;
};

static_assert(sizeof(SharedSwitchRegion) == 4948);
static_assert(sizeof(SharedGameLayout) == 284);
static_assert(sizeof(SharedGameApi) == 392);
static_assert(sizeof(SharedCommand) == 4968);
static_assert(sizeof(SharedGameSnapshot) == 88);
static_assert(sizeof(SharedActiveCharacter) == 128);
static_assert(sizeof(SharedInventoryItem) == 48);
static_assert(sizeof(SharedInventoryContainer) == 52);
static_assert(sizeof(SharedInventorySnapshot) == 56504);
static_assert(sizeof(SharedResponse) == 57056);
static_assert(sizeof(SharedBridge) == 62872);

}  // namespace bridge
