//! Fail with an actionable import command when a fresh checkout has no local data.
use std::path::PathBuf;

fn main() {
  let data = PathBuf::from(std::env::var_os("CARGO_MANIFEST_DIR").unwrap())
    .join("../../../src/features/gearing/data/generated");
  for name in ["manifest.json", "rules.json"] {
    let file = data.join(name);
    println!("cargo:rerun-if-changed={}", file.display());
    assert!(
      file.is_file(),
      "Gearing data is missing. From the repository root, run: node scripts/import-gearing-data.mjs --source /path/to/ffxiv-gearing"
    );
  }
}
