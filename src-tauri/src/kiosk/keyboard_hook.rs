//! Low-level keyboard hook (`WH_KEYBOARD_LL`) that swallows the OS-navigation
//! key combinations an end user could otherwise use to escape the kiosk.
//!
//! It blocks ONLY these documented combinations and inspects nothing else — it
//! is a lockdown filter, never a keylogger (AGENTS.md -> Security):
//!   * the Windows keys (Start menu / Win+* shortcuts) — best-effort here; a
//!     low-level hook does not receive the Windows key in every session (RDP,
//!     some VMs), so the installer ALSO disables it at the driver level via a
//!     Scancode Map (see scripts/install/Install-NoniOS.ps1). Two layers.
//!   * Alt+Tab and Alt+Esc (window switching)
//!   * Alt+F4 (close window)
//!   * Ctrl+Esc (Start menu) — which also covers Ctrl+Shift+Esc (Task Manager)
//!
//! ## Why a dedicated thread
//!
//! A `WH_KEYBOARD_LL` callback is dispatched on the thread that installed the
//! hook, and ONLY while that thread pumps its message queue. Installing on the
//! Tauri main thread is unreliable — its event loop does not guarantee the hook
//! callback ever fires (observed in testing: the hook installed but no keys were
//! intercepted). So we own a dedicated thread that installs the hook and runs a
//! plain `GetMessage` loop, which is the canonical way to run a global LL hook.
//!
//! The callback itself must stay trivial: Windows silently drops a low-level
//! hook whose proc runs longer than `LowLevelHooksTimeout` (~300 ms), so it does
//! no allocation, locking, or anything that can block or panic.

use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::mpsc;
use std::thread;

use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    VK_CONTROL, VK_ESCAPE, VK_F4, VK_LCONTROL, VK_LMENU, VK_LWIN, VK_MENU, VK_RCONTROL, VK_RMENU,
    VK_RWIN, VK_TAB,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetMessageW, PostThreadMessageW, SetWindowsHookExW,
    TranslateMessage, UnhookWindowsHookEx, HC_ACTION, KBDLLHOOKSTRUCT, MSG, WH_KEYBOARD_LL,
    WM_KEYDOWN, WM_KEYUP, WM_QUIT, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

use super::KioskError;

/// Thread id of the dedicated hook thread, so [`uninstall`] can post `WM_QUIT`
/// to it. `0` means no hook thread is running.
static HOOK_THREAD_ID: AtomicU32 = AtomicU32::new(0);

/// Keystrokes swallowed so far. A relaxed atomic increment is the only thing the
/// hook procedure does besides the block decision — no allocation, no locking.
static BLOCKED: AtomicU32 = AtomicU32::new(0);

/// How many keystrokes the hook has blocked since it was installed.
pub fn blocked_count() -> u32 {
    BLOCKED.load(Ordering::Relaxed)
}

/// Ctrl / Alt state tracked from the hook stream itself, updated on every key
/// event the hook sees. More reliable than `GetAsyncKeyState` or the
/// `LLKHF_ALTDOWN` flag, which are inconsistent for injected input and across
/// sessions — a kiosk lock must not depend on either.
static CTRL_DOWN: AtomicBool = AtomicBool::new(false);
static ALT_DOWN: AtomicBool = AtomicBool::new(false);

/// Installs the global low-level keyboard hook on a dedicated thread and blocks
/// until that thread reports whether installation succeeded.
pub fn install() -> Result<(), KioskError> {
    let (report_tx, report_rx) = mpsc::channel::<Result<(), String>>();
    thread::Builder::new()
        .name("nonios-kbd-hook".into())
        .spawn(move || hook_thread_main(report_tx))
        .map_err(|error| KioskError::KeyboardHook(format!("spawn hook thread: {error}")))?;

    match report_rx.recv() {
        Ok(Ok(())) => Ok(()),
        Ok(Err(message)) => Err(KioskError::KeyboardHook(message)),
        Err(error) => Err(KioskError::KeyboardHook(format!(
            "hook thread exited before reporting: {error}"
        ))),
    }
}

/// Removes the keyboard hook by asking its thread to quit. No-op if none is
/// installed. The hook is also released automatically when the process exits.
pub fn uninstall() -> Result<(), KioskError> {
    let thread_id = HOOK_THREAD_ID.swap(0, Ordering::SeqCst);
    if thread_id == 0 {
        return Ok(());
    }
    // SAFETY: posting WM_QUIT to the hook thread ends its GetMessage loop, which
    // then calls UnhookWindowsHookEx.
    unsafe {
        PostThreadMessageW(thread_id, WM_QUIT, WPARAM(0), LPARAM(0))
            .map_err(|error| KioskError::KeyboardHook(error.to_string()))?;
    }
    Ok(())
}

