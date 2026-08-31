// Maps the host-owned shared memory and starts the Framework-thread game runtime.
#include "runtime.hpp"

#include "game_api.hpp"

#include <Windows.h>

#include <algorithm>
#include <atomic>
#include <cstring>
#include <stdexcept>

namespace bridge {
namespace {

template <std::size_t N>
void write_string(std::array<char, N>& output, const std::string& value) {
  const auto length = std::min(value.size(), N - 1);
  std::copy_n(value.data(), length, output.data());
  output[length] = '\0';
}

}  // namespace

Runtime::Runtime(const BootstrapArgs& args) : args_(args) {}

Runtime::~Runtime() { stop(); }

void Runtime::start() {
  if (args_.struct_size != sizeof(BootstrapArgs) || args_.abi_version != kBootstrapAbiVersion ||
      args_.shared_memory_handle == 0) {
    throw std::runtime_error("invalid bootstrap ABI");
  }

  const auto mapping_handle = reinterpret_cast<HANDLE>(args_.shared_memory_handle);
  shared_ = static_cast<SharedBridge*>(
      MapViewOfFile(mapping_handle, FILE_MAP_ALL_ACCESS, 0, 0, sizeof(SharedBridge)));
  CloseHandle(mapping_handle);
  args_.shared_memory_handle = 0;
  if (!shared_) throw std::runtime_error("unable to map shared memory");
  if (shared_->magic != kSharedMagic || shared_->abi_version != kSharedAbiVersion ||
      shared_->struct_size != sizeof(SharedBridge)) {
    throw std::runtime_error("shared-memory ABI mismatch");
  }

  try {
    auto addresses = resolve_addresses(shared_->game_api);
    game_ = std::make_unique<GameRuntime>(shared_->game_api.layout,
                                          shared_->game_api.private_layout_verified != 0, addresses,
                                          shared_);
    game_->start();
    std::atomic_ref(shared_->payload_state)
        .store(static_cast<std::uint32_t>(SharedPayloadState::Ready), std::memory_order_release);
  } catch (const std::exception& error) {
    write_string(shared_->fatal_code, "initialization_failed");
    write_string(shared_->fatal_message, error.what());
    std::atomic_ref(shared_->payload_state)
        .store(static_cast<std::uint32_t>(SharedPayloadState::Faulted), std::memory_order_release);
    throw;
  }
}

void Runtime::stop() {
  if (stopped_) return;
  stopped_ = true;
  if (shared_) {
    auto state = std::atomic_ref(shared_->payload_state);
    if (state.load(std::memory_order_acquire) !=
        static_cast<std::uint32_t>(SharedPayloadState::Faulted)) {
      state.store(static_cast<std::uint32_t>(SharedPayloadState::ShuttingDown),
                  std::memory_order_release);
    }
  }
  if (game_) {
    game_->stop();
    game_.reset();
  }
  if (args_.shared_memory_handle != 0) {
    CloseHandle(reinterpret_cast<HANDLE>(args_.shared_memory_handle));
    args_.shared_memory_handle = 0;
  }
  if (shared_) {
    UnmapViewOfFile(shared_);
    shared_ = nullptr;
  }
}

}  // namespace bridge
