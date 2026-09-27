// Validates the allowlisted native chat entry before calling the game's text parser.
#pragma once
#include <cstdint>
#include <string_view>

namespace bridge {
inline std::string_view chat_channel_prefix(std::uint32_t channel) {
  switch (channel) {
    case 0:
      return "";
    case 10:
      return "/say ";
    case 11:
      return "/shout ";
    case 12:
      return "/tell ";
    case 14:
      return "/party ";
    case 15:
      return "/alliance ";
    case 24:
      return "/freecompany ";
    case 27:
      return "/novice ";
    case 30:
      return "/yell ";
    case 56:
      return "/echo ";
    case 16:
      return "/linkshell1 ";
    case 17:
      return "/linkshell2 ";
    case 18:
      return "/linkshell3 ";
    case 19:
      return "/linkshell4 ";
    case 20:
      return "/linkshell5 ";
    case 21:
      return "/linkshell6 ";
    case 22:
      return "/linkshell7 ";
    case 23:
      return "/linkshell8 ";
    case 37:
      return "/cwlinkshell1 ";
    case 101:
      return "/cwlinkshell2 ";
    case 102:
      return "/cwlinkshell3 ";
    case 103:
      return "/cwlinkshell4 ";
    case 104:
      return "/cwlinkshell5 ";
    case 105:
      return "/cwlinkshell6 ";
    case 106:
      return "/cwlinkshell7 ";
    case 107:
      return "/cwlinkshell8 ";
    default:
      return {};
  }
}

inline bool valid_chat_entry(std::uint32_t channel, std::string_view entry) {
  if (entry.empty() || entry.size() > 500) return false;
  for (unsigned char c : entry)
    if (c < 0x20 || c == 0x7f) return false;
  auto body = entry;
  if (channel != 0) {
    const auto prefix = chat_channel_prefix(channel);
    if (prefix.empty() || !entry.starts_with(prefix)) return false;
    body.remove_prefix(prefix.size());
  }
  if (channel == 12) {
    const auto at = body.find('@');
    const auto end = at == std::string_view::npos ? at : body.find(' ', at);
    if (at == std::string_view::npos || at == 0 || end == std::string_view::npos || end <= at + 1 ||
        end > 128)
      return false;
    if (body.front() == ' ' || body[at - 1] == ' ' ||
        body.substr(0, end).find('@', at + 1) != std::string_view::npos)
      return false;
    for (unsigned char c : body.substr(0, end)) {
      if (c < 0x80 && !((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == ' ' || c == '-' ||
                        c == '\'' || c == '@'))
        return false;
    }
    body.remove_prefix(end + 1);
  }
  const auto first = body.find_first_not_of(' ');
  return first != std::string_view::npos && body[first] != '/';
}
}  // namespace bridge
