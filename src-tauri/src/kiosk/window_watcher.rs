//! Follows an external app the end user launched and tells the frontend when
//! it is in front (`external-app-shown`) and when it is gone
//! (`external-app-closed`), so Home can move launching -> inApp -> returning
//! without timers (CLAUDE.md -> Screens -> Home).
//!
//! Mechanism: poll `GetForegroundWindow`. Phase 1 waits for a window that is
//! not NoniOS's own to take the foreground (or gives up after
//! [`LAUNCH_TIMEOUT`]). Phase 2 then waits for the foreground to come back to
//! NoniOS or to the desktop shell (`Progman`/`WorkerW`, or no window at all)
//! for [`SETTLE`] — i.e. the app closed, crashed, or was minimised — and
//! restores NoniOS's always-on-top + focus.
//!
//! NoniOS itself stays fullscreen *behind* the app the whole time (only
//! always-on-top is dropped), so a watcher failure can never expose the desktop.

use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

use crate::diag;

pub const SHOWN_EVENT: &str = "external-app-shown";
pub const CLOSED_EVENT: &str = "external-app-closed";

/// How long the app may take to show a window before we give up and return.
pub const LAUNCH_TIMEOUT: Duration = Duration::from_secs(20);
/// How long the foreground must stay on NoniOS/the shell to count as "closed".
pub const SETTLE: Duration = Duration::from_millis(1000);
#[cfg(windows)]
const POLL: Duration = Duration::from_millis(250);

/// Bumped by every `watch`/`cancel`; a running watcher exits when it changes.
static GENERATION: AtomicU64 = AtomicU64::new(0);

/// Drops always-on-top so the app about to be launched can come to the front.
pub fn prepare_for_external(app: &AppHandle) {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_always_on_top(false);
    }
}

/// Re-asserts the kiosk window: always on top and focused. Called when the
/// external app is gone and by `return_home`.
pub fn restore_home(app: &AppHandle) {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_always_on_top(true);
        let _ = main.unminimize();
        let _ = main.set_focus();
    }
}

/// Stops any running watcher (without emitting) and restores the kiosk window.
pub fn cancel(app: &AppHandle) {
    GENERATION.fetch_add(1, Ordering::SeqCst);
    restore_home(app);
}

/// Tells the frontend an external surface is in front (used by web tiles, whose
/// window NoniOS creates itself).
pub fn notify_shown(app: &AppHandle) {
    emit(app, SHOWN_EVENT);
}

fn emit(app: &AppHandle, event: &str) {
    if let Err(error) = app.emit(event, ()) {
        diag::log(&format!("watcher emit {event} failed: {error}"));
    }
}

/// Starts following the app that was just launched. Any previous watcher is
/// superseded.
#[cfg(windows)]
pub fn watch(app: AppHandle) {
    let generation = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    let Some(main) = app.get_webview_window("main") else {
        return;
    };
    let Ok(own) = main.hwnd() else {
        emit(&app, CLOSED_EVENT);
        return;
    };
    let own_ptr = own.0 as isize;
    let thread_app = app.clone();

    thread::Builder::new()
        .name("nonios-window-watcher".into())
        .spawn(move || {
            let app = thread_app;
            let still_current = || GENERATION.load(Ordering::SeqCst) == generation;

            // Phase 1: wait for a foreign foreground window.
            let mut waited = Duration::ZERO;
            loop {
                if !still_current() {
                    return;
                }
                if win32::foreground_is_foreign_app(own_ptr) {
                    break;
                }
                if waited >= LAUNCH_TIMEOUT {
                    diag::log("watcher: app never showed a window; returning home");
                    restore_home(&app);
                    emit(&app, CLOSED_EVENT);
                    return;
                }
                thread::sleep(POLL);
                waited += POLL;
            }
            emit(&app, SHOWN_EVENT);

            // Phase 2: wait for the foreground to settle back on us / the shell.
            let mut settled = Duration::ZERO;
            loop {
                if !still_current() {
                    return;
                }
                if win32::foreground_is_foreign_app(own_ptr) {
                    settled = Duration::ZERO;
                } else {
                    settled += POLL;
                    if settled >= SETTLE {
                        break;
                    }
                }
                thread::sleep(POLL);
            }
            if still_current() {
                restore_home(&app);
                emit(&app, CLOSED_EVENT);
            }
        })
        .map(|_| ())
        .unwrap_or_else(|error| {
            diag::log(&format!("watcher thread spawn failed: {error}"));
            restore_home(&app);
            emit(&app, CLOSED_EVENT);
        });
}

#[cfg(windows)]
mod win32 {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{GetClassNameW, GetForegroundWindow};

    /// True when the foreground window is neither NoniOS's own nor the desktop
    /// shell — i.e. some other application is in front.
    pub fn foreground_is_foreign_app(own_ptr: isize) -> bool {
        // SAFETY: GetForegroundWindow/GetClassNameW read global window state
        // and are always safe to call; a null HWND is handled explicitly.
        unsafe {
            let hwnd: HWND = GetForegroundWindow();
            if hwnd.is_invalid() || hwnd.0 as isize == own_ptr {
                return false;
            }
            let mut buffer = [0u16; 64];
            let len = GetClassNameW(hwnd, &mut buffer);
            if len <= 0 {
                return true;
            }
            let class = String::from_utf16_lossy(&buffer[..len as usize]);
            !matches!(class.as_str(), "Progman" | "WorkerW" | "Shell_TrayWnd")
        }
    }
}

/// Dev-host stub: simulates an app that appears after 1.5 s and closes 3 s
/// later, so Home's launching -> inApp -> returning flow can be exercised on
/// the dev host. Still honours cancellation.
#[cfg(not(windows))]
pub fn watch(app: AppHandle) {
    let generation = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(1500));
        if GENERATION.load(Ordering::SeqCst) != generation {
            return;
        }
        emit(&app, SHOWN_EVENT);
        thread::sleep(Duration::from_millis(3000));
        if GENERATION.load(Ordering::SeqCst) != generation {
            return;
        }
        restore_home(&app);
        emit(&app, CLOSED_EVENT);
    });
}