/// Body of the dedicated hook thread: install the hook, report the result, then
/// pump messages until `WM_QUIT`, then unhook.
fn hook_thread_main(report: mpsc::Sender<Result<(), String>>) {
    // SAFETY: standard Win32 hook installation followed by a message loop on the
    // installing thread — the loop is what dispatches the hook callback.
    unsafe {
        let module = match GetModuleHandleW(None) {
            Ok(module) => module,
            Err(error) => {
                let _ = report.send(Err(error.to_string()));
                return;
            }
        };
        let hook = match SetWindowsHookExW(
            WH_KEYBOARD_LL,
            Some(low_level_keyboard_proc),
            Some(HINSTANCE(module.0)),
            0,
        ) {
            Ok(hook) => hook,
            Err(error) => {
                let _ = report.send(Err(error.to_string()));
                return;
            }
        };

        HOOK_THREAD_ID.store(GetCurrentThreadId(), Ordering::SeqCst);
        let _ = report.send(Ok(()));

        let mut message = MSG::default();
        while GetMessageW(&mut message, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&message);
            DispatchMessageW(&message);
        }

        let _ = UnhookWindowsHookEx(hook);
        HOOK_THREAD_ID.store(0, Ordering::SeqCst);
    }
}

/// Updates [`CTRL_DOWN`]/[`ALT_DOWN`] when the event is a modifier key. Returns
/// whether the key was a modifier (those are never blocked themselves).
fn track_modifier(vk: u32, is_down: bool) {
    let ctrl =
        vk == VK_CONTROL.0 as u32 || vk == VK_LCONTROL.0 as u32 || vk == VK_RCONTROL.0 as u32;
    let alt = vk == VK_MENU.0 as u32 || vk == VK_LMENU.0 as u32 || vk == VK_RMENU.0 as u32;
    if ctrl {
        CTRL_DOWN.store(is_down, Ordering::Relaxed);
    }
    if alt {
        ALT_DOWN.store(is_down, Ordering::Relaxed);
    }
}

/// Pure block decision, given the modifier state. Unit-tested; the hook proc
/// calls [`should_block`], which reads the self-tracked atomics.
fn should_block_with(vk: u32, ctrl: bool, alt: bool) -> bool {
    if vk == VK_LWIN.0 as u32 || vk == VK_RWIN.0 as u32 {
        return true;
    }
    if alt && (vk == VK_TAB.0 as u32 || vk == VK_F4.0 as u32 || vk == VK_ESCAPE.0 as u32) {
        return true;
    }
    if ctrl && vk == VK_ESCAPE.0 as u32 {
        return true;
    }
    false
}

/// Block decision using the self-tracked Ctrl/Alt state.
fn should_block(vk: u32) -> bool {
    should_block_with(
        vk,
        CTRL_DOWN.load(Ordering::Relaxed),
        ALT_DOWN.load(Ordering::Relaxed),
    )
}

/// The hook procedure. Returning `LRESULT(1)` swallows the keystroke; anything
/// else passes it along the hook chain. Blocks on both key-down and key-up so a
/// blocked key never reaches the OS as a complete press.
unsafe extern "system" fn low_level_keyboard_proc(
    code: i32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    if code == HC_ACTION as i32 {
        let message = wparam.0 as u32;
        let is_key = matches!(message, WM_KEYDOWN | WM_SYSKEYDOWN | WM_KEYUP | WM_SYSKEYUP);
        if is_key {
            let event = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
            let is_down = matches!(message, WM_KEYDOWN | WM_SYSKEYDOWN);
            track_modifier(event.vkCode, is_down);
            if should_block(event.vkCode) {
                BLOCKED.fetch_add(1, Ordering::Relaxed);
                return LRESULT(1);
            }
        }
    }
    CallNextHookEx(None, code, wparam, lparam)
}

#[cfg(test)]
mod tests {
    use super::should_block_with;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        VK_A, VK_ESCAPE, VK_F4, VK_LWIN, VK_RWIN, VK_TAB,
    };

    fn vk(k: windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY) -> u32 {
        k.0 as u32
    }

    #[test]
    fn blocks_the_windows_keys_regardless_of_modifiers() {
        assert!(should_block_with(vk(VK_LWIN), false, false));
        assert!(should_block_with(vk(VK_RWIN), true, true));
    }

    #[test]
    fn blocks_alt_combinations_only_with_alt_down() {
        assert!(should_block_with(vk(VK_TAB), false, true));
        assert!(should_block_with(vk(VK_F4), false, true));
        assert!(should_block_with(vk(VK_ESCAPE), false, true)); // Alt+Esc
        assert!(!should_block_with(vk(VK_TAB), false, false));
        assert!(!should_block_with(vk(VK_F4), true, false));
    }

    #[test]
    fn blocks_ctrl_esc_only_with_ctrl_down() {
        assert!(should_block_with(vk(VK_ESCAPE), true, false)); // Ctrl+Esc
        assert!(!should_block_with(vk(VK_ESCAPE), false, false)); // bare Esc passes
    }

    #[test]
    fn lets_ordinary_keys_through() {
        assert!(!should_block_with(vk(VK_A), true, true));
        assert!(!should_block_with(vk(VK_F4), false, false)); // bare F4 = Admin hotkey
    }
}
