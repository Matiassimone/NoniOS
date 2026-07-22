//! Show/hide the Windows shell taskbar (`Shell_TrayWnd`).
//!
//! NoniOS runs as a fullscreen, always-on-top window, which already covers the
//! taskbar; hiding it is belt-and-suspenders so a momentary focus change can't
//! flash it. Because the fullscreen window is the real guarantee, hiding is
//! best-effort and infallible — if the taskbar window can't be found there is
//! simply nothing to hide.
//!
//! We deliberately do NOT kill `explorer.exe` — that breaks file dialogs and
//! other shell services and is far more fragile than hiding one window. Only
//! the primary monitor's taskbar is handled; multi-monitor setups
//! (`Shell_SecondaryTrayWnd`) are out of scope for the single-display kiosk.

use windows::core::w;
use windows::Win32::UI::WindowsAndMessaging::{FindWindowW, ShowWindow, SW_HIDE, SW_SHOW};

/// Hides the primary taskbar. No-op if the taskbar window isn't present.
pub fn hide() {
    set_visible(false);
}

/// Restores the primary taskbar (see [`super::disengage`]).
pub fn show() {
    set_visible(true);
}

fn set_visible(visible: bool) {
    // SAFETY: FindWindowW looks up a well-known shell window by class name and
    // ShowWindow toggles its visibility. Both are safe with valid arguments; an
    // absent taskbar yields an invalid handle we bail out on.
    unsafe {
        let taskbar = match FindWindowW(w!("Shell_TrayWnd"), None) {
            Ok(hwnd) if !hwnd.is_invalid() => hwnd,
            _ => return,
        };
        let _ = ShowWindow(taskbar, if visible { SW_SHOW } else { SW_HIDE });
    }
}
