//! Starts an installed Windows app: a Store/Start-menu app by AppID
//! (`explorer.exe shell:AppsFolder\<AppID>` — the same id `installed_apps.rs`
//! reports) or a classic executable by path.

/// Launches `target` using the strategy named by `target_kind` (`"aumid"` or
/// `"exe"`). Returns as soon as the process is spawned; whether a window
/// actually appears is the watcher's concern.
#[cfg(windows)]
pub fn launch(target: &str, target_kind: &str) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let mut command = match target_kind {
        "aumid" => {
            let mut c = Command::new("explorer.exe");
            c.arg(format!("shell:AppsFolder\\{target}"));
            c
        }
        "exe" => Command::new(target),
        other => return Err(format!("unknown target kind '{other}'")),
    };
    command
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

/// Dev-host stub: pretends the app started so the Home state machine can be
/// exercised end to end (the watcher stub then simulates the app's lifetime).
#[cfg(not(windows))]
pub fn launch(_target: &str, target_kind: &str) -> Result<(), String> {
    match target_kind {
        "aumid" | "exe" => Ok(()),
        other => Err(format!("unknown target kind '{other}'")),
    }
}
