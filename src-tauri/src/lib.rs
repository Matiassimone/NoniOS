pub mod kiosk;

use tauri::{Manager, WindowEvent};

/// Application entry point shared by the desktop binary (`main.rs`) and the
/// mobile entry point. This runs on every boot, so it must never panic — a
/// failed startup exits non-zero so the watchdog / Scheduled Task relaunches
/// NoniOS instead of leaving the end user on a bare Windows desktop
/// (see CLAUDE.md -> Reliability Architecture).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|_window, event| {
            // The end user must never be able to close the kiosk (Alt+F4, the
            // hidden window controls). This is the reliable, cross-platform half
            // of Alt+F4 handling; the keyboard hook also swallows the keystroke.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if !kiosk::ALLOW_USER_CLOSE {
                    api.prevent_close();
                }
            }
        })
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
            // Engage the OS lockdown. A failure here must NOT stop NoniOS from
            // showing — a visible NoniOS, even if not fully locked, beats a bare
            // Windows desktop the end user can't operate (Reliability principle).
            if let Err(error) = kiosk::engage() {
                // Local-only diagnostics — never transmitted anywhere.
                eprintln!("warning: kiosk lockdown did not fully engage: {error}");
            }
            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(error) = result {
        eprintln!("fatal: NoniOS failed to start: {error}");
        std::process::exit(1);
    }
}
