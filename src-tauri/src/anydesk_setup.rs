//! AnyDesk integration for Admin -> Remote Access. Read-only on purpose: it only
//! locates an already-installed AnyDesk and asks it for this machine's ID
//! (`AnyDesk.exe --get-id`). It never downloads, installs, reads, stores or
//! sets the unattended-access password — that is managed in AnyDesk itself
//! (CLAUDE.md -> Screens -> Admin -> Remote Access; AGENTS.md -> Security).

/// Candidate install locations, in the order AnyDesk's own installer uses.
#[cfg(windows)]
fn candidate_paths() -> Vec<std::path::PathBuf> {
    use std::path::PathBuf;
    let mut paths = Vec::new();
    for var in ["ProgramFiles(x86)", "ProgramFiles"] {
        if let Some(base) = std::env::var_os(var) {
            paths.push(PathBuf::from(base).join("AnyDesk").join("AnyDesk.exe"));
        }
    }
    // Portable / per-user install.
    if let Some(base) = std::env::var_os("APPDATA") {
        paths.push(PathBuf::from(base).join("AnyDesk").join("AnyDesk.exe"));
    }
    paths
}

/// Returns this installation's AnyDesk ID (digits only, no spaces) if AnyDesk is
/// installed and answers `--get-id`; `None` otherwise. Never fails loudly — a
/// missing AnyDesk is a normal state the UI explains.
#[cfg(windows)]
pub fn get_id() -> Option<String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let exe = candidate_paths().into_iter().find(|path| path.is_file())?;
    let output = Command::new(exe)
        .arg("--get-id")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    normalise_id(&String::from_utf8_lossy(&output.stdout))
}

/// Dev-host stub — AnyDesk detection is Windows-only.
#[cfg(not(windows))]
pub fn get_id() -> Option<String> {
    None
}

/// Keeps only the digits of `--get-id`'s output; anything without digits (an
/// error message, an empty answer) is treated as "no ID".
#[cfg_attr(not(windows), allow(dead_code))]
fn normalise_id(raw: &str) -> Option<String> {
    let digits: String = raw.chars().filter(char::is_ascii_digit).collect();
    if digits.is_empty() {
        None
    } else {
        Some(digits)
    }
}

#[cfg(test)]
mod tests {
    use super::normalise_id;

    #[test]
    fn keeps_digits_only() {
        assert_eq!(normalise_id("528914673\r\n"), Some("528914673".into()));
        assert_eq!(normalise_id(" 528 914 673 "), Some("528914673".into()));
        assert_eq!(normalise_id("AnyDesk not running"), None);
        assert_eq!(normalise_id(""), None);
    }
}
