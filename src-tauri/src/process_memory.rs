//! Cross-platform resident-memory sampling for debug benchmarks.
use serde::Serialize;
use std::sync::{
  atomic::{AtomicBool, AtomicU64, Ordering},
  mpsc, Arc,
};

const SAMPLE_INTERVAL: std::time::Duration = std::time::Duration::from_millis(5);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryMeasurement {
  supported: bool,
  before_bytes: Option<u64>,
  peak_bytes: Option<u64>,
  after_bytes: Option<u64>,
  peak_delta_bytes: Option<u64>,
  retained_delta_bytes: Option<i64>,
  sampling_interval_ms: u64,
}

pub struct MemorySampler {
  before: Option<u64>,
  peak: Arc<AtomicU64>,
  stop: Arc<AtomicBool>,
  handle: Option<std::thread::JoinHandle<()>>,
}

impl MemorySampler {
  /// Starts the sampler and waits until its own thread is included in the baseline.
  pub fn start() -> Self {
    let peak = Arc::new(AtomicU64::new(0));
    let stop = Arc::new(AtomicBool::new(false));
    let (ready_tx, ready_rx) = mpsc::sync_channel(1);
    let sampled_peak = peak.clone();
    let sampled_stop = stop.clone();
    let handle = std::thread::spawn(move || {
      let before = resident_bytes();
      if let Some(bytes) = before {
        sampled_peak.store(bytes, Ordering::Relaxed);
      }
      let _ = ready_tx.send(before);
      while !sampled_stop.load(Ordering::Relaxed) {
        if let Some(bytes) = resident_bytes() {
          sampled_peak.fetch_max(bytes, Ordering::Relaxed);
        }
        std::thread::park_timeout(SAMPLE_INTERVAL);
      }
      if let Some(bytes) = resident_bytes() {
        sampled_peak.fetch_max(bytes, Ordering::Relaxed);
      }
    });
    let before = ready_rx.recv().ok().flatten();
    Self {
      before,
      peak,
      stop,
      handle: Some(handle),
    }
  }

  pub fn finish(mut self) -> MemoryMeasurement {
    self.stop.store(true, Ordering::Relaxed);
    if let Some(handle) = self.handle.take() {
      handle.thread().unpark();
      let _ = handle.join();
    }
    let after = resident_bytes();
    let peak = self
      .before
      .map(|before| self.peak.load(Ordering::Relaxed).max(before));
    MemoryMeasurement {
      supported: self.before.is_some() && after.is_some(),
      before_bytes: self.before,
      peak_bytes: peak,
      after_bytes: after,
      peak_delta_bytes: self
        .before
        .zip(peak)
        .map(|(before, peak)| peak.saturating_sub(before)),
      retained_delta_bytes: self
        .before
        .zip(after)
        .map(|(before, after)| after as i64 - before as i64),
      sampling_interval_ms: SAMPLE_INTERVAL.as_millis() as u64,
    }
  }
}

#[cfg(target_os = "macos")]
#[allow(deprecated)]
fn resident_bytes() -> Option<u64> {
  let mut info = std::mem::MaybeUninit::<libc::mach_task_basic_info>::zeroed();
  let mut count = libc::MACH_TASK_BASIC_INFO_COUNT;
  // SAFETY: task_info receives the correctly sized writable structure and count.
  let status = unsafe {
    libc::task_info(
      libc::mach_task_self(),
      libc::MACH_TASK_BASIC_INFO,
      info.as_mut_ptr().cast::<libc::integer_t>(),
      &mut count,
    )
  };
  if status != libc::KERN_SUCCESS {
    return None;
  }
  // SAFETY: a successful task_info call initialized the complete structure.
  Some(unsafe { info.assume_init() }.resident_size)
}

#[cfg(target_os = "linux")]
fn resident_bytes() -> Option<u64> {
  std::fs::read_to_string("/proc/self/status")
    .ok()?
    .lines()
    .find_map(|line| line.strip_prefix("VmRSS:"))?
    .split_whitespace()
    .next()?
    .parse::<u64>()
    .ok()
    .map(|kilobytes| kilobytes * 1024)
}

#[cfg(windows)]
fn resident_bytes() -> Option<u64> {
  use windows_sys::Win32::System::{
    ProcessStatus::{K32GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS},
    Threading::GetCurrentProcess,
  };
  let mut counters = unsafe { std::mem::zeroed::<PROCESS_MEMORY_COUNTERS>() };
  counters.cb = std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32;
  // SAFETY: the pseudo handle is valid for this process and the counter buffer is sized above.
  let succeeded = unsafe {
    K32GetProcessMemoryInfo(
      GetCurrentProcess(),
      &mut counters,
      std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
    )
  };
  (succeeded != 0).then_some(counters.WorkingSetSize as u64)
}

#[cfg(not(any(target_os = "macos", target_os = "linux", windows)))]
fn resident_bytes() -> Option<u64> {
  None
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn sampler_reports_ordered_resident_memory_when_supported() {
    let sampler = MemorySampler::start();
    let allocation = vec![1_u8; 2 * 1024 * 1024];
    std::hint::black_box(&allocation);
    let result = sampler.finish();
    if result.supported {
      assert!(result.before_bytes.is_some());
      assert!(result.after_bytes.is_some());
      assert!(result.peak_bytes >= result.before_bytes);
      assert!(result.peak_delta_bytes.is_some());
      assert_eq!(result.sampling_interval_ms, 5);
    }
  }
}
