// Framework-thread command queue and the complete game-memory access boundary.
#pragma once

#include "address_resolver.hpp"
#include "manifest.hpp"

#include <atomic>
#include <array>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <deque>
#include <future>
#include <memory>
#include <mutex>
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

struct PlayerInventorySnapshot final {
  std::vector<InventoryContainerSnapshot> containers;
  GlamourDresserSnapshot glamour_dresser;
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

enum class CommandKind {
  CaptureSnapshot,
  CaptureActiveCharacter,
  CaptureInventory,
  ReturnToTitle,
  SwitchRegion,
  TriggerLogin,
};

struct CommandOutcome final {
  bool success{};
  std::string code;
  std::string message;
  std::optional<GameSnapshot> snapshot;
  std::optional<ActiveCharacterSnapshot> active_character;
  std::optional<PlayerInventorySnapshot> inventory;
  std::string region_name;
};

class GameRuntime final {
 public:
  GameRuntime(VersionManifest manifest, ResolvedAddresses addresses);
  ~GameRuntime();

  GameRuntime(const GameRuntime&) = delete;
  GameRuntime& operator=(const GameRuntime&) = delete;

  void start();
  void stop();
  [[nodiscard]] CommandOutcome execute(CommandKind kind, std::optional<RegionTarget> target,
                                       std::chrono::milliseconds timeout);
  [[nodiscard]] std::optional<GameSnapshot> snapshot_after(std::uint64_t sequence) const;

 private:
  struct PendingCommand final {
    CommandKind kind{};
    std::optional<RegionTarget> target;
    std::promise<CommandOutcome> completion;
  };

  using FrameworkTick = bool(__fastcall*)(void* framework);

  static bool __fastcall tick_detour(void* framework);
  bool on_tick(void* framework) noexcept;
  void drain_commands(void* framework);
  [[nodiscard]] CommandOutcome run_command(void* framework, PendingCommand& command);
  [[nodiscard]] CommandOutcome capture_snapshot(void* framework);
  [[nodiscard]] CommandOutcome capture_active_character();
  [[nodiscard]] CommandOutcome capture_inventory(void* framework);
  [[nodiscard]] CommandOutcome return_to_title(void* framework);
  [[nodiscard]] CommandOutcome switch_region(void* framework, RegionTarget& target);
  [[nodiscard]] CommandOutcome trigger_login(void* framework);
  [[nodiscard]] void* get_agent_lobby(void* framework) const;
  void publish_snapshot(GameSnapshot snapshot);
  void fail_pending(const std::string& code, const std::string& message);

  static GameRuntime* active_;
  VersionManifest manifest_;
  ResolvedAddresses addresses_;
  void* hook_target_{};
  FrameworkTick original_tick_{};
  std::atomic<bool> stopping_{false};
  std::atomic<bool> stopped_{false};
  std::atomic<std::uint32_t> active_callbacks_{0};
  mutable std::mutex queue_mutex_;
  std::deque<std::unique_ptr<PendingCommand>> queue_;
  mutable std::mutex snapshot_mutex_;
  std::optional<GameSnapshot> latest_snapshot_;
  std::uint64_t next_snapshot_sequence_{1};
  std::uint32_t sampling_counter_{};
};

}  // namespace bridge
