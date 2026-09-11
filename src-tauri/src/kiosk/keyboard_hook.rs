//! Low-level keyboard hook (`WH_KEYBOARD_LL`) that swallows the OS-navigation
//! key combinations an end user could otherwise use to escape the kiosk.
//!
//! It blocks ONLY these documented combinations and inspects nothing else — it
//! is a lockdown filter, never a keylogger (AGENTS.md -> Security):
//!   * the Windows keys (Start menu / Win+* shortcuts)
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

use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::mpsc;
use std::thread;

use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, VK_CONTROL, VK_ESCAPE, VK_F4, VK_LWIN, VK_RWIN, VK_TAB,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetMessageW, PostThreadMessageW, SetWindowsHookExW,
    TranslateMessage, UnhookWindowsHookEx, HC_ACTION, KBDLLHOOKSTRUCT, LLKHF_ALTDOWN, MSG,
    WH_KEYBOARD_LL, WM_KEYDOWN, WM_KEYUP, WM_QUIT, WM_SYSKEYDOWN, WM_SYSKEYUP,
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

/// Returns true only for the specific combinations NoniOS blocks.
fn should_block(vk: u32, alt_down: bool) -> bool {
    if vk == VK_LWIN.0 as u32 || vk == VK_RWIN.0 as u32 {
        return true;
    }
    if alt_down && (vk == VK_TAB.0 as u32 || vk == VK_F4.0 as u32 || vk == VK_ESCAPE.0 as u32) {
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
            let alt_down = (event.flags.0 & LLKHF_ALTDOWN.0) != 0;
            if should_block(event.vkCode, alt_down) {
                BLOCKED.fetch_add(1, Ordering::Relaxed);
                return LRESULT(1);
            }
        }
    }
    CallNextHookEx(None, code, wparam, lparam)
}
