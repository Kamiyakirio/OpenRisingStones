// Payload lifecycle, handshake, command dispatch, heartbeat, and snapshot publishing.
#pragma once

#include "bridge/bootstrap.hpp"
#include "game_runtime.hpp"
#include "pipe_client.hpp"

#include <atomic>
#include <memory>
#include <string>
#include <thread>

namespace bridge {

class Runtime final {
 public:
  explicit Runtime(const BootstrapArgs& args);
  ~Runtime();

  Runtime(const Runtime&) = delete;
  Runtime& operator=(const Runtime&) = delete;

  void start();
  void stop();

 private:
  void ipc_loop();
  void publisher_loop();
  void handle_command(nlohmann::json& message);
  void send_outcome(std::uint64_t request_id, const CommandOutcome& outcome,
                    const std::string& result_type);
  void send_fault(const std::string& code, const std::string& message, bool fatal);
  [[nodiscard]] static nlohmann::json snapshot_json(const GameSnapshot& snapshot);
  [[nodiscard]] static nlohmann::json active_character_json(
      const ActiveCharacterSnapshot& character);
  [[nodiscard]] static nlohmann::json inventory_json(
      const PlayerInventorySnapshot& inventory);
  [[nodiscard]] static std::string encode_token(const std::array<std::uint8_t, 32>& token);

  BootstrapArgs args_{};
  PipeClient pipe_;
  std::unique_ptr<GameRuntime> game_;
  std::atomic<bool> stopping_{false};
  std::atomic<bool> stopped_{false};
  std::thread ipc_thread_;
  std::thread publisher_thread_;
};

}  // namespace bridge
