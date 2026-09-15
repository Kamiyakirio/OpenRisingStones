//! Minimal PROCESS_VM_READ access for fixed fishing fields, independent of DLL injection.
use crate::error::{last_windows_error, BridgeError, BridgeResult};
use windows_sys::Win32::{
    Foundation::{CloseHandle, HANDLE},
    System::{
        Diagnostics::Debug::ReadProcessMemory,
        Threading::{OpenProcess, PROCESS_VM_READ},
    },
};

pub struct FishingReader {
    handle: HANDLE,
    pub process_id: u32,
    animation: usize,
    actors: usize,
    conditions: usize,
    framework: usize,
}

impl FishingReader {
    pub fn connect(requested: Option<u32>) -> BridgeResult<Self> {
        let process_id = crate::process::resolve_process_id(requested)?;
        // Reading fixed fields needs no query, synchronization, or write permissions.
        let handle = unsafe { OpenProcess(PROCESS_VM_READ, 0, process_id) };
        if handle.is_null() {
            return Err(last_windows_error("OpenProcess(fishing read)"));
        }
        // Own the handle before any fallible address resolution so every failure closes it.
        let mut reader = Self {
            handle,
            process_id,
            animation: 0,
            actors: 0,
            conditions: 0,
            framework: 0,
        };
        let (addresses, instructions) =
            crate::shared_memory::resolve_fishing_signatures(process_id)?;
        for (address, expected) in instructions {
            let mut actual = vec![0; expected.len()];
            reader.read(address, &mut actual)?;
            if actual != expected {
                return Err(BridgeError::InvalidData(
                    "fishing signature bytes differ in the running executable".into(),
                ));
            }
        }
        [
            reader.animation,
            reader.actors,
            reader.conditions,
            reader.framework,
        ] = addresses;
        Ok(reader)
    }

    pub fn sample(&self) -> BridgeResult<(bool, u16)> {
        // A failed read also terminates monitoring when the game exits.
        let mut actor = [0; 8];
        self.read(self.actors, &mut actor)?;
        if u64::from_le_bytes(actor) == 0 {
            return Ok((false, 0));
        }
        let mut gathering = [0];
        self.read(self.conditions + 6, &mut gathering)?;
        if gathering[0] > 1 {
            return Err(BridgeError::InvalidData(
                "invalid fishing condition flag".into(),
            ));
        }
        if gathering[0] == 0 {
            return Ok((false, 0));
        }
        let mut animation = [0; 2];
        self.read(self.animation, &mut animation)?;
        // Logging out between reads invalidates this sample instead of retaining a stale cast.
        let mut current_actor = [0; 8];
        self.read(self.actors, &mut current_actor)?;
        Ok((actor == current_actor, u16::from_le_bytes(animation)))
    }

    pub(super) fn read(&self, address: usize, bytes: &mut [u8]) -> BridgeResult<()> {
        let mut read = 0;
        let ok = unsafe {
            ReadProcessMemory(
                self.handle,
                address as *const _,
                bytes.as_mut_ptr().cast(),
                bytes.len(),
                &mut read,
            )
        };
        if ok == 0 {
            let error = last_windows_error("ReadProcessMemory(fishing)");
            if matches!(
                crate::process::resolve_process_id(Some(self.process_id)),
                Err(BridgeError::ProcessNotFound)
            ) {
                return Err(BridgeError::ConnectionClosed);
            }
            return Err(error);
        }
        if read != bytes.len() {
            return Err(BridgeError::InvalidData("incomplete fishing sample".into()));
        }
        Ok(())
    }

    pub(super) fn log_module(&self) -> BridgeResult<usize> {
        if self.framework == 0 {
            return Err(BridgeError::InvalidData(
                "fishing result signature is unavailable".into(),
            ));
        }
        let mut bytes = [0; 8];
        self.read(self.framework, &mut bytes)?;
        let framework = u64::from_le_bytes(bytes) as usize;
        if framework == 0 {
            return Err(BridgeError::ConnectionClosed);
        }
        // FFXIVClientStructs Framework.UIModule and UIModule.RaptureLogModule.
        self.read(framework + 0x2B68, &mut bytes)?;
        let ui = u64::from_le_bytes(bytes) as usize;
        if ui == 0 {
            return Err(BridgeError::ConnectionClosed);
        }
        Ok(ui + 0x1AC0)
    }
}
impl Drop for FishingReader {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.handle);
        }
    }
}
