//! Fixed send channels and validation shared by the HTTP adapter and native command writer.
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
#[repr(u32)]
pub enum ChatSendChannel {
    #[default]
    Current = 0,
    Say = 10,
    Shout = 11,
    Tell = 12,
    Party = 14,
    Alliance = 15,
    FreeCompany = 24,
    Novice = 27,
    Yell = 30,
    Echo = 56,
    Linkshell1 = 16,
    Linkshell2 = 17,
    Linkshell3 = 18,
    Linkshell4 = 19,
    Linkshell5 = 20,
    Linkshell6 = 21,
    Linkshell7 = 22,
    Linkshell8 = 23,
    CrossLinkshell1 = 37,
    CrossLinkshell2 = 101,
    CrossLinkshell3 = 102,
    CrossLinkshell4 = 103,
    CrossLinkshell5 = 104,
    CrossLinkshell6 = 105,
    CrossLinkshell7 = 106,
    CrossLinkshell8 = 107,
}

impl ChatSendChannel {
    pub fn prefix(self) -> &'static str {
        match self {
            Self::Current => "",
            Self::Say => "/say ",
            Self::Shout => "/shout ",
            Self::Tell => "/tell ",
            Self::Party => "/party ",
            Self::Alliance => "/alliance ",
            Self::FreeCompany => "/freecompany ",
            Self::Novice => "/novice ",
            Self::Yell => "/yell ",
            Self::Echo => "/echo ",
            Self::Linkshell1 => "/linkshell1 ",
            Self::Linkshell2 => "/linkshell2 ",
            Self::Linkshell3 => "/linkshell3 ",
            Self::Linkshell4 => "/linkshell4 ",
            Self::Linkshell5 => "/linkshell5 ",
            Self::Linkshell6 => "/linkshell6 ",
            Self::Linkshell7 => "/linkshell7 ",
            Self::Linkshell8 => "/linkshell8 ",
            Self::CrossLinkshell1 => "/cwlinkshell1 ",
            Self::CrossLinkshell2 => "/cwlinkshell2 ",
            Self::CrossLinkshell3 => "/cwlinkshell3 ",
            Self::CrossLinkshell4 => "/cwlinkshell4 ",
            Self::CrossLinkshell5 => "/cwlinkshell5 ",
            Self::CrossLinkshell6 => "/cwlinkshell6 ",
            Self::CrossLinkshell7 => "/cwlinkshell7 ",
            Self::CrossLinkshell8 => "/cwlinkshell8 ",
        }
    }
}

/// Only the allowlisted prefix is generated; caller text cannot inject another command.
pub fn build_chat_entry(
    channel: ChatSendChannel,
    recipient: &str,
    message: &str,
) -> Result<String, &'static str> {
    if message.trim().is_empty()
        || message.trim_start().starts_with('/')
        || message.chars().any(char::is_control)
    {
        return Err("Chat messages must be plain, nonempty text without control characters or slash commands.");
    }
    let entry = if channel == ChatSendChannel::Tell {
        let Some((name, world)) = recipient.split_once('@') else {
            return Err("Tell recipients must use Character Name@World.");
        };
        if recipient.len() > 128
            || name.trim() != name
            || name.is_empty()
            || world.is_empty()
            || !name.chars().next().is_some_and(char::is_alphabetic)
            || !world.chars().next().is_some_and(char::is_alphabetic)
            || !name
                .chars()
                .all(|c| c.is_alphabetic() || c == ' ' || c == '-' || c == '\'')
            || !world
                .chars()
                .all(|c| c.is_alphabetic() || c == '-' || c == '\'')
        {
            return Err("Tell recipient names or worlds contain invalid characters.");
        }
        format!("{}{} {}", channel.prefix(), recipient, message)
    } else {
        if !recipient.is_empty() {
            return Err("Recipients are only valid for tells.");
        }
        format!("{}{}", channel.prefix(), message)
    };
    if entry.len() > 500 {
        return Err("The complete chat entry must not exceed 500 UTF-8 bytes.");
    }
    Ok(entry)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn routes_text_and_tells_to_fixed_destinations() {
        assert_eq!(
            build_chat_entry(ChatSendChannel::Current, "", "hello").unwrap(),
            "hello"
        );
        assert_eq!(
            build_chat_entry(ChatSendChannel::FreeCompany, "", "hello").unwrap(),
            "/freecompany hello"
        );
        assert_eq!(
            build_chat_entry(ChatSendChannel::CrossLinkshell2, "", "hello").unwrap(),
            "/cwlinkshell2 hello"
        );
        assert_eq!(
            build_chat_entry(ChatSendChannel::Tell, "Player Name@World", "hello").unwrap(),
            "/tell Player Name@World hello"
        );
        assert_eq!(
            build_chat_entry(ChatSendChannel::Echo, "", "hello").unwrap(),
            "/echo hello"
        );
    }

    #[test]
    fn rejects_commands_control_bytes_and_malformed_recipients() {
        for message in [
            "/logout",
            " /logout",
            "\n/logout",
            "hello\0/logout",
            "hello\r\n/logout",
            "   ",
        ] {
            assert!(build_chat_entry(ChatSendChannel::Current, "", message).is_err());
            assert!(build_chat_entry(ChatSendChannel::Say, "", message).is_err());
        }
        for recipient in [
            "",
            "Name",
            "Name@",
            "@World",
            "Name @World",
            "Name@World extra",
            "Name@World@Other",
            "Name@World\n/logout",
            "Name/<t>@World",
        ] {
            assert!(build_chat_entry(ChatSendChannel::Tell, recipient, "hello").is_err());
        }
        assert!(build_chat_entry(ChatSendChannel::Say, "Name@World", "hello").is_err());
        assert!(serde_json::from_str::<ChatSendChannel>("\"logout\"").is_err());
    }

    #[test]
    fn counts_the_complete_entry_in_utf8_bytes() {
        assert!(build_chat_entry(ChatSendChannel::Say, "", &"a".repeat(495)).is_ok());
        assert!(build_chat_entry(ChatSendChannel::Say, "", &"a".repeat(496)).is_err());
        assert!(build_chat_entry(ChatSendChannel::Current, "", &"é".repeat(250)).is_ok());
        assert!(build_chat_entry(ChatSendChannel::Echo, "", &"é".repeat(248)).is_err());
    }
}
