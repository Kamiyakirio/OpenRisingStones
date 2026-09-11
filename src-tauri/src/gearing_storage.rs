//! Opaque JSON file I/O: path bounds and atomic writes only; document semantics stay in TypeScript.
use serde_json::{json, Value};
use std::{
  fs::{self, OpenOptions},
  io::Write,
  path::{Path, PathBuf},
  sync::atomic::{AtomicU64, Ordering},
};

fn file(root: &Path, id: &str) -> Result<PathBuf, String> {
  if id.is_empty() || id.len() > 80 || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
    return Err("Invalid gearset ID.".into());
  }
  Ok(root.join(format!("{id}.json")))
}
pub fn list(root: &Path) -> Result<Value, String> {
  if !root.exists() {
    return Ok(json!({"records":[],"issues":[]}));
  }
  let mut documents = vec![];
  let mut issues = vec![];
  for entry in fs::read_dir(root).map_err(|e| e.to_string())? {
    let entry = entry.map_err(|e| e.to_string())?;
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) != Some("json") {
      continue;
    }
    let id = path
      .file_stem()
      .and_then(|s| s.to_str())
      .unwrap_or("")
      .to_owned();
    match load(root, &id) {
      Ok(doc) => documents.push(json!({"id":id,"value":doc})),
      Err(message) => issues.push(json!({"id":id,"message":message})),
    }
  }
  Ok(json!({"records":documents,"issues":issues}))
}
pub fn load(root: &Path, id: &str) -> Result<Value, String> {
  let path = file(root, id)?;
  let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
  if meta.len() > 4 * 1024 * 1024 {
    return Err("Gearset document exceeds the size limit.".into());
  }
  let doc: Value = serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?)
    .map_err(|e| format!("Cannot read gearset document: {e}"))?;
  Ok(doc)
}
pub fn save(root: &Path, id: &str, doc: &Value) -> Result<(), String> {
  let destination = file(root, id)?;
  fs::create_dir_all(root).map_err(|e| e.to_string())?;
  let bytes = serde_json::to_vec_pretty(doc).map_err(|e| e.to_string())?;
  if bytes.len() > 4 * 1024 * 1024 {
    return Err("Gearset document exceeds the size limit.".into());
  }
  static SEQUENCE: AtomicU64 = AtomicU64::new(0);
  let temporary = root.join(format!(
    ".pending-{}-{}",
    std::process::id(),
    SEQUENCE.fetch_add(1, Ordering::Relaxed)
  ));
  let result = (|| -> Result<(), String> {
    let mut file = OpenOptions::new()
      .write(true)
      .create_new(true)
      .open(&temporary)
      .map_err(|e| e.to_string())?;
    file
      .write_all(&bytes)
      .and_then(|_| file.sync_all())
      .map_err(|e| e.to_string())?;
    drop(file);
    fs::rename(&temporary, destination).map_err(|e| e.to_string())
  })();
  if result.is_err() {
    let _ = fs::remove_file(temporary);
  }
  result
}

#[cfg(test)]
mod tests {
  use super::*;
  #[test]
  fn opaque_storage_replaces_files_and_keeps_corrupt_records() {
    let root = std::env::temp_dir().join(format!("gearing-io-{}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    save(&root, "sample", &json!({"arbitrary":"data"})).unwrap();
    save(&root, "sample", &json!([1, 2, 3])).unwrap();
    assert_eq!(load(&root, "sample").unwrap(), json!([1, 2, 3]));
    assert!(save(&root, "../outside", &Value::Null).is_err());
    fs::write(root.join("corrupt.json"), "{").unwrap();
    let result = list(&root).unwrap();
    assert_eq!(result["records"].as_array().unwrap().len(), 1);
    assert_eq!(result["issues"].as_array().unwrap().len(), 1);
    assert!(root.join("corrupt.json").exists());
    fs::remove_dir_all(root).unwrap();
  }
}
