// Blocking full-duplex Named Pipe client with serialized writes.
#pragma once

#include <Windows.h>

#include <atomic>
#include <cstdint>
#include <mutex>
#include <string>

#include <nlohmann/json.hpp>

namespace bridge {

class PipeClient final {
 public:
  PipeClient() = default;
  ~PipeClient();

  PipeClient(const PipeClient&) = delete;
  PipeClient& operator=(const PipeClient&) = delete;

  void connect(const std::wstring& pipe_name);
  void close();
  void send(const nlohmann::json& message);
  [[nodiscard]] nlohmann::json receive();
  [[nodiscard]] bool connected() const noexcept;

 private:
  static void read_exact(HANDLE handle, void* target, std::size_t length);
  static void write_all(HANDLE handle, const void* source, std::size_t length);

  std::atomic<HANDLE> handle_{INVALID_HANDLE_VALUE};
  std::mutex write_mutex_;
};

}  // namespace bridge
