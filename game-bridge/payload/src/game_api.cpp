// Converts the Rust-validated POD API and checks memory page access.
#include "game_api.hpp"

#include <Windows.h>

#include <cstdint>
#include <stdexcept>

namespace bridge {
namespace {

template <typename T>
T pointer(std::uint64_t value) {
  if (value == 0) throw std::runtime_error("resolved game address is null");
  return reinterpret_cast<T>(static_cast<std::uintptr_t>(value));
}

bool has_access(const void* address, std::size_t length, bool require_write) {
  if (!address || length == 0) return false;
  MEMORY_BASIC_INFORMATION information{};
  if (VirtualQuery(address, &information, sizeof(information)) != sizeof(information) ||
      information.State != MEM_COMMIT || (information.Protect & (PAGE_GUARD | PAGE_NOACCESS))) {
    return false;
  }
  const auto begin = reinterpret_cast<std::uintptr_t>(address);
  const auto region_end =
      reinterpret_cast<std::uintptr_t>(information.BaseAddress) + information.RegionSize;
  if (begin > region_end || length > region_end - begin) return false;
  if (!require_write) return true;
  constexpr DWORD writable =
      PAGE_READWRITE | PAGE_WRITECOPY | PAGE_EXECUTE_READWRITE | PAGE_EXECUTE_WRITECOPY;
  return (information.Protect & writable) != 0;
}

}  // namespace

ResolvedAddresses resolve_addresses(const SharedGameApi& api) {
  return {
      pointer<std::byte**>(api.framework_instance_slot),
      pointer<std::byte**>(api.local_player_slot),
      pointer<std::byte*>(api.game_main_instance),
      pointer<std::byte*>(api.inventory_manager_instance),
      pointer<std::byte*>(api.get_inventory_container),
      pointer<std::byte*>(api.get_ui_module),
      pointer<std::byte*>(api.get_agent_by_internal_id),
      pointer<std::byte*>(api.utf8_set_string),
      pointer<std::byte*>(api.release_lobby_context),
      pointer<std::byte*>(api.return_to_title),
      pointer<std::byte*>(api.handle_logout),
      pointer<std::byte*>(api.get_addon_by_name),
      pointer<std::byte*>(api.get_component_button_by_id),
  };
}

bool is_readable(const void* address, std::size_t length) {
  return has_access(address, length, false);
}

bool is_writable(const void* address, std::size_t length) {
  return has_access(address, length, true);
}

}  // namespace bridge
