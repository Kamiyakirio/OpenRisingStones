//! Bounded, read-only cursor over newly appended gathering results.
//! Layout references: FFXIVClientStructs Component.Log.LogModule (0x48/0x60).
use super::{
    catch::{caught_item, is_local_gathering},
    reader::FishingReader,
};
use crate::error::{BridgeError, BridgeResult};

#[derive(Default)]
pub struct FishingCatchReader {
    previous: Option<(usize, u64, usize, usize)>,
    last_active: Option<std::time::Instant>,
}

impl FishingCatchReader {
    /// Attach/reset establishes a baseline; it never replays an existing catch.
    pub fn poll(&mut self, reader: &FishingReader, active: bool) -> BridgeResult<Option<u32>> {
        if active {
            self.last_active = Some(std::time::Instant::now());
        }
        // Allow delayed result delivery after closing the gathering stance.
        let accepting = self
            .last_active
            .is_some_and(|last| last.elapsed().as_secs() < 5);
        let module = reader.log_module()?;
        let mut header = [0; 0x80];
        reader.read(module, &mut header)?;
        let word =
            |offset| u64::from_le_bytes(header[offset..offset + 8].try_into().unwrap()) as usize;
        let owner = u64::from_le_bytes(header[8..16].try_into().unwrap());
        let (index, end, data, data_end) = (word(0x48), word(0x50), word(0x60), word(0x68));
        let invalid = || BridgeError::InvalidData("invalid fishing result log layout".into());
        let index_bytes = end.checked_sub(index).ok_or_else(invalid)?;
        let data_bytes = data_end.checked_sub(data).ok_or_else(invalid)?;
        if index_bytes % 4 != 0
            || index_bytes > 4_000_000
            || data_bytes > 64_000_000
            || end > word(0x58)
            || data_end > word(0x70)
        {
            return Err(invalid());
        }
        let count = index_bytes / 4;
        let current = (module, owner, count, data_bytes);
        let Some((old_module, old_owner, old_count, old_bytes)) = self.previous else {
            self.previous = Some(current);
            return Ok(None);
        };
        if !accepting
            || owner == 0
            || module != old_module
            || owner != old_owner
            || count < old_count
            || data_bytes < old_bytes
        {
            self.previous = Some(current);
            return Ok(None);
        }
        let mut result = None;
        // Bound work even after a delayed poll; read only gathering message bodies.
        for position in old_count.max(count.saturating_sub(64))..count {
            let mut offsets = [0; 8];
            let (start, finish) = if position == 0 {
                reader.read(index, &mut offsets[..4])?;
                (
                    0,
                    u32::from_le_bytes(offsets[..4].try_into().unwrap()) as usize,
                )
            } else {
                reader.read(index + (position - 1) * 4, &mut offsets)?;
                (
                    u32::from_le_bytes(offsets[..4].try_into().unwrap()) as usize,
                    u32::from_le_bytes(offsets[4..].try_into().unwrap()) as usize,
                )
            };
            if finish < start || finish > data_bytes || finish - start > 8192 || finish - start < 9
            {
                continue;
            }
            let mut info = [0; 8];
            reader.read(data + start, &mut info)?;
            if !is_local_gathering(&info) {
                continue;
            }
            let mut message = vec![0; finish - start];
            reader.read(data + start, &mut message)?;
            if let Some(item) = caught_item(&message) {
                result = Some(item);
            }
        }
        // Discard a snapshot if the game reallocated or appended during these reads.
        let mut check = [0; 0x80];
        reader.read(module, &mut check)?;
        if header[8..16] != check[8..16] || header[0x48..0x78] != check[0x48..0x78] {
            return Ok(None);
        }
        self.previous = Some(current);
        Ok(result)
    }
}
