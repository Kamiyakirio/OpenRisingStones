// Strict version manifest model for all signatures and structure offsets.
#pragma once

#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <string>
#include <unordered_map>

namespace bridge {

enum class ResolveKind {
  Direct,
  Relative32,
  RipRelative,
};

struct FunctionSpec final {
  std::string pattern;
  ResolveKind resolve{ResolveKind::Direct};
  std::size_t offset{0};
  std::size_t next_instruction{0};
};

struct Layout final {
  std::size_t framework_tick_vtable_index{};
  std::size_t framework_network_module_proxy{};
  std::size_t framework_dev_config{};
  std::size_t network_module_proxy_network_module{};
  std::size_t network_lobby_hosts{};
  std::size_t network_save_data_bank_host{};
  std::size_t network_active_lobby_host{};
  std::size_t agent_lobby_data{};
  std::size_t agent_game_session{};
  std::size_t agent_selected_character_index{};
  std::size_t agent_selected_content_id{};
  std::size_t lobby_entries_vector{};
  std::size_t lobby_ui_client{};
  std::size_t lobby_context{};
  std::size_t lobby_state{};
  std::size_t entry_content_id{};
  std::size_t entry_login_flags{};
  std::size_t entry_current_world_id{};
  std::size_t entry_home_world_id{};
  std::size_t entry_name{};
  std::size_t entry_name_capacity{};
  std::size_t config_count{};
  std::size_t config_entries{};
  std::size_t config_entry_size{};
  std::size_t config_entry_name{};
  std::size_t config_entry_value{};
  std::size_t rapture_atk_unit_manager{};
  std::size_t component_res_node{};
  std::size_t res_node_event{};
  std::size_t receive_event_vtable_index{};
  std::size_t active_character_name{};
  std::size_t active_character_name_capacity{};
  std::size_t active_character_entity_id{};
  std::size_t active_character_position{};
  std::size_t active_character_data{};
  std::size_t active_character_health{};
  std::size_t active_character_max_health{};
  std::size_t active_character_mana{};
  std::size_t active_character_max_mana{};
  std::size_t active_character_class_job{};
  std::size_t active_character_level{};
  std::size_t active_character_content_id{};
  std::size_t active_character_current_world{};
  std::size_t active_character_home_world{};
  std::size_t game_main_connected_to_zone{};
  std::size_t game_main_territory_load_state{};
  std::size_t game_main_current_territory{};
};

struct VersionManifest final {
  std::uint32_t schema_version{};
  bool private_layout_verified{};
  std::string game_version;
  std::string module_name;
  std::string text_sha256;
  std::unordered_map<std::string, FunctionSpec> functions;
  Layout layout;

  static VersionManifest load(const std::filesystem::path& path);
  [[nodiscard]] const FunctionSpec& function(const std::string& name) const;
};

}  // namespace bridge
