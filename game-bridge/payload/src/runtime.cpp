// Keeps networking and JSON work off the Framework thread.
#include "runtime.hpp"

#include "address_resolver.hpp"
#include "manifest.hpp"

#include <Windows.h>

#include <chrono>
#include <algorithm>
#include <iomanip>
#include <sstream>
#include <stdexcept>

namespace bridge {
namespace {

constexpr auto kCommandTimeout = std::chrono::seconds(10);
constexpr auto kPublishInterval = std::chrono::milliseconds(500);
constexpr const char* kPayloadVersion = "0.1.0";

std::wstring fixed_wstring(const wchar_t* value, std::size_t capacity) {
  const auto* end = std::find(value, value + capacity, L'\0');
  if (end == value + capacity) throw std::runtime_error("unterminated bootstrap string");
  return std::wstring(value, end);
}

RegionTarget parse_region_target(nlohmann::json& value) {
  RegionTarget target;
  target.region_name = value.at("regionName").get<std::string>();
  target.lobby_host = value.at("lobbyHost").get<std::string>();
  target.save_data_host = value.at("saveDataHost").get<std::string>();
  target.gm_host = value.at("gmHost").get<std::string>();
  auto& game_session = value.at("gameSession").get_ref<std::string&>();
  target.game_session = game_session;
  SecureZeroMemory(game_session.data(), game_session.size());
  game_session.clear();
  return target;
}

}  // namespace

Runtime::Runtime(const BootstrapArgs& args) : args_(args) {}

Runtime::~Runtime() {
  stop();
  SecureZeroMemory(args_.auth_token.data(), args_.auth_token.size());
}

void Runtime::start() {
  if (args_.struct_size != sizeof(BootstrapArgs) || args_.protocol_version != kProtocolVersion) {
    throw std::runtime_error("invalid bootstrap ABI");
  }
  const auto manifest_path = fixed_wstring(args_.manifest_path.data(), args_.manifest_path.size());
  const auto pipe_name = fixed_wstring(args_.pipe_name.data(), args_.pipe_name.size());
  auto manifest = VersionManifest::load(manifest_path);
  AddressResolver resolver(manifest, GetModuleHandleW(nullptr));
  auto addresses = resolver.resolve();
  game_ = std::make_unique<GameRuntime>(std::move(manifest), addresses);
  game_->start();

  pipe_.connect(pipe_name);
  auto encoded_token = encode_token(args_.auth_token);
  pipe_.send({
      {"type", "hello"},
      {"protocolVersion", kProtocolVersion},
      {"payloadVersion", kPayloadVersion},
      {"authToken", encoded_token},
      {"capabilities", {"capture_snapshot", "return_to_title", "switch_region", "trigger_login"}},
  });
  SecureZeroMemory(encoded_token.data(), encoded_token.size());
  SecureZeroMemory(args_.auth_token.data(), args_.auth_token.size());
  const auto acknowledgement = pipe_.receive();
  if (acknowledgement.value("type", "") != "hello_ack" ||
      acknowledgement.value("protocolVersion", 0U) != kProtocolVersion) {
    throw std::runtime_error("host rejected protocol handshake");
  }

  ipc_thread_ = std::thread(&Runtime::ipc_loop, this);
  publisher_thread_ = std::thread(&Runtime::publisher_loop, this);
}

void Runtime::stop() {
  if (stopped_.exchange(true, std::memory_order_acq_rel)) return;
  stopping_.store(true, std::memory_order_release);
  pipe_.close();
  if (ipc_thread_.joinable() && ipc_thread_.get_id() != std::this_thread::get_id()) {
    ipc_thread_.join();
  }
  if (publisher_thread_.joinable() && publisher_thread_.get_id() != std::this_thread::get_id()) {
    publisher_thread_.join();
  }
  if (game_) {
    game_->stop();
    game_.reset();
  }
}

void Runtime::ipc_loop() {
  try {
    while (!stopping_.load(std::memory_order_acquire)) {
      auto message = pipe_.receive();
      if (message.value("type", "") != "command") {
        send_fault("invalid_message", "Only command messages are accepted after handshake.", false);
        continue;
      }
      handle_command(message);
    }
  } catch (const std::exception& error) {
    if (!stopping_.load(std::memory_order_acquire)) {
      try {
        send_fault("ipc_failed", error.what(), true);
      } catch (...) {
      }
      stopping_.store(true, std::memory_order_release);
      if (game_) game_->stop();
    }
  }
}

void Runtime::publisher_loop() {
  std::uint64_t heartbeat = 0;
  std::uint64_t published_snapshot = 0;
  while (!stopping_.load(std::memory_order_acquire)) {
    try {
      pipe_.send({{"type", "heartbeat"}, {"sequence", ++heartbeat}});
      if (const auto snapshot = game_->snapshot_after(published_snapshot)) {
        published_snapshot = snapshot->sequence;
        pipe_.send({{"type", "snapshot"}, {"snapshot", snapshot_json(*snapshot)}});
      }
    } catch (...) {
      stopping_.store(true, std::memory_order_release);
      if (game_) game_->stop();
      break;
    }
    std::this_thread::sleep_for(kPublishInterval);
  }
}

void Runtime::handle_command(nlohmann::json& message) {
  const auto request_id = message.at("requestId").get<std::uint64_t>();
  auto& command = message.at("command");
  const auto type = command.at("type").get<std::string>();
  if (type == "shutdown") {
    pipe_.send({
        {"type", "response"},
        {"requestId", request_id},
        {"result", {{"type", "shutdown_ready"}}},
        {"error", nullptr},
    });
    stopping_.store(true, std::memory_order_release);
    return;
  }

  CommandOutcome outcome;
  std::string result_type = "ack";
  if (type == "capture_snapshot") {
    outcome = game_->execute(CommandKind::CaptureSnapshot, std::nullopt, kCommandTimeout);
    result_type = "snapshot";
  } else if (type == "return_to_title") {
    outcome = game_->execute(CommandKind::ReturnToTitle, std::nullopt, kCommandTimeout);
  } else if (type == "switch_region") {
    outcome = game_->execute(CommandKind::SwitchRegion,
                             parse_region_target(command.at("target")), kCommandTimeout);
    result_type = "region_switched";
  } else if (type == "trigger_login") {
    outcome = game_->execute(CommandKind::TriggerLogin, std::nullopt, kCommandTimeout);
  } else {
    outcome = {false, "unsupported_command", "The command is not supported.", std::nullopt, {}};
  }
  send_outcome(request_id, outcome, result_type);
}

void Runtime::send_outcome(std::uint64_t request_id, const CommandOutcome& outcome,
                           const std::string& result_type) {
  if (!outcome.success) {
    pipe_.send({
        {"type", "response"},
        {"requestId", request_id},
        {"result", nullptr},
        {"error", {{"code", outcome.code}, {"message", outcome.message}}},
    });
    return;
  }
  nlohmann::json result = {{"type", result_type}};
  if (outcome.snapshot) result["snapshot"] = snapshot_json(*outcome.snapshot);
  if (!outcome.region_name.empty()) result["regionName"] = outcome.region_name;
  pipe_.send({
      {"type", "response"},
      {"requestId", request_id},
      {"result", std::move(result)},
      {"error", nullptr},
  });
}

void Runtime::send_fault(const std::string& code, const std::string& message, bool fatal) {
  pipe_.send({{"type", "fault"}, {"code", code}, {"message", message}, {"fatal", fatal}});
}

nlohmann::json Runtime::snapshot_json(const GameSnapshot& snapshot) {
  return {
      {"contentId", snapshot.content_id},
      {"characterName", snapshot.character_name},
      {"currentWorldId", snapshot.current_world_id},
      {"homeWorldId", snapshot.home_world_id},
      {"loginFlags", snapshot.login_flags},
      {"currentRegion", nullptr},
      {"homeRegion", nullptr},
      {"sequence", snapshot.sequence},
  };
}

std::string Runtime::encode_token(const std::array<std::uint8_t, 32>& token) {
  std::ostringstream encoded;
  encoded << std::hex << std::setfill('0');
  for (const auto value : token) encoded << std::setw(2) << static_cast<unsigned>(value);
  return encoded.str();
}

}  // namespace bridge
