//! Extract the portable executable's embedded bridge runtime before loading it.
//! Content-specific directories keep DLLs and manifests from different builds together.

use sha2::{Digest, Sha256};
use std::{
  fs, io,
  path::{Path, PathBuf},
};

include!(env!("OPEN_RISING_STONES_BUNDLED_GAME_BRIDGE_MANIFEST"));

/// Restore every runtime asset, including manifests, without companion files beside the EXE.
pub(super) fn materialize() -> io::Result<PathBuf> {
  materialize_files(
    &std::env::temp_dir()
      .join("OpenRisingStones")
      .join("game-bridge"),
    BUNDLED_GAME_BRIDGE_FILES,
  )
}

/// Fingerprint names and contents so any runtime update selects a separate directory.
fn materialize_files(cache_root: &Path, files: &[(&str, &[u8])]) -> io::Result<PathBuf> {
  let mut hash = Sha256::new();
  for (name, bytes) in files {
    hash.update((name.len() as u64).to_le_bytes());
    hash.update(name.as_bytes());
    hash.update((bytes.len() as u64).to_le_bytes());
    hash.update(bytes);
  }
  let asset_root = cache_root.join(format!("{:x}", hash.finalize()));
  for (name, bytes) in files {
    let path = asset_root.join(name);
    if file_matches(&path, bytes) {
      continue;
    }
    let parent = path.parent().ok_or_else(|| {
      io::Error::new(
        io::ErrorKind::InvalidInput,
        "The bridge asset has no parent directory.",
      )
    })?;
    fs::create_dir_all(parent)?;
    // Unique staging files allow simultaneous app launches. Rename publishes complete bytes.
    let staged = parent.join(format!(
      ".bridge-{}-{:016x}.tmp",
      std::process::id(),
      rand::random::<u64>()
    ));
    fs::write(&staged, bytes)?;
    let result = (|| {
      if path.exists() {
        if file_matches(&path, bytes) {
          return Ok(());
        }
        fs::remove_file(&path)?;
      }
      fs::rename(&staged, &path)
    })();
    let _ = fs::remove_file(&staged);
    if let Err(error) = result {
      // Another process may have published the same asset while this one was staging it.
      if !file_matches(&path, bytes) {
        return Err(error);
      }
    }
  }
  Ok(asset_root)
}

fn file_matches(path: &Path, expected: &[u8]) -> bool {
  fs::read(path)
    .map(|bytes| bytes == expected)
    .unwrap_or(false)
}

#[cfg(test)]
mod tests {
  use super::*;

  /// Remove only the unique cache owned by this test, including after assertion failures.
  struct TestCache(PathBuf);

  impl TestCache {
    fn new() -> Self {
      Self(std::env::temp_dir().join(format!("ors-bridge-test-{:016x}", rand::random::<u64>())))
    }
  }

  impl Drop for TestCache {
    fn drop(&mut self) {
      let _ = fs::remove_dir_all(&self.0);
    }
  }

  #[test]
  fn restores_complete_runtime_without_an_executable_resource_directory() {
    let cache = TestCache::new();
    let root = materialize_files(&cache.0, BUNDLED_GAME_BRIDGE_FILES).unwrap();
    for (name, bytes) in BUNDLED_GAME_BRIDGE_FILES {
      assert!(
        file_matches(&root.join(name), bytes),
        "Missing or altered asset: {name}"
      );
    }
    assert!(root.join("game_bridge_payload.dll").is_file());
    assert!(root.join("worlds-cn.json").is_file());
    assert!(root.join("manifests").is_dir());
  }

  #[test]
  fn repairs_missing_and_corrupt_assets_and_reuses_valid_files() {
    let cache = TestCache::new();
    let files: &[(&str, &[u8])] = &[
      ("game_bridge_payload.dll", b"payload"),
      ("manifests/test.json", b"{}"),
    ];
    let root = materialize_files(&cache.0, files).unwrap();
    let payload = root.join("game_bridge_payload.dll");
    let modified = fs::metadata(&payload).unwrap().modified().unwrap();
    assert_eq!(materialize_files(&cache.0, files).unwrap(), root);
    assert_eq!(
      fs::metadata(&payload).unwrap().modified().unwrap(),
      modified
    );
    fs::write(&payload, b"corrupt").unwrap();
    fs::remove_file(root.join("manifests/test.json")).unwrap();
    assert_eq!(materialize_files(&cache.0, files).unwrap(), root);
    for (name, bytes) in files {
      assert!(file_matches(&root.join(name), bytes));
    }
  }

  #[test]
  fn runtime_updates_use_a_separate_directory() {
    let cache = TestCache::new();
    let old = materialize_files(&cache.0, &[("payload.dll", b"old")]).unwrap();
    let new = materialize_files(&cache.0, &[("payload.dll", b"new")]).unwrap();
    let renamed = materialize_files(&cache.0, &[("renamed.dll", b"new")]).unwrap();
    assert_ne!(old, new);
    assert_ne!(new, renamed);
    assert!(file_matches(&old.join("payload.dll"), b"old"));
  }

  #[test]
  fn simultaneous_launches_publish_complete_assets() {
    let cache = TestCache::new();
    let roots = std::thread::scope(|scope| {
      let workers: Vec<_> = (0..4)
        .map(|_| scope.spawn(|| materialize_files(&cache.0, BUNDLED_GAME_BRIDGE_FILES).unwrap()))
        .collect();
      workers
        .into_iter()
        .map(|worker| worker.join().unwrap())
        .collect::<Vec<_>>()
    });
    for root in roots {
      for (name, bytes) in BUNDLED_GAME_BRIDGE_FILES {
        assert!(file_matches(&root.join(name), bytes));
      }
    }
  }
}
