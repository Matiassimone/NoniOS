//! Enables/disables the two reliability Scheduled Tasks as a pair (CLAUDE.md ->
//! Admin -> General: "Launch NoniOS automatically when Windows starts").
//!
//! There is deliberately no state where the watchdog runs but the app's
//! at-logon task doesn't — a watchdog with nothing to restart is meaningless —
//! so both are flipped together. The tasks themselves are registered by
//! `scripts/install/Install-NoniOS.ps1`; this only toggles them.

use thiserror::Error;

/// Task names — kept in sync with `scripts/install/Install-NoniOS.ps1` and the
/// watchdog's `NONIOS_TASK`.
pub const TASK_NAMES: [&str; 2] = ["NoniOS", "NoniOS Watchdog"];

#[derive(Debug, Error)]
pub enum AutostartError {
    #[error("schtasks could not be started: {0}")]
    Spawn(String),
    #[error("schtasks /Change on '{task}' exited with {status}")]
    Failed { task: String, status: String },
}

/// Enables (or disables) both Scheduled Tasks. Requires the elevation the tasks
/// were registered with; NoniOS normally runs elevated via its own task.
#[cfg(windows)]
pub fn set_enabled(enabled: bool) -> Result<(), AutostartError> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let flag = if enabled { "/ENABLE" } else { "/DISABLE" };

    for task in TASK_NAMES {
        let status = Command::new("schtasks")
            .args(["/Change", "/TN", task, flag])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|error| AutostartError::Spawn(error.to_string()))?;
        if !status.success() {
            return Err(AutostartError::Failed {
                task: task.to_string(),
                status: status.to_string(),
            });
        }
    }
    Ok(())
}

/// Dev-host stub — Scheduled Tasks are Windows-only; the toggle still works in
/// the UI so the Admin flow can be exercised on the dev host.
#[cfg(not(windows))]
pub fn set_enabled(_enabled: bool) -> Result<(), AutostartError> {
    Ok(())
}
