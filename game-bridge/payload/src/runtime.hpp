// Minimal payload lifecycle around shared memory and Framework-thread game access.
#pragma once

#include "bridge/bootstrap.hpp"
#include "bridge/shared_bridge.hpp"
#include "game_runtime.hpp"

#include <memory>

namespace bridge {

class Runtime final {
 public:
  explicit Runtime(const BootstrapArgs& args);
  ~Runtime();

  Runtime(const Runtime&) = delete;
  Runtime& operator=(const Runtime&) = delete;

  void start();
  void stop();

  /// Returns true after the host connection has begun shutting down.
  [[nodiscard]] bool is_restartable() const noexcept;

 private:
  BootstrapArgs args_{};
  SharedBridge* shared_{};
  std::unique_ptr<GameRuntime> game_;
  bool stopped_{};
};

}  // namespace bridge
