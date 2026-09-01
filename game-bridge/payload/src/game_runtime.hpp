// Framework-thread command queue and the complete game-memory access boundary.
#pragma once

#include "bridge/shared_bridge.hpp"
#include "game_api.hpp"

#include <atomic>
#include <array>
#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace bridge {

struct GameSnapshot final {
  std::string content_id;
  std::string character_name;
  std::uint16_t current_world_id{};
  std::uint16_t home_world_id{};
  std::uint8_t login_flags{};
  std::uint64_t sequence{};
};

struct Position3 final {
  float x{};
  float y{};
  float z{};
};

struct ActiveCharacterSnapshot final {
  std::string content_id;
  std::string character_name;
  std::uint32_t entity_id{};
  std::uint16_t current_world_id{};
  std::uint16_t home_world_id{};
  std::uint8_t class_job_id{};
  std::uint8_t level{};
  std::uint32_t current_hp{};
  std::uint32_t max_hp{};
  std::uint32_t current_mp{};
  std::uint32_t max_mp{};
  Position3 position;
  std::uint32_t territory_id{};
  std::uint32_t territory_load_state{};
  bool connected_to_zone{};
};

enum class GameScreen : std::uint32_t {
  InWorld = 0,
  LoggingOut = 1,
  CharacterSelect = 2,
  Title = 3,
  Loading = 4,
  Unknown = 5,
};

struct GameStateSnapshot final {
  GameScreen screen{GameScreen::Unknown};
  bool logged_in{};
  bool logged_into_zone{};
  bool connected_to_zone{};
  bool region_switch_supported{};
  std::uint32_t territory_load_state{};
};

struct InventoryItemSnapshot final {
  std::uint32_t inventory_type{};
  std::int16_t slot{};
  std::uint32_t item_id{};
  std::int32_t quantity{};
  std::uint16_t spiritbond_or_collectability{};
  std::uint16_t condition{};
  std::uint8_t flags{};
  std::uint32_t glamour_id{};
  std::array<std::uint8_t, 2> stains{};
  std::array<std::uint16_t, 5> materia{};
  std::array<std::uint8_t, 5> materia_grades{};
  bool is_symbolic{};
  std::uint16_t linked_inventory_type{};
  std::uint16_t linked_slot{};
};

struct InventoryContainerSnapshot final {
  std::string name;
  std::uint32_t inventory_type{};
  bool loaded{};
  std::int32_t size{};
  std::vector<InventoryItemSnapshot> items;
};

struct GlamourDresserItemSnapshot final {
  std::uint16_t slot{};
  std::uint32_t item_id{};
  std::uint16_t set_unlock_bits{};
};

struct GlamourDresserSnapshot final {
  bool cached{};
  bool may_be_stale{};
  std::vector<GlamourDresserItemSnapshot> items;
};

struct ArmoireSnapshot final {
  bool cached{};
  bool may_be_stale{};
  std::vector<std::uint16_t> cabinet_item_ids;
};

struct PlayerInventorySnapshot final {
  std::vector<InventoryContainerSnapshot> containers;
  GlamourDresserSnapshot glamour_dresser;
  ArmoireSnapshot armoire;
};

struct RegionTarget final {
  RegionTarget() = default;
  RegionTarget(const RegionTarget&) = delete;
  RegionTarget& operator=(const RegionTarget&) = delete;
  RegionTarget(RegionTarget&&) noexcept = default;
  RegionTarget& operator=(RegionTarget&&) noexcept = default;

  std::string region_name;
  std::string lobby_host;
  std::string save_data_host;
  std::string gm_host;
  std::string game_session;

  ~RegionTarget();
};

struct CommandOutcome final {
  bool success{};
  std::string code;
  std::string message;
  std::optional<GameSnapshot> snapshot;
  std::optional<ActiveCharacterSnapshot> active_character;
  std::optional<PlayerInventorySnapshot> inventory;
  std::optional<GameStateSnapshot> game_state;
  std::string region_name;
};

class GameRuntime final {
 public:
  GameRuntime(Layout layout, bool private_layout_verified, ResolvedAddresses addresses,
              SharedBridge* shared);
  ~GameRuntime();

  GameRuntime(const GameRuntime&) = delete;
  GameRuntime& operator=(const GameRuntime&) = delete;

  void start();
  void stop();

 private:
  using FrameworkTick = bool(__fastcall*)(void* framework);

  static bool __fastcall tick_detour(void* framework);
  bool on_tick(void* framework) noexcept;
  void process_shared_command(void* framework);
  void write_response(std::uint64_t sequence, SharedCommandKind kind,
                      const CommandOutcome& outcome);
  void write_latest_snapshot(const GameSnapshot& snapshot);
  [[nodiscard]] CommandOutcome capture_snapshot(void* framework);
  [[nodiscard]] CommandOutcome capture_active_character();
  [[nodiscard]] CommandOutcome capture_inventory(void* framework);
  [[nodiscard]] CommandOutcome capture_game_state(void* framework);
  [[nodiscard]] CommandOutcome logout_to_title(void* framework);
  [[nodiscard]] CommandOutcome return_to_title(void* framework);
  [[nodiscard]] CommandOutcome switch_region(void* framework, RegionTarget& target);
  [[nodiscard]] CommandOutcome trigger_login(void* framework);
  [[nodiscard]] void* get_agent_lobby(void* framework) const;
  [[nodiscard]] void* get_title_menu(void* framework) const;

  static GameRuntime* active_;
  Layout layout_;
  bool private_layout_verified_{};
  ResolvedAddresses addresses_;
  SharedBridge* shared_{};
  void* hook_target_{};
  FrameworkTick original_tick_{};
  std::atomic<bool> stopping_{false};
  std::atomic<bool> stopped_{false};
  std::atomic<std::uint32_t> active_callbacks_{0};
  std::uint64_t last_request_sequence_{};
  std::uint64_t next_snapshot_sequence_{1};
  std::uint32_t sampling_counter_{};
};

}  // namespace bridge
