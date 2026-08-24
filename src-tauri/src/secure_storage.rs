//! Operating-system credential protection for sensitive local session material.

#[cfg(windows)]
mod platform {
  use std::{ffi::c_void, fs, path::Path, ptr};

  const CRYPTPROTECT_UI_FORBIDDEN: u32 = 0x1;
  const ENTROPY: &[u8] = b"OpenRisingStones.SDO.Session.v1";
  const MAX_PROTECTED_BYTES: u64 = 256 * 1024;

  #[repr(C)]
  struct DataBlob {
    length: u32,
    data: *mut u8,
  }

  #[link(name = "crypt32")]
  extern "system" {
    fn CryptProtectData(
      input: *mut DataBlob,
      description: *const u16,
      entropy: *mut DataBlob,
      reserved: *mut c_void,
      prompt: *mut c_void,
      flags: u32,
      output: *mut DataBlob,
    ) -> i32;
    fn CryptUnprotectData(
      input: *mut DataBlob,
      description: *mut *mut u16,
      entropy: *mut DataBlob,
      reserved: *mut c_void,
      prompt: *mut c_void,
      flags: u32,
      output: *mut DataBlob,
    ) -> i32;
  }

  #[link(name = "kernel32")]
  extern "system" {
    fn LocalFree(memory: *mut c_void) -> *mut c_void;
  }

  pub fn save(path: &Path, plaintext: &[u8]) -> Result<(), String> {
    let protected = transform(plaintext, true)?;
    let parent = path
      .parent()
      .ok_or_else(|| "The secure session path is invalid.".to_owned())?;
    fs::create_dir_all(parent)
      .map_err(|_| "Unable to prepare secure session storage.".to_owned())?;
    fs::write(path, protected).map_err(|_| "Unable to save the protected session.".to_owned())
  }

  pub fn load(path: &Path) -> Result<Option<Vec<u8>>, String> {
    let metadata = match fs::metadata(path) {
      Ok(metadata) => metadata,
      Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
      Err(_) => return Err("Unable to inspect the protected session.".to_owned()),
    };
    if metadata.len() > MAX_PROTECTED_BYTES {
      return Err("The protected session exceeds the size limit.".to_owned());
    }
    let protected =
      fs::read(path).map_err(|_| "Unable to read the protected session.".to_owned())?;
    transform(&protected, false).map(Some)
  }

  pub fn clear(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
      Ok(()) => Ok(()),
      Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
      Err(_) => Err("Unable to clear the protected session.".to_owned()),
    }
  }

  fn transform(input: &[u8], encrypt: bool) -> Result<Vec<u8>, String> {
    let input_length = u32::try_from(input.len())
      .map_err(|_| "The secure session payload is too large.".to_owned())?;
    let entropy_length = u32::try_from(ENTROPY.len())
      .map_err(|_| "The secure storage entropy is invalid.".to_owned())?;
    let mut input_blob = DataBlob {
      length: input_length,
      data: input.as_ptr().cast_mut(),
    };
    let mut entropy_blob = DataBlob {
      length: entropy_length,
      data: ENTROPY.as_ptr().cast_mut(),
    };
    let mut output_blob = DataBlob {
      length: 0,
      data: ptr::null_mut(),
    };

    let succeeded = unsafe {
      if encrypt {
        CryptProtectData(
          &mut input_blob,
          ptr::null(),
          &mut entropy_blob,
          ptr::null_mut(),
          ptr::null_mut(),
          CRYPTPROTECT_UI_FORBIDDEN,
          &mut output_blob,
        )
      } else {
        CryptUnprotectData(
          &mut input_blob,
          ptr::null_mut(),
          &mut entropy_blob,
          ptr::null_mut(),
          ptr::null_mut(),
          CRYPTPROTECT_UI_FORBIDDEN,
          &mut output_blob,
        )
      }
    };
    if succeeded == 0 || output_blob.data.is_null() {
      return Err("Windows could not process the protected session.".to_owned());
    }

    let output = unsafe {
      let bytes = std::slice::from_raw_parts(output_blob.data, output_blob.length as usize);
      let owned = bytes.to_vec();
      LocalFree(output_blob.data.cast());
      owned
    };
    Ok(output)
  }

  #[cfg(test)]
  mod tests {
    use super::*;

    #[test]
    fn protected_data_round_trips_without_plaintext_output() {
      let plaintext = b"session-cookie-secret";
      let encrypted = transform(plaintext, true).unwrap();
      assert_ne!(encrypted, plaintext);
      assert_eq!(transform(&encrypted, false).unwrap(), plaintext);
    }
  }
}

#[cfg(target_os = "macos")]
mod platform {
  use std::{ffi::c_void, path::Path, ptr};

  const ERR_SEC_ITEM_NOT_FOUND: i32 = -25_300;
  const SERVICE: &[u8] = b"com.kamiyakirio.OpenRisingStones.SDO";
  const ACCOUNT: &[u8] = b"session-v1";

