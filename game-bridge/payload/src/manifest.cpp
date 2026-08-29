// JSON manifest parser with required-field checks and no runtime fallbacks.
#include "manifest.hpp"

#include <fstream>
#include <stdexcept>

#include <nlohmann/json.hpp>

namespace bridge {
namespace {

std::size_t parse_offset(const nlohmann::json& value, const char* field) {
  if (value.is_number_unsigned()) {
    return value.get<std::size_t>();
  }
  if (!value.is_string()) {
    throw std::runtime_error(std::string("invalid offset field: ") + field);
  }
  const auto text = value.get<std::string>();
  std::size_t consumed = 0;
  const auto offset = std::stoull(text, &consumed, 0);
  if (consumed != text.size()) {
    throw std::runtime_error(std::string("invalid offset value: ") + field);
  }
  return static_cast<std::size_t>(offset);
}

ResolveKind parse_resolve_kind(const std::string& value) {
  if (value == "direct") return ResolveKind::Direct;
  if (value == "relative32") return ResolveKind::Relative32;
  if (value == "rip_relative") return ResolveKind::RipRelative;
  throw std::runtime_error("unsupported signature resolve kind");
}

void require_non_empty(const std::string& value, const char* field) {
  if (value.empty()) {
    throw std::runtime_error(std::string("empty manifest field: ") + field);
  }
}

}  // namespace

VersionManifest VersionManifest::load(const std::filesystem::path& path) {
  std::ifstream stream(path, std::ios::binary);
  if (!stream) {
    throw std::runtime_error("unable to open version manifest");
  }
  const auto document = nlohmann::json::parse(stream);

  VersionManifest manifest;
  manifest.schema_version = document.at("schemaVersion").get<std::uint32_t>();
  manifest.private_layout_verified = document.value("privateLayoutVerified", false);
  manifest.game_version = document.at("gameVersion").get<std::string>();
  manifest.module_name = document.at("module").at("name").get<std::string>();
  manifest.text_sha256 = document.at("module").at("textSha256").get<std::string>();
  if (manifest.schema_version != 2) {
    throw std::runtime_error("unsupported version manifest schema");
  }
  require_non_empty(manifest.game_version, "gameVersion");
  require_non_empty(manifest.module_name, "module.name");
  if (manifest.text_sha256.size() != 64) {
    throw std::runtime_error("module.textSha256 must contain 64 hexadecimal characters");
  }

  for (const auto& [name, value] : document.at("functions").items()) {
    FunctionSpec spec;
    spec.pattern = value.at("pattern").get<std::string>();
    spec.resolve = parse_resolve_kind(value.at("resolve").get<std::string>());
    spec.offset = value.value("offset", 0U);
    spec.next_instruction = value.value("nextInstruction", 0U);
    require_non_empty(spec.pattern, name.c_str());
    manifest.functions.emplace(name, std::move(spec));
  }

  const auto& layout = document.at("layout");
#define READ_LAYOUT(name, field) manifest.layout.name = parse_offset(layout.at(field), field)
  READ_LAYOUT(framework_tick_vtable_index, "frameworkTickVtableIndex");
  READ_LAYOUT(framework_network_module_proxy, "frameworkNetworkModuleProxy");
  READ_LAYOUT(framework_dev_config, "frameworkDevConfig");
  READ_LAYOUT(network_module_proxy_network_module, "networkModuleProxyNetworkModule");
  READ_LAYOUT(network_lobby_hosts, "networkLobbyHosts");
  READ_LAYOUT(network_save_data_bank_host, "networkSaveDataBankHost");
  READ_LAYOUT(network_active_lobby_host, "networkActiveLobbyHost");
  READ_LAYOUT(agent_lobby_data, "agentLobbyData");
  READ_LAYOUT(agent_game_session, "agentGameSession");
  READ_LAYOUT(agent_selected_character_index, "agentSelectedCharacterIndex");
  READ_LAYOUT(agent_selected_content_id, "agentSelectedContentId");
  READ_LAYOUT(lobby_entries_vector, "lobbyEntriesVector");
  READ_LAYOUT(lobby_ui_client, "lobbyUiClient");
  READ_LAYOUT(lobby_context, "lobbyContext");
  READ_LAYOUT(lobby_state, "lobbyState");
  READ_LAYOUT(entry_content_id, "entryContentId");
  READ_LAYOUT(entry_login_flags, "entryLoginFlags");
  READ_LAYOUT(entry_current_world_id, "entryCurrentWorldId");
  READ_LAYOUT(entry_home_world_id, "entryHomeWorldId");
  READ_LAYOUT(entry_name, "entryName");
  READ_LAYOUT(entry_name_capacity, "entryNameCapacity");
  READ_LAYOUT(config_count, "configCount");
  READ_LAYOUT(config_entries, "configEntries");
  READ_LAYOUT(config_entry_size, "configEntrySize");
  READ_LAYOUT(config_entry_name, "configEntryName");
  READ_LAYOUT(config_entry_value, "configEntryValue");
  READ_LAYOUT(rapture_atk_unit_manager, "raptureAtkUnitManager");
  READ_LAYOUT(component_res_node, "componentResNode");
  READ_LAYOUT(res_node_event, "resNodeEvent");
  READ_LAYOUT(receive_event_vtable_index, "receiveEventVtableIndex");
#undef READ_LAYOUT

  constexpr const char* required_functions[] = {
      "frameworkInstance", "getUiModule", "getAgentByInternalId", "utf8SetString",
      "releaseLobbyContext", "returnToTitle", "getAddonByName", "getComponentButtonById"};
  for (const auto* name : required_functions) {
    if (!manifest.functions.contains(name)) {
      throw std::runtime_error(std::string("missing required function: ") + name);
    }
  }
  return manifest;
}

const FunctionSpec& VersionManifest::function(const std::string& name) const {
  const auto iterator = functions.find(name);
  if (iterator == functions.end()) {
    throw std::runtime_error("unresolved manifest function: " + name);
  }
  return iterator->second;
}

}  // namespace bridge
