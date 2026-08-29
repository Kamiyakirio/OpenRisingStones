// Fixed bootstrap ABI copied into the target process by the Rust host.
#pragma once

#include <array>
#include <cstdint>

namespace bridge {

inline constexpr std::uint32_t kProtocolVersion = 2;
inline constexpr std::size_t kPipeNameCapacity = 260;
inline constexpr std::size_t kManifestPathCapacity = 520;
inline constexpr std::size_t kAuthTokenSize = 32;

struct BootstrapArgs final {
  std::uint32_t struct_size;
  std::uint32_t protocol_version;
  std::uint32_t flags;
  std::uint32_t reserved;
  std::array<wchar_t, kPipeNameCapacity> pipe_name;
  std::array<wchar_t, kManifestPathCapacity> manifest_path;
  std::array<std::uint8_t, kAuthTokenSize> auth_token;
};

static_assert(sizeof(wchar_t) == 2);

}  // namespace bridge
