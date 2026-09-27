// Exercise native channel enforcement without loading the game or sending public chat.
#include "../src/chat_input.hpp"

#include <array>
#include <iostream>
#include <string>

int main() {
  int failures = 0;
  const auto check = [&failures](bool valid) {
    if (!valid) ++failures;
  };
  check(bridge::valid_chat_entry(0, "hello"));
  check(bridge::valid_chat_entry(24, "/freecompany hello"));
  check(bridge::valid_chat_entry(12, "/tell Player Name@World hello"));
  check(bridge::valid_chat_entry(101, "/cwlinkshell2 hello"));
  check(bridge::valid_chat_entry(107, "/cwlinkshell8 hello"));
  const std::array<std::uint32_t, 25> channels = {
      10, 11, 12, 14, 15, 24,  27,  30,  56,  16,  17,  18,  19,
      20, 21, 22, 23, 37, 101, 102, 103, 104, 105, 106, 107,
  };
  for (const auto channel : channels) {
    const auto prefix = bridge::chat_channel_prefix(channel);
    check(!prefix.empty());
    const auto entry = std::string(prefix) + (channel == 12 ? "Player Name@World hello" : "hello");
    check(bridge::valid_chat_entry(channel, entry));
    check(!bridge::valid_chat_entry(channel, "/logout"));
  }
  check(!bridge::valid_chat_entry(0, " /logout"));
  check(!bridge::valid_chat_entry(24, "/say hello"));
  check(!bridge::valid_chat_entry(127, "/say hello"));
  check(!bridge::valid_chat_entry(12, "/tell Name@World@Other hello"));
  check(!bridge::valid_chat_entry(12, "/tell Name@World /logout"));
  check(!bridge::valid_chat_entry(10, "/say hello\n/logout"));
  check(!bridge::valid_chat_entry(10, "/say " + std::string(496, 'a')));
  if (failures) std::cerr << "Native chat validation failures: " << failures << '\n';
  return failures ? 1 : 0;
}
