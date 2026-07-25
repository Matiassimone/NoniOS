mod diag;
pub mod kiosk;

use tauri::{AppHandle, Manager, WindowEvent};

/// Leaves kiosk mode so the administrator can reach the real Windows desktop
/// (Task Manager, Windows Update, debugging) without fighting the always-on-top
/// window or the keyboard hook. Restores the taskbar and removes the keyboard
/// hook first, then exits the process.
///
/// This is a *deliberate pause*, not a permanent way out: if autostart is
/// enabled, the watchdog relaunches NoniOS within its interval. Invoked from
/// Admin's "Cerrar NoniOS" button, which the end user reaches only via F4 — a
/// global hotkey that works even when the window is holding focus.
#[tauri::command]
fn exit_kiosk(app: AppHandle) {
    diag::log("exit_kiosk requested");
    if let Err(error) = kiosk::disengage() {
        diag::log(&format!("kiosk disengage on exit failed: {error}"));
    }
    app.exit(0);
}

/// CLI entry point for `nonios configure-autologon <domain> <username>`,
/// invoked by the installer so autologon is set up by the product itself (no
/// separate tool). The password is read from stdin — never an argument (which
/// would be visible in the process list) — and stored only as an LSA secret by
/// [`kiosk::autologon`]. It is never logged.
pub fn autologon_cli() {
    let args: Vec<String> = std::env::args().collect();
    let domain = args.get(2).map(String::as_str).unwrap_or("");
    let username = args.get(3).map(String::as_str).unwrap_or("");
    if username.is_empty() {
        eprintln!("usage: nonios configure-autologon <domain> <username>  (password on stdin)");
        std::process::exit(2);
    }

    let mut password = String::new();
    if std::io::stdin().read_line(&mut password).is_err() {
        eprintln!("configure-autologon: failed to read the password from stdin");
        std::process::exit(1);
    }
    let password = password.trim_end_matches(['\r', '\n']);

    match kiosk::autologon::configure(domain, username, password) {
        Ok(()) => println!("autologon configured for {domain}\\{username}"),
        Err(error) => {
            eprintln!("configure-autologon failed: {error}");
            std::process::exit(1);
        }
    }
}

/// CLI entry point for `nonios disable-autologon` — clears autologon and the
/// stored password secret. Used by the uninstaller.
pub fn autologon_disable_cli() {
    match kiosk::autologon::disable() {
        Ok(()) => println!("autologon disabled"),
        Err(error) => {
            eprintln!("disable-autologon failed: {error}");
            std::process::exit(1);
        }
    }
}

/// Application entry point shared by the desktop binary (`main.rs`) and the
/// mobile entry point. This runs on every boot, so it must never panic — a
/// failed startup exits non-zero so the watchdog / Scheduled Task relaunches
/// NoniOS instead of leaving the end user on a bare Windows desktop
/// (see CLAUDE.md -> Reliability Architecture).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![exit_kiosk])
        .on_window_event(|_window, event| {
            // The end user must never close the kiosk (Alt+F4, the hidden window
            // controls). Reliable, cross-platform half of Alt+F4 handling; the
            // keyboard hook also swallows the keystroke.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if !kiosk::ALLOW_USER_CLOSE {
                    api.prevent_close();
                }
            }
        })
        .setup(|app| {
            diag::log("NoniOS starting");
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
            // Engage the OS lockdown. A failure here must NOT stop NoniOS from
            // showing — a visible NoniOS, even if not fully locked, beats a bare
            // Windows desktop the end user can't operate (Reliability principle).
            match kiosk::engage() {
                Ok(()) => diag::log("kiosk lockdown engaged"),
                Err(error) => diag::log(&format!("kiosk lockdown did NOT fully engage: {error}")),
            }
            // Register the hidden F4 hotkey (Home <-> Admin). Also non-fatal.
            match kiosk::admin_hotkey::register(app.handle()) {
                Ok(()) => diag::log("F4 admin hotkey registered"),
                Err(error) => diag::log(&format!("F4 admin hotkey NOT registered: {error}")),
            }
            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(error) = result {
        diag::log(&format!("FATAL: NoniOS failed to start: {error}"));
        eprintln!("fatal: NoniOS failed to start: {error}");
        std::process::exit(1);
    }
}
