//! Win32 kiosk-lockdown layer.
//!
//! Every call into the OS to lock the machine down (hiding the taskbar,
//! hooking the keyboard, later: the F4 admin hotkey and the window watcher)
//! lives under this module and nowhere else — so a reviewer deciding whether to
//! install NoniOS on a relative's computer can read "what can this binary do to
//! the OS" in one place (CLAUDE.md -> Architecture Rules & Coding Agent).
//!
//! All of it is Windows-only. On a non-Windows dev host every entry point is a
//! no-op so the crate still builds, lints, and tests there.

// The F4 hotkey uses Tauri's cross-platform global-shortcut plugin (not Win32),
// so unlike the rest of kiosk/ it is available on the dev host too.
pub mod admin_hotkey;
// Autologon is Windows-only but exposes no-op-erroring stubs off Windows so the
// crate still builds on the dev host.
pub mod autologon;
// Scheduled Task toggle; Windows-only body with a dev-host no-op.
pub mod autostart;
#[cfg(windows)]
mod keyboard_hook;
#[cfg(windows)]
mod taskbar;
// Foreground watcher for launched apps; Windows body + dev-host simulation.
pub mod window_watcher;

use thiserror::Error;

/// Errors from engaging or releasing the kiosk lockdown. Never panics on the
/// startup path — callers log and continue so a lockdown failure can't stop
/// NoniOS from showing (CLAUDE.md -> Reliability principle).
#[derive(Debug, Error)]
pub enum KioskError {
    #[cfg(windows)]
    #[error("keyboard hook: {0}")]
    KeyboardHook(String),
}

/// Whether the end user is ever allowed to close the NoniOS window. Always
/// false: Alt+F4 and the (hidden) window controls must not exit the kiosk.
/// Read by the `CloseRequested` handler in `lib.rs`.
pub const ALLOW_USER_CLOSE: bool = false;

/// Engages the OS lockdown: hides the Windows taskbar and installs the
/// low-level keyboard hook that swallows the OS escape combinations
/// (Win, Alt+Tab, Alt+Esc, Ctrl+Esc, Ctrl+Shift+Esc, Alt+F4). Call once, at startup.
///
/// Note the limits: Ctrl+Alt+Del and Win+L are Secure Attention Sequences the
/// kernel owns — a user-mode hook cannot block them; that requires machine
/// policy applied at install time, out of scope here.
#[cfg(windows)]
pub fn engage() -> Result<(), KioskError> {
    taskbar::hide();
    keyboard_hook::install()?;
    Ok(())
}

/// Releases the lockdown: removes the keyboard hook and restores the taskbar.
/// Used only when NoniOS is intentionally torn down (uninstall/maintenance),
/// never in normal use.
#[cfg(windows)]
pub fn disengage() -> Result<(), KioskError> {
    keyboard_hook::uninstall()?;
    taskbar::show();
    Ok(())
}

/// Shows the taskbar without touching anything else — for the `restore-shell`
/// CLI subcommand, run from a process that never engaged the lockdown.
#[cfg(windows)]
pub fn restore_shell() {
    taskbar::show();
}

/// Dev-host stub — see the Windows [`restore_shell`].
#[cfg(not(windows))]
pub fn restore_shell() {}

/// Dev-host stub — NoniOS's kiosk lockdown is Windows-only.
#[cfg(not(windows))]
pub fn engage() -> Result<(), KioskError> {
    Ok(())
}

/// Dev-host stub — see [`engage`].
#[cfg(not(windows))]
pub fn disengage() -> Result<(), KioskError> {
    Ok(())
}
