//! The hidden F4 admin hotkey.
//!
//! F4 (no modifiers) toggles between Home and Admin. It is deliberately NOT in
//! the keyboard hook's block list, so the keystroke passes through to the
//! global shortcut registered here. Registration lives in `kiosk/` because it
//! is a lockdown/OS-integration concern (CLAUDE.md -> Architecture Rules), but
//! unlike the rest of `kiosk/` it uses Tauri's maintained global-shortcut
//! plugin rather than raw Win32, so it also works on the dev host.

use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut, ShortcutState};

/// Event pulsed to the webview on each F4 press. The frontend toggles between
/// Home and Admin when it receives this.
pub const ADMIN_HOTKEY_EVENT: &str = "admin-hotkey";

/// Registers F4 as a global shortcut. Idempotent per process — call once at
/// startup. Errors are returned so the caller can log them; a registration
/// failure must never panic the startup path.
pub fn register(app: &AppHandle) -> Result<(), String> {
    let f4 = Shortcut::new(None, Code::F4);
    app.global_shortcut()
        .on_shortcut(f4, |app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                // Diagnostics: proves on a test machine whether the keyboard hook
                // is seeing input at all (see `kiosk::blocked_keystrokes`).
                crate::diag::log(&format!(
                    "F4 pressed (keyboard hook has blocked {} keystrokes so far)",
                    super::blocked_keystrokes()
                ));
                // Fire-and-forget: a failed emit is one missed toggle, not a crash.
                let _ = app.emit(ADMIN_HOTKEY_EVENT, ());
            }
        })
        .map_err(|error| error.to_string())
}
