// Resolves only addresses declared by an exact game-version manifest.
#include "address_resolver.hpp"

#include <Windows.h>
#include <bcrypt.h>
#include <winnt.h>

#include <algorithm>
#include <array>
#include <cctype>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <ranges>
#include <sstream>
#include <stdexcept>
#include <vector>

namespace bridge {
namespace {

struct PatternByte final {
  std::uint8_t value{};
  bool wildcard{};
};

std::vector<PatternByte> parse_pattern(const std::string& text) {
  std::istringstream stream(text);
  std::string token;
  std::vector<PatternByte> pattern;
  while (stream >> token) {
    if (token == "??" || token == "?") {
      pattern.push_back({0, true});
      continue;
    }
    if (token.size() != 2 || !std::isxdigit(static_cast<unsigned char>(token[0])) ||
        !std::isxdigit(static_cast<unsigned char>(token[1]))) {
      throw std::runtime_error("invalid signature token");
    }
    pattern.push_back({static_cast<std::uint8_t>(std::stoul(token, nullptr, 16)), false});
  }
  if (pattern.empty()) {
    throw std::runtime_error("empty signature pattern");
  }
  return pattern;
}

std::string sha256(const std::byte* data, std::size_t size) {
  BCRYPT_ALG_HANDLE algorithm = nullptr;
  BCRYPT_HASH_HANDLE hash = nullptr;
  DWORD object_size = 0;
  DWORD result_size = 0;
  std::vector<std::uint8_t> object;
  std::array<std::uint8_t, 32> digest{};

  if (BCryptOpenAlgorithmProvider(&algorithm, BCRYPT_SHA256_ALGORITHM, nullptr, 0) < 0 ||
      BCryptGetProperty(algorithm, BCRYPT_OBJECT_LENGTH,
                        reinterpret_cast<PUCHAR>(&object_size), sizeof(object_size), &result_size,
                        0) < 0) {
    if (algorithm) BCryptCloseAlgorithmProvider(algorithm, 0);
    throw std::runtime_error("unable to initialize SHA-256 provider");
  }
  object.resize(object_size);
  if (BCryptCreateHash(algorithm, &hash, object.data(), object_size, nullptr, 0, 0) < 0 ||
      BCryptHashData(hash, reinterpret_cast<PUCHAR>(const_cast<std::byte*>(data)),
                     static_cast<ULONG>(size), 0) < 0 ||
      BCryptFinishHash(hash, digest.data(), static_cast<ULONG>(digest.size()), 0) < 0) {
    if (hash) BCryptDestroyHash(hash);
    BCryptCloseAlgorithmProvider(algorithm, 0);
    throw std::runtime_error("unable to calculate executable text hash");
  }
  BCryptDestroyHash(hash);
  BCryptCloseAlgorithmProvider(algorithm, 0);

  std::ostringstream encoded;
  encoded << std::hex << std::setfill('0');
  for (const auto value : digest) encoded << std::setw(2) << static_cast<unsigned>(value);
  return encoded.str();
}

std::string trim(std::string value) {
  while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back()))) value.pop_back();
  std::size_t start = 0;
  while (start < value.size() && std::isspace(static_cast<unsigned char>(value[start]))) ++start;
  return value.substr(start);
}

std::string read_game_version(HMODULE module) {
  std::wstring module_path(32768, L'\0');
  const auto length = GetModuleFileNameW(module, module_path.data(),
                                         static_cast<DWORD>(module_path.size()));
  if (length == 0 || length >= module_path.size()) {
    throw std::runtime_error("unable to resolve game executable path");
  }
  module_path.resize(length);
  const auto version_path = std::filesystem::path(module_path).replace_filename(L"ffxivgame.ver");
  std::ifstream stream(version_path, std::ios::binary);
  if (!stream) throw std::runtime_error("unable to read game version file");
  std::string version((std::istreambuf_iterator<char>(stream)), std::istreambuf_iterator<char>());
  return trim(std::move(version));
}

bool has_access(const void* address, std::size_t length, bool require_write) {
  if (!address || length == 0) return false;
  MEMORY_BASIC_INFORMATION information{};
  if (VirtualQuery(address, &information, sizeof(information)) != sizeof(information) ||
      information.State != MEM_COMMIT || (information.Protect & (PAGE_GUARD | PAGE_NOACCESS))) {
    return false;
  }
  const auto begin = reinterpret_cast<std::uintptr_t>(address);
  const auto region_end = reinterpret_cast<std::uintptr_t>(information.BaseAddress) + information.RegionSize;
  if (begin > region_end || length > region_end - begin) return false;
  if (!require_write) return true;
  constexpr DWORD writable = PAGE_READWRITE | PAGE_WRITECOPY | PAGE_EXECUTE_READWRITE |
                             PAGE_EXECUTE_WRITECOPY;
  return (information.Protect & writable) != 0;
}

}  // namespace

