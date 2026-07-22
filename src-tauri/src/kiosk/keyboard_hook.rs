//! Low-level keyboard hook (`WH_KEYBOARD_LL`) that swallows the OS-navigation
//! key combinations an end user could otherwise use to escape the kiosk.
//!
//! It blocks ONLY these documented combinations and inspects nothing else — it
//! is a lockdown filter, never a keylogger (AGENTS.md -> Security):
//!   * the Windows keys (Start menu / Win+* shortcuts)
//!   * Alt+Tab (task switcher)
//!   * Alt+F4 (close window)
//!   * Ctrl+Esc (Start menu)
//!
//! The callback must stay trivial: Windows silently drops a low-level hook
//! whose proc takes longer than `LowLevelHooksTimeout` (~300 ms), so it does no
//! allocation, locking, or anything that can block or panic.

use std::ffi::c_void;
use std::sync::atomic::{AtomicIsize, Ordering};

use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, VK_CONTROL, VK_ESCAPE, VK_F4, VK_LWIN, VK_RWIN, VK_TAB,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, SetWindowsHookExW, UnhookWindowsHookEx, HC_ACTION, HHOOK, KBDLLHOOKSTRUCT,
    LLKHF_ALTDOWN, WH_KEYBOARD_LL, WM_KEYDOWN, WM_SYSKEYDOWN,
};

use super::KioskError;

/// The installed hook handle, stored as a raw pointer value so [`uninstall`]
/// can remove it. `0` means "no hook installed".
static HOOK_HANDLE: AtomicIsize = AtomicIsize::new(0);

/// Installs the global low-level keyboard hook. Idempotent enough for startup:
/// calling twice would leak the first hook, so callers install exactly once.
pub fn install() -> Result<(), KioskError> {
    // SAFETY: standard Win32 hook installation. `low_level_keyboard_proc` is a
    // plain function pointer with no captured state; the module handle is this
    // executable's own, valid for the process lifetime.
    unsafe {
        let module = GetModuleHandleW(None).map_err(|e| KioskError::KeyboardHook(e.to_string()))?;
        let hook = SetWindowsHookExW(
            WH_KEYBOARD_LL,
            Some(low_level_keyboard_proc),
            Some(HINSTANCE(module.0)),
            0,
        )
        .map_err(|e| KioskError::KeyboardHook(e.to_string()))?;
        HOOK_HANDLE.store(hook.0 as isize, Ordering::SeqCst);
    }
    Ok(())
}

/// Removes the keyboard hook if one is installed. No-op otherwise.
pub fn uninstall() -> Result<(), KioskError> {
    let raw = HOOK_HANDLE.swap(0, Ordering::SeqCst);
    if raw == 0 {
        return Ok(());
    }
    // SAFETY: `raw` came from a successful SetWindowsHookExW above and is
    // removed exactly once (the swap guarantees no double-unhook).
    unsafe {
        UnhookWindowsHookEx(HHOOK(raw as *mut c_void))
            .map_err(|e| KioskError::KeyboardHook(e.to_string()))?;
    }
    Ok(())
}

/// Returns true only for the specific combinations NoniOS blocks.
fn should_block(vk: u32, alt_down: bool) -> bool {
    if vk == VK_LWIN.0 as u32 || vk == VK_RWIN.0 as u32 {
        return true;
    }
    if alt_down && (vk == VK_TAB.0 as u32 || vk == VK_F4.0 as u32) {
        return true;
    }
    if vk == VK_ESCAPE.0 as u32 && ctrl_down() {
        return true;
    }
    false
}

fn ctrl_down() -> bool {
    // SAFETY: GetAsyncKeyState reads global key state; always safe to call. The
    // high bit means the key is currently down.
    unsafe { (GetAsyncKeyState(VK_CONTROL.0 as i32) as u16 & 0x8000) != 0 }
}

/// The hook procedure. Runs on the thread that installed the hook (the Tauri
/// main thread, which pumps messages). Returning `LRESULT(1)` swallows the
/// keystroke; anything else passes it along the hook chain.
unsafe extern "system" fn low_level_keyboard_proc(
    code: i32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    if code == HC_ACTION as i32 {
        let message = wparam.0 as u32;
        if message == WM_KEYDOWN || message == WM_SYSKEYDOWN {
            let event = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
            let alt_down = (event.flags.0 & LLKHF_ALTDOWN.0) != 0;
            if should_block(event.vkCode, alt_down) {
                return LRESULT(1);
            }
        }
    }
    CallNextHookEx(None, code, wparam, lparam)
}
