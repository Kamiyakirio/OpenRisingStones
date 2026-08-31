// Resolved game addresses and memory-page validation used by the native access layer.
#pragma once

#include "bridge/shared_bridge.hpp"

#include <cstddef>

namespace bridge {

using Layout = SharedGameLayout;

struct ResolvedAddresses final {
  std::byte** framework_instance_slot{};
  std::byte** local_player_slot{};
  std::byte* game_main_instance{};
  std::byte* inventory_manager_instance{};
  std::byte* get_inventory_container{};
  std::byte* get_ui_module{};
  std::byte* get_agent_by_internal_id{};
  std::byte* utf8_set_string{};
  std::byte* release_lobby_context{};
  std::byte* return_to_title{};
  std::byte* get_addon_by_name{};
  std::byte* get_component_button_by_id{};
};

[[nodiscard]] ResolvedAddresses resolve_addresses(const SharedGameApi& api);
[[nodiscard]] bool is_readable(const void* address, std::size_t length);
[[nodiscard]] bool is_writable(const void* address, std::size_t length);

}  // namespace bridge
