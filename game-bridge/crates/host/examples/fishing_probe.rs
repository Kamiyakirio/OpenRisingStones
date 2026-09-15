//! Read-only diagnostics; an optional duration observes real fishing transitions.
fn main() {
    #[cfg(windows)]
    {
        if let Err(error) = observe() {
            eprintln!("Fishing reader unavailable: {error}");
            std::process::exit(1);
        }
    }
    #[cfg(not(windows))]
    eprintln!("Fishing telemetry requires Windows.");
}

#[cfg(windows)]
fn observe() -> Result<(), Box<dyn std::error::Error>> {
    use game_bridge_host::fishing::{FishingReader, FishingTracker};
    use std::time::{Duration, Instant};
    let seconds = std::env::args()
        .nth(1)
        .map(|value| value.parse::<u64>())
        .transpose()?
        .unwrap_or(0);
    let reader = FishingReader::connect(None)?;
    let mut catches = game_bridge_host::fishing::FishingCatchReader::default();
    let clock = Instant::now();
    let mut tracker = FishingTracker::default();
    let mut previous = None;
    println!("Fishing reader ready: process_id={}", reader.process_id);
    loop {
        let (active, animation) = reader.sample()?;
        let caught = catches.poll(&reader, active)?;
        if let Some(item) = caught {
            println!("Caught item: {item}");
        }
        let sample = tracker.update(
            active,
            animation,
            clock.elapsed().as_millis() as u64,
            reader.process_id,
        );
        let transition = (active, animation, sample.phase, sample.tug);
        if previous != Some(transition) {
            println!(
                "t={:.2}s active={active} animation={animation:#x} phase={} elapsed_ms={} tug={:?}",
                clock.elapsed().as_secs_f64(),
                sample.phase,
                sample.elapsed_ms,
                sample.tug
            );
            previous = Some(transition);
        }
        if clock.elapsed() >= Duration::from_secs(seconds) {
            break;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    Ok(())
}
