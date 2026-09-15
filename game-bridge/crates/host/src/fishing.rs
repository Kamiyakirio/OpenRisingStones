//! Read-only fishing telemetry and a monotonic cast state machine.
//! Animation IDs follow the MIT Fishers-Intuition implementation; no game actions are sent.
use serde::Serialize;
#[path = "fishing_catch.rs"]
mod catch;
#[cfg(windows)]
#[path = "fishing_log.rs"]
mod log;
#[cfg(windows)]
pub use log::FishingCatchReader;

#[cfg(windows)]
#[path = "fishing_reader.rs"]
mod reader;
#[cfg(windows)]
pub use reader::FishingReader;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FishingSample {
    pub phase: &'static str,
    pub elapsed_ms: u64,
    pub tug: Option<&'static str>,
    pub process_id: u32,
    pub catch_item_id: Option<u32>,
    pub catch_sequence: u64,
    pub catch_available: bool,
}

#[derive(Default)]
pub struct FishingTracker {
    previous: Option<(bool, u16)>,
    started_at: Option<u64>,
    held_ms: u64,
    tug: Option<&'static str>,
    holding: bool,
}

impl FishingTracker {
    /// The first sample is a baseline: attaching mid-cast cannot reconstruct its start.
    pub fn update(
        &mut self,
        active: bool,
        animation: u16,
        now: u64,
        process_id: u32,
    ) -> FishingSample {
        let previous = self.previous.replace((active, animation));
        if !active {
            self.reset();
        } else if let Some((was_active, last_animation)) = previous {
            if !was_active || animation != last_animation {
                match animation {
                    0x112..=0x114 | 0xC49..=0xC4B => {
                        self.started_at = Some(now);
                        self.holding = false;
                        self.held_ms = 0;
                        self.tug = None;
                    }
                    0x124..=0x126 | 0x11B | 0xC52 => {
                        if let Some(start) = self.started_at {
                            if !self.holding {
                                self.held_ms = now.saturating_sub(start);
                                self.holding = true;
                                self.tug = match animation {
                                    0x124 => Some("light"),
                                    0x125 => Some("medium"),
                                    0x126 => Some("heavy"),
                                    _ => None,
                                };
                            }
                        }
                    }
                    0x111 | 0xC48 => self.reset(),
                    _ => (),
                }
            }
        }
        FishingSample {
            phase: if self.holding {
                "holding"
            } else if self.started_at.is_some() {
                "casting"
            } else {
                "idle"
            },
            elapsed_ms: if self.holding {
                self.held_ms
            } else {
                self.started_at
                    .map(|start| now.saturating_sub(start))
                    .unwrap_or(0)
            },
            tug: self.tug,
            process_id,
            catch_item_id: None,
            catch_sequence: 0,
            catch_available: false,
        }
    }

    fn reset(&mut self) {
        self.started_at = None;
        self.held_ms = 0;
        self.holding = false;
        self.tug = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cast_bite_hold_and_reset_use_monotonic_time() {
        let mut tracker = FishingTracker::default();
        tracker.update(false, 0, 0, 7);
        assert_eq!(tracker.update(true, 0x112, 100, 7).phase, "casting");
        assert_eq!(tracker.update(true, 0x112, 5100, 7).elapsed_ms, 5000);
        let bite = tracker.update(true, 0x125, 8100, 7);
        assert_eq!(bite.tug, Some("medium"));
        assert_eq!(bite.elapsed_ms, 8000);
        assert_eq!(tracker.update(true, 0x11B, 10100, 7), bite);
        assert_eq!(tracker.update(false, 0x11B, 11100, 7).phase, "idle");
    }
    #[test]
    fn attaching_mid_cast_waits_for_the_next_cast() {
        let mut tracker = FishingTracker::default();
        assert_eq!(tracker.update(true, 0x112, 0, 1).phase, "idle");
        assert_eq!(tracker.update(true, 0x124, 1000, 1).phase, "idle");
        assert_eq!(tracker.update(true, 0xC49, 2000, 1).phase, "casting");
        assert_eq!(tracker.update(true, 0x126, 5000, 1).tug, Some("heavy"));
        assert_eq!(tracker.update(true, 0xC48, 6000, 1).phase, "idle");
    }
}
