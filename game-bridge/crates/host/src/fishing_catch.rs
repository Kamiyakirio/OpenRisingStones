//! Decodes item links only from local gathering results; no chat text is retained.

/// LogInfo stores the channel in seven bits and source/target relations above it.
pub(super) fn is_local_gathering(header: &[u8]) -> bool {
    let Some(bytes) = header.get(4..6) else {
        return false;
    };
    let info = u16::from_le_bytes([bytes[0], bytes[1]]);
    info & 0x7f == 67 && (info >> 11) & 0xf <= 1 && (info >> 7) & 0xf <= 1
}

/// SeString integer expressions omit zero bytes; every read stays within its payload.
fn integer(bytes: &[u8], cursor: &mut usize) -> Option<u32> {
    let marker = *bytes.get(*cursor)?;
    *cursor += 1;
    if (1..0xd0).contains(&marker) {
        return Some(u32::from(marker - 1));
    }
    if marker < 0xf0 {
        return None;
    }
    let mask = marker.wrapping_add(1) & 0xf;
    let mut value = 0;
    for bit in (0..4).rev() {
        if mask & (1 << bit) != 0 {
            value |= u32::from(*bytes.get(*cursor)?) << (bit * 8);
            *cursor += 1;
        }
    }
    Some(value)
}

pub(super) fn caught_item(message: &[u8]) -> Option<u32> {
    if !is_local_gathering(message) || message.get(8) != Some(&0x1f) {
        return None;
    }
    let mut cursor = 9;
    while cursor < message.len() {
        if message[cursor] != 2 {
            cursor += 1;
            continue;
        }
        let kind = *message.get(cursor + 1)?;
        cursor += 2;
        let length = integer(message, &mut cursor)? as usize;
        let end = cursor.checked_add(length)?;
        let payload = message.get(cursor..end)?;
        if message.get(end) != Some(&3) {
            return None;
        }
        if kind == 0x27 && payload.first() == Some(&3) {
            let id = integer(payload, &mut 1)?;
            // HQ and collectable item links carry a million-based variant prefix.
            let base = id % 1_000_000;
            return (base > 0 && id < 3_000_000).then_some(base);
        }
        cursor = end + 1;
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    fn message() -> Vec<u8> {
        vec![
            0, 0, 0, 0, 67, 0, 0, 0, 31, 31, 2, 0x27, 7, 3, 0xf2, 0x13, 0x88, 2, 1, 3,
        ]
    }
    #[test]
    fn accepts_local_item_and_rejects_other_players_and_channels() {
        let mut bytes = message();
        assert_eq!(caught_item(&bytes), Some(5000));
        bytes[5] = 0x20;
        assert_eq!(caught_item(&bytes), None);
        bytes[5] = 0;
        bytes[4] = 56;
        assert_eq!(caught_item(&bytes), None);
    }
    #[test]
    fn parses_live_local_catch_message() {
        // Local gathering header and item payload captured from a real catch (item 43669).
        let bytes = [
            0, 0, 0, 0, 0x43, 0x08, 0, 0, 31, 31, 2, 0x27, 7, 3, 0xf2, 0xaa, 0x95, 2, 2, 3,
        ];
        assert_eq!(caught_item(&bytes), Some(43669));
    }
    #[test]
    fn rejects_truncated_links_without_panicking() {
        let bytes = message();
        for end in 0..bytes.len() {
            assert_eq!(caught_item(&bytes[..end]), None);
        }
    }
    #[test]
    fn normalizes_hq_links_and_skips_unrelated_payloads() {
        let mut bytes = vec![0, 0, 0, 0, 67, 0, 0, 0, 31, 31];
        bytes.extend([2, 0x13, 2, 7, 3]);
        bytes.extend([2, 0x27, 8, 3, 0xf6, 0x0f, 0x42, 0x41, 2, 1, 3]);
        assert_eq!(caught_item(&bytes), Some(1));
    }
}
