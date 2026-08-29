// Implements the same four-byte-length plus UTF-8 JSON framing used by the Rust host.
#include "pipe_client.hpp"

#include <array>
#include <cstddef>
#include <stdexcept>
#include <vector>

namespace bridge {
namespace {

constexpr std::uint32_t kMaximumFrameSize = 1024 * 1024;
constexpr DWORD kPipePollIntervalMilliseconds = 5;

}  // namespace

PipeClient::~PipeClient() {
  close();
}

void PipeClient::connect(const std::wstring& pipe_name) {
  if (pipe_name.empty()) throw std::runtime_error("empty pipe name");
  for (std::uint32_t attempt = 0; attempt < 50; ++attempt) {
    const auto handle = CreateFileW(pipe_name.c_str(), GENERIC_READ | GENERIC_WRITE, 0, nullptr,
                                    OPEN_EXISTING, 0, nullptr);
    if (handle != INVALID_HANDLE_VALUE) {
      handle_.store(handle, std::memory_order_release);
      return;
    }
    if (GetLastError() != ERROR_PIPE_BUSY || !WaitNamedPipeW(pipe_name.c_str(), 200)) {
      Sleep(100);
    }
  }
  throw std::runtime_error("unable to connect to host pipe");
}

void PipeClient::close() {
  const auto handle = handle_.exchange(INVALID_HANDLE_VALUE, std::memory_order_acq_rel);
  if (handle != INVALID_HANDLE_VALUE) {
    CancelIoEx(handle, nullptr);
    CloseHandle(handle);
  }
}

void PipeClient::send(const nlohmann::json& message) {
  const auto frame = message.dump();
  if (frame.empty() || frame.size() > kMaximumFrameSize) {
    throw std::runtime_error("invalid outbound IPC frame size");
  }
  const auto length = static_cast<std::uint32_t>(frame.size());
  std::lock_guard lock(write_mutex_);
  const auto handle = handle_.load(std::memory_order_acquire);
  if (handle == INVALID_HANDLE_VALUE) throw std::runtime_error("pipe is closed");
  write_all(handle, &length, sizeof(length));
  write_all(handle, frame.data(), frame.size());
}

nlohmann::json PipeClient::receive() {
  const auto handle = handle_.load(std::memory_order_acquire);
  if (handle == INVALID_HANDLE_VALUE) throw std::runtime_error("pipe is closed");
  // Synchronous reads and writes on the same pipe handle can serialize across threads. Only issue
  // ReadFile when data is available so the publisher thread can send heartbeats independently.
  wait_for_data(handle);
  std::uint32_t length = 0;
  read_exact(handle, &length, sizeof(length));
  if (length == 0 || length > kMaximumFrameSize) {
    throw std::runtime_error("invalid inbound IPC frame size");
  }
  std::vector<std::uint8_t> frame(length);
  read_exact(handle, frame.data(), frame.size());
  return nlohmann::json::parse(frame);
}

bool PipeClient::connected() const noexcept {
  return handle_.load(std::memory_order_acquire) != INVALID_HANDLE_VALUE;
}

void PipeClient::wait_for_data(HANDLE handle) {
  while (true) {
    DWORD available = 0;
    if (!PeekNamedPipe(handle, nullptr, 0, nullptr, &available, nullptr)) {
      throw std::runtime_error("pipe peek failed");
    }
    if (available != 0) return;
    Sleep(kPipePollIntervalMilliseconds);
  }
}

void PipeClient::read_exact(HANDLE handle, void* target, std::size_t length) {
  auto* output = static_cast<std::byte*>(target);
  std::size_t offset = 0;
  while (offset < length) {
    DWORD read = 0;
    if (!ReadFile(handle, output + offset, static_cast<DWORD>(length - offset), &read, nullptr) ||
        read == 0) {
      throw std::runtime_error("pipe read failed");
    }
    offset += read;
  }
}

void PipeClient::write_all(HANDLE handle, const void* source, std::size_t length) {
  const auto* input = static_cast<const std::byte*>(source);
  std::size_t offset = 0;
  while (offset < length) {
    DWORD written = 0;
    if (!WriteFile(handle, input + offset, static_cast<DWORD>(length - offset), &written, nullptr) ||
        written == 0) {
      throw std::runtime_error("pipe write failed");
    }
    offset += written;
  }
}

}  // namespace bridge