  #[link(name = "Security", kind = "framework")]
  extern "C" {
    fn SecKeychainFindGenericPassword(
      keychain_or_array: *const c_void,
      service_length: u32,
      service_name: *const c_void,
      account_length: u32,
      account_name: *const c_void,
      password_length: *mut u32,
      password_data: *mut *mut c_void,
      item_ref: *mut *mut c_void,
    ) -> i32;
    fn SecKeychainAddGenericPassword(
      keychain: *const c_void,
      service_length: u32,
      service_name: *const c_void,
      account_length: u32,
      account_name: *const c_void,
      password_length: u32,
      password_data: *const c_void,
      item_ref: *mut *mut c_void,
    ) -> i32;
    fn SecKeychainItemModifyAttributesAndData(
      item_ref: *mut c_void,
      attributes: *const c_void,
      data_length: u32,
      data: *const c_void,
    ) -> i32;
    fn SecKeychainItemDelete(item_ref: *mut c_void) -> i32;
    fn SecKeychainItemFreeContent(attributes: *const c_void, data: *mut c_void) -> i32;
  }

  #[link(name = "CoreFoundation", kind = "framework")]
  extern "C" {
    fn CFRelease(value: *const c_void);
  }

  pub fn save(_path: &Path, plaintext: &[u8]) -> Result<(), String> {
    let length = u32::try_from(plaintext.len())
      .map_err(|_| "The secure session payload is too large.".to_owned())?;
    let mut item = ptr::null_mut();
    let find_status = unsafe {
      SecKeychainFindGenericPassword(
        ptr::null(),
        SERVICE.len() as u32,
        SERVICE.as_ptr().cast(),
        ACCOUNT.len() as u32,
        ACCOUNT.as_ptr().cast(),
        ptr::null_mut(),
        ptr::null_mut(),
        &mut item,
      )
    };

    if find_status == 0 {
      let update_status = unsafe {
        SecKeychainItemModifyAttributesAndData(item, ptr::null(), length, plaintext.as_ptr().cast())
      };
      unsafe { CFRelease(item.cast_const()) };
      return status_result(update_status, "Unable to update the Keychain session.");
    }
    if find_status != ERR_SEC_ITEM_NOT_FOUND {
      return Err("Unable to access the macOS Keychain.".to_owned());
    }

    let add_status = unsafe {
      SecKeychainAddGenericPassword(
        ptr::null(),
        SERVICE.len() as u32,
        SERVICE.as_ptr().cast(),
        ACCOUNT.len() as u32,
        ACCOUNT.as_ptr().cast(),
        length,
        plaintext.as_ptr().cast(),
        ptr::null_mut(),
      )
    };
    status_result(add_status, "Unable to save the Keychain session.")
  }

  pub fn load(_path: &Path) -> Result<Option<Vec<u8>>, String> {
    let mut length = 0;
    let mut data = ptr::null_mut();
    let status = unsafe {
      SecKeychainFindGenericPassword(
        ptr::null(),
        SERVICE.len() as u32,
        SERVICE.as_ptr().cast(),
        ACCOUNT.len() as u32,
        ACCOUNT.as_ptr().cast(),
        &mut length,
        &mut data,
        ptr::null_mut(),
      )
    };
    if status == ERR_SEC_ITEM_NOT_FOUND {
      return Ok(None);
    }
    if status != 0 || (length > 0 && data.is_null()) {
      return Err("Unable to read the Keychain session.".to_owned());
    }

    let value = unsafe {
      let bytes = std::slice::from_raw_parts(data.cast::<u8>(), length as usize);
      let owned = bytes.to_vec();
      SecKeychainItemFreeContent(ptr::null(), data);
      owned
    };
    Ok(Some(value))
  }

  pub fn clear(_path: &Path) -> Result<(), String> {
    let mut item = ptr::null_mut();
    let status = unsafe {
      SecKeychainFindGenericPassword(
        ptr::null(),
        SERVICE.len() as u32,
        SERVICE.as_ptr().cast(),
        ACCOUNT.len() as u32,
        ACCOUNT.as_ptr().cast(),
        ptr::null_mut(),
        ptr::null_mut(),
        &mut item,
      )
    };
    if status == ERR_SEC_ITEM_NOT_FOUND {
      return Ok(());
    }
    if status != 0 || item.is_null() {
      return Err("Unable to access the macOS Keychain.".to_owned());
    }
    let delete_status = unsafe { SecKeychainItemDelete(item) };
    unsafe { CFRelease(item.cast_const()) };
    status_result(delete_status, "Unable to clear the Keychain session.")
  }

  fn status_result(status: i32, message: &str) -> Result<(), String> {
    if status == 0 {
      Ok(())
    } else {
      Err(message.to_owned())
    }
  }
}

#[cfg(not(any(windows, target_os = "macos")))]
mod platform {
  use std::path::Path;

  pub fn save(_path: &Path, _plaintext: &[u8]) -> Result<(), String> {
    Err("Secure session storage is not supported on this platform.".to_owned())
  }

  pub fn load(_path: &Path) -> Result<Option<Vec<u8>>, String> {
    Err("Secure session storage is not supported on this platform.".to_owned())
  }

  pub fn clear(_path: &Path) -> Result<(), String> {
    Ok(())
  }
}

pub use platform::{clear, load, save};
