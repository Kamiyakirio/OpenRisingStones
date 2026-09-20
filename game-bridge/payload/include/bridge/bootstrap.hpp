// Fixed bootstrap ABI copied into the target process by the Rust host.
#pragma once

#include <cstddef>
#include <cstdint>

namespace bridge {

inline constexpr std::uint32_t kBootstrapAbiVersion = 1;
struct BootstrapArgs final {
  std::uint32_t struct_size;
  std::uint32_t abi_version;
  std::uint32_t flags;
  std::uint32_t owner_process_id;
  std::uintptr_t shared_memory_handle;
};

static_assert(sizeof(BootstrapArgs) == 24);

}  // namespace bridge
