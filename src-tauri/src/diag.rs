//! Local-only diagnostics log.
//!
//! Writes timestamped lines to `%LOCALAPPDATA%\NoniOS\nonios.log` so the
//! reliability chain (startup, kiosk lockdown, hotkey registration) can be
//! inspected on a real machine where stderr isn't visible. It is strictly
//! local — never transmitted anywhere (no telemetry; AGENTS.md -> Security).
//! Best-effort: any failure is ignored, since diagnostics must never affect
//! whether NoniOS runs. On platforms without `LOCALAPPDATA` (the dev host) it
//! is simply a no-op.

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn log_path() -> Option<PathBuf> {
    let base = std::env::var_os("LOCALAPPDATA").map(PathBuf::from)?;
    Some(base.join("NoniOS").join("nonios.log"))
}

/// Appends a timestamped line (Unix epoch seconds) to the local diagnostics log.
pub fn log(message: &str) {
    let Some(path) = log_path() else {
        return;
    };
    if let Some(dir) = path.parent() {
        let _ = fs::create_dir_all(dir);
    }
    let epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(file, "[{epoch}] {message}");
    }
}
