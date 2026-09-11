// No console window on Windows — the watchdog runs unattended every minute and
// a flashing console would be visible on the kiosk. Diagnostics go to a log file.
#![cfg_attr(windows, windows_subsystem = "windows")]

//! NoniOS reliability watchdog.
//!
//! One of the two independent safety nets that keep NoniOS on screen (CLAUDE.md
//! -> Reliability Architecture). It is deliberately tiny, boring, and dependency
//! free: a single-shot check that exits immediately. The cadence (~every 60s)
//! comes from its own Scheduled Task, not an internal loop — there is no
//! long-running watchdog process that could itself hang or crash.
//!
//! Each run: if the administrator turned autostart off in NoniOS's config, do
//! nothing (so the switch works even when the Scheduled Tasks could not be
//! flipped). Otherwise, if NoniOS is hung ("Not responding"), kill it; then if
//! it is not running, ask the Task Scheduler to start it (so it launches with
//! the privileges/session its task defines). Never panics — a panic here would
//! defeat the safety net. Every run appends a line to
//! `%LOCALAPPDATA%\NoniOS\watchdog.log` (local only, never transmitted) so the
//! reliability chain can be diagnosed on a real machine.

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

/// Pure check of NoniOS's `config.json`: true only when it explicitly says
/// `"autostart": false`. Anything else — missing key, garbage, unreadable file —
/// counts as enabled, because a watchdog that stays silent by mistake strands
/// the end user, while one that relaunches by mistake is merely redundant.
///
/// Hand-rolled on purpose: this crate has zero dependencies (no serde), and the
/// key is a single boolean written by NoniOS itself.
#[cfg_attr(not(windows), allow(dead_code))]
fn autostart_disabled(config_json: &str) -> bool {
    let Some(index) = config_json.find("\"autostart\"") else {
        return false;
    };
    let rest = config_json[index + "\"autostart\"".len()..].trim_start();
    let Some(rest) = rest.strip_prefix(':') else {
        return false;
    };
    rest.trim_start().starts_with("false")
}

/// Local-only diagnostics log (`%LOCALAPPDATA%\NoniOS\watchdog.log`). Best-effort
/// and never transmitted anywhere (no telemetry; AGENTS.md -> Security).
#[cfg(windows)]
mod diag {
    use std::fs::{self, OpenOptions};
    use std::io::Write;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn log_path() -> Option<PathBuf> {
        let base = std::env::var_os("LOCALAPPDATA").map(PathBuf::from)?;
        Some(base.join("NoniOS").join("watchdog.log"))
    }

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
}

#[cfg(windows)]
fn main() {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    // Run child processes without their own console windows either.
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    // The administrator's "launch automatically" switch, mirrored from NoniOS's
    // own config so it holds even if the Scheduled Tasks could not be disabled
    // (e.g. NoniOS was running unelevated when the switch was flipped).
    if let Some(config) = std::env::var_os("APPDATA")
        .map(std::path::PathBuf::from)
        .map(|base| base.join("com.nonios.launcher").join("config.json"))
        .and_then(|path| std::fs::read_to_string(path).ok())
    {
        if autostart_disabled(&config) {
            diag::log("autostart is off in config.json; nothing to do");
            return;
        }
    }

    // `tasklist` filtered by image name keeps output tiny. If tasklist itself
    // can't run, assume NoniOS is down and relaunch: a spurious relaunch is
    // harmless (the task ignores a second instance), whereas a missed relaunch
    // strands the end user on bare Windows.
    let tasklist = |filters: &[&str]| -> Option<bool> {
        let mut command = Command::new("tasklist");
        for filter in filters {
            command.args(["/FI", filter]);
        }
        command
            .args(["/NH", "/FO", "CSV"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .ok()
            .map(|output| nonios_image_present(&String::from_utf8_lossy(&output.stdout)))
    };

    let running = match tasklist(&["IMAGENAME eq nonios.exe"]) {
        Some(present) => present,
        None => {
            diag::log("tasklist failed; assuming NoniOS down");
            false
        }
    };

    // A frozen NoniOS still "exists" but is just as useless to the end user as a
    // crashed one. Windows flags a GUI process whose main window stopped
    // pumping messages as "Not responding"; kill it so the relaunch below runs.
    let hung = running
        && tasklist(&["IMAGENAME eq nonios.exe", "STATUS eq NOT RESPONDING"]).unwrap_or(false);
    if hung {
        diag::log("NoniOS is not responding; terminating it");
        match Command::new("taskkill")
            .args(["/F", "/IM", "nonios.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
        {
            Ok(status) => diag::log(&format!("taskkill exited with {status}")),
            Err(error) => diag::log(&format!("taskkill failed to launch: {error}")),
        }
    } else if running {
        diag::log("NoniOS is running; nothing to do");
        return;
    }

    // Start NoniOS via its Scheduled Task so it inherits that task's
    // privilege/session context. Errors are non-fatal — the next run (~60s
    // later) tries again.
    diag::log("NoniOS not running; running task 'NoniOS'");
    match Command::new("schtasks")
        .args(["/Run", "/TN", NONIOS_TASK])
        .creation_flags(CREATE_NO_WINDOW)
        .status()
    {
        Ok(status) => diag::log(&format!("schtasks /Run exited with {status}")),
        Err(error) => diag::log(&format!("schtasks /Run failed to launch: {error}")),
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
    use super::{autostart_disabled, nonios_image_present};

    #[test]
    fn autostart_flag_is_only_honoured_when_explicitly_false() {
        assert!(autostart_disabled(
            r#"{"schemaVersion":1,"autostart": false,"tiles":[]}"#
        ));
        assert!(autostart_disabled("{\n  \"autostart\" :\n false\n}"));
        assert!(!autostart_disabled(r#"{"autostart":true}"#));
        assert!(!autostart_disabled(r#"{"user":{"name":"Noni"}}"#));
        assert!(!autostart_disabled("not json at all"));
        assert!(!autostart_disabled(""));
    }

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
