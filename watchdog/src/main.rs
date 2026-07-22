//! NoniOS reliability watchdog.
//!
//! One of the two independent safety nets that keep NoniOS on screen (CLAUDE.md
//! -> Reliability Architecture). It is deliberately tiny, boring, and dependency
//! free: a single-shot check that exits immediately. The cadence (~every 60s)
//! comes from its own Scheduled Task, not an internal loop — there is no
//! long-running watchdog process that could itself hang or crash.
//!
//! Each run: if the NoniOS process is not present, ask the Task Scheduler to
//! start it (so it launches with the privileges/session its task defines), then
//! exit. Never panics — a panic here would defeat the safety net.

/// Case-insensitive image name of the NoniOS main process. Substring-matched so
/// it works whether the bundled binary is `nonios.exe` or `NoniOS.exe`.
const NONIOS_IMAGE: &str = "nonios.exe";

/// Scheduled Task that launches NoniOS. Kept in sync with the install script.
#[cfg(windows)]
const NONIOS_TASK: &str = "NoniOS";

/// Pure parse of `tasklist` output: true iff it names the NoniOS image.
/// Platform-independent so it is unit-testable on any dev host.
#[cfg_attr(not(windows), allow(dead_code))]
fn nonios_image_present(tasklist_stdout: &str) -> bool {
    tasklist_stdout.to_ascii_lowercase().contains(NONIOS_IMAGE)
}

#[cfg(windows)]
fn main() {
    use std::process::Command;

    // Is NoniOS running? `tasklist` filtered by image name keeps output tiny.
    // If tasklist itself can't run, assume NoniOS is down and relaunch: a
    // spurious relaunch is harmless (the task ignores a second instance),
    // whereas a missed relaunch strands the end user on bare Windows.
    let running = match Command::new("tasklist")
        .args(["/FI", "IMAGENAME eq nonios.exe", "/NH", "/FO", "CSV"])
        .output()
    {
        Ok(output) => nonios_image_present(&String::from_utf8_lossy(&output.stdout)),
        Err(_) => false,
    };

    if !running {
        // Start NoniOS via its Scheduled Task so it inherits that task's
        // privilege/session context. Errors are non-fatal — the next run
        // (~60s later) tries again.
        let _ = Command::new("schtasks")
            .args(["/Run", "/TN", NONIOS_TASK])
            .status();
    }
}

/// NoniOS ships on Windows only; the watchdog is a no-op elsewhere so the crate
/// still builds and tests on the dev host.
#[cfg(not(windows))]
fn main() {
    eprintln!("nonios-watchdog: no-op on non-Windows platforms");
}

#[cfg(test)]
mod tests {
    use super::nonios_image_present;

    #[test]
    fn detects_process_regardless_of_casing() {
        // A real tasklist CSV row for a running process.
        assert!(nonios_image_present(
            "\"nonios.exe\",\"4321\",\"Console\",\"1\",\"142,208 K\"\r\n"
        ));
        // The bundled exe may be capitalised as the product name.
        assert!(nonios_image_present(
            "\"NoniOS.exe\",\"4321\",\"Console\",\"1\",\"142,208 K\"\r\n"
        ));
    }

    #[test]
    fn reports_absent_when_no_match() {
        assert!(!nonios_image_present(
            "INFO: No tasks are running which match the specified criteria.\r\n"
        ));
        assert!(!nonios_image_present(""));
    }
}
