// PE section validation, SHA-256 checking, and unique wildcard signature resolution.
#pragma once

#include "manifest.hpp"

#include <cstddef>
#include <cstdint>
#include <string>
#include <unordered_map>

namespace bridge {

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

class AddressResolver final {
 public:
  AddressResolver(const VersionManifest& manifest, void* main_module);

  [[nodiscard]] ResolvedAddresses resolve() const;

 private:
  [[nodiscard]] std::byte* resolve_one(const FunctionSpec& spec) const;
  [[nodiscard]] std::byte* scan_unique(const std::string& pattern) const;
  void validate_module() const;

  const VersionManifest& manifest_;
  std::byte* module_base_{};
  std::size_t module_size_{};
  std::byte* text_base_{};
  std::size_t text_size_{};
};

[[nodiscard]] bool is_readable(const void* address, std::size_t length);
[[nodiscard]] bool is_writable(const void* address, std::size_t length);

}  // namespace bridge