AddressResolver::AddressResolver(const VersionManifest& manifest, void* main_module)
    : manifest_(manifest), module_base_(static_cast<std::byte*>(main_module)) {
  if (!module_base_) throw std::runtime_error("main module is null");
  const auto* dos = reinterpret_cast<const IMAGE_DOS_HEADER*>(module_base_);
  if (dos->e_magic != IMAGE_DOS_SIGNATURE) throw std::runtime_error("invalid DOS header");
  const auto* nt = reinterpret_cast<const IMAGE_NT_HEADERS64*>(module_base_ + dos->e_lfanew);
  if (nt->Signature != IMAGE_NT_SIGNATURE ||
      nt->OptionalHeader.Magic != IMAGE_NT_OPTIONAL_HDR64_MAGIC) {
    throw std::runtime_error("invalid 64-bit NT header");
  }
  module_size_ = nt->OptionalHeader.SizeOfImage;
  const auto* section = IMAGE_FIRST_SECTION(nt);
  for (std::uint16_t index = 0; index < nt->FileHeader.NumberOfSections; ++index) {
    const std::string name(reinterpret_cast<const char*>(section[index].Name),
                           strnlen(reinterpret_cast<const char*>(section[index].Name), 8));
    if (name == ".text") {
      text_base_ = module_base_ + section[index].VirtualAddress;
      text_size_ = section[index].Misc.VirtualSize;
      break;
    }
  }
  if (!text_base_ || text_size_ == 0) throw std::runtime_error("executable text section not found");
}

ResolvedAddresses AddressResolver::resolve() const {
  validate_module();
  return {
      reinterpret_cast<std::byte**>(resolve_one(manifest_.function("frameworkInstance"))),
      resolve_one(manifest_.function("getUiModule")),
      resolve_one(manifest_.function("getAgentByInternalId")),
      resolve_one(manifest_.function("utf8SetString")),
      resolve_one(manifest_.function("releaseLobbyContext")),
      resolve_one(manifest_.function("returnToTitle")),
      resolve_one(manifest_.function("getAddonByName")),
      resolve_one(manifest_.function("getComponentButtonById")),
  };
}

std::byte* AddressResolver::resolve_one(const FunctionSpec& spec) const {
  auto* match = scan_unique(spec.pattern);
  if (spec.resolve == ResolveKind::Direct) return match + spec.offset;
  if (match + spec.offset + sizeof(std::int32_t) > text_base_ + text_size_) {
    throw std::runtime_error("signature resolve offset is outside text section");
  }
  const auto displacement = *reinterpret_cast<const std::int32_t*>(match + spec.offset);
  auto* resolved = match + spec.next_instruction + displacement;
  if (resolved < module_base_ || resolved >= module_base_ + module_size_) {
    throw std::runtime_error("resolved address is outside the main module");
  }
  return resolved;
}

std::byte* AddressResolver::scan_unique(const std::string& pattern_text) const {
  const auto pattern = parse_pattern(pattern_text);
  if (pattern.size() > text_size_) throw std::runtime_error("signature is larger than text section");
  std::byte* result = nullptr;
  for (std::size_t offset = 0; offset <= text_size_ - pattern.size(); ++offset) {
    bool matches = true;
    for (std::size_t index = 0; index < pattern.size(); ++index) {
      if (!pattern[index].wildcard &&
          static_cast<std::uint8_t>(text_base_[offset + index]) != pattern[index].value) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;
    if (result) throw std::runtime_error("signature matched more than once");
    result = text_base_ + offset;
  }
  if (!result) throw std::runtime_error("signature did not match");
  return result;
}

void AddressResolver::validate_module() const {
  const auto module = reinterpret_cast<HMODULE>(module_base_);
  std::wstring path(32768, L'\0');
  const auto length = GetModuleFileNameW(module, path.data(), static_cast<DWORD>(path.size()));
  if (length == 0 || length >= path.size()) throw std::runtime_error("unable to resolve module name");
  path.resize(length);
  const auto file_name = std::filesystem::path(path).filename().string();
  if (_stricmp(file_name.c_str(), manifest_.module_name.c_str()) != 0) {
    throw std::runtime_error("unexpected main module name");
  }
  if (read_game_version(module) != manifest_.game_version) {
    throw std::runtime_error("game version does not match the manifest");
  }
  auto expected_hash = manifest_.text_sha256;
  std::ranges::transform(expected_hash, expected_hash.begin(),
                         [](const unsigned char value) { return static_cast<char>(std::tolower(value)); });
  if (sha256(text_base_, text_size_) != expected_hash) {
    throw std::runtime_error("executable text hash does not match the manifest");
  }
}

bool is_readable(const void* address, std::size_t length) {
  return has_access(address, length, false);
}

bool is_writable(const void* address, std::size_t length) {
  return has_access(address, length, true);
}

}  // namespace bridge
