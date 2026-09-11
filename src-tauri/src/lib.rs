pub mod anydesk_setup;
pub mod config;
mod diag;
pub mod installed_apps;
pub mod kiosk;
pub mod launchers;

use tauri::{AppHandle, Emitter, Manager, WindowEvent};

use config::local_store::{self, ConfigEnvelope};
use config::Config;

/// Returns the local config plus whether this is the first boot (no config file
/// yet), in which case the frontend opens Admin instead of Home.
#[tauri::command]
fn get_config(app: AppHandle) -> ConfigEnvelope {
    local_store::load(&app)
}

/// Persists the config the frontend already validated with Zod.
#[tauri::command]
fn save_config(app: AppHandle, config: Config) -> Result<(), String> {
    local_store::save(&app, &config).map_err(|error| error.to_string())
}

/// Launches the tile with this id (CLAUDE.md -> Architecture Rule 2: the
/// frontend never builds a shell command itself).
#[tauri::command]
fn launch_tile(app: AppHandle, tile_id: String) -> Result<(), String> {
    let config = local_store::load(&app).config;
    let tile = config
        .tiles
        .iter()
        .find(|tile| tile.id == tile_id)
        .ok_or_else(|| format!("unknown tile '{tile_id}'"))?;
    diag::log(&format!(
        "launch_tile {tile_id} ({} / {})",
        tile.kind, tile.target_kind
    ));
    launchers::launch(&app, tile).map_err(|error| {
        diag::log(&format!("launch_tile {tile_id} failed: {error}"));
        error.to_string()
    })
}

/// Brings the kiosk back: closes the external web window if open, stops the
/// foreground watcher and re-asserts the main window. Used by the "Back to
/// home" bar and when F4 opens Admin while an app is in front.
#[tauri::command]
fn return_home(app: AppHandle) {
    launchers::webview_app::close(&app);
    kiosk::window_watcher::cancel(&app);
}

/// Start menu apps for the Admin picker and tile re-detection.
#[tauri::command]
fn list_installed_apps() -> Result<Vec<installed_apps::InstalledApp>, String> {
    installed_apps::list().map_err(|error| error.to_string())
}

/// This machine's AnyDesk ID, or `None` when AnyDesk isn't installed.
#[tauri::command]
fn get_anydesk_id() -> Option<String> {
    anydesk_setup::get_id()
}

/// Flips both reliability Scheduled Tasks together (see `kiosk::autostart`).
#[tauri::command]
fn set_autostart(enabled: bool) -> Result<(), String> {
    diag::log(&format!("set_autostart({enabled})"));
    kiosk::autostart::set_enabled(enabled).map_err(|error| error.to_string())
}

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
    diag::log(&format!(
        "exit_kiosk requested (keyboard hook blocked {} keystrokes this session)",
        kiosk::blocked_keystrokes()
    ));
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

/// CLI entry point for `nonios restore-shell` — shows the Windows taskbar again.
/// NoniOS restores it itself on a clean exit, but a force-killed NoniOS (Task
/// Manager, the smoke test, a crash without the watchdog relaunching) leaves it
/// hidden until explorer restarts; the uninstaller and the smoke test call this.
pub fn restore_shell_cli() {
    kiosk::restore_shell();
    println!("taskbar restored");
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
        .invoke_handler(tauri::generate_handler![
            exit_kiosk,
            get_config,
            save_config,
            set_autostart,
            list_installed_apps,
            get_anydesk_id,
            launch_tile,
            return_home
        ])
        .on_window_event(|window, event| {
            let is_main = window.label() == "main";
            match event {
                // The end user must never close the kiosk (Alt+F4, the hidden
                // window controls). Reliable, cross-platform half of Alt+F4
                // handling; the keyboard hook also swallows the keystroke.
                WindowEvent::CloseRequested { api, .. } if is_main => {
                    if !kiosk::ALLOW_USER_CLOSE {
                        api.prevent_close();
                    }
                }
                // The external web window going away — closed from the bar or
                // crashed — is the "app closed" signal for web tiles.
                WindowEvent::Destroyed
                    if window.label() == launchers::webview_app::EXTERNAL_LABEL =>
                {
                    let app = window.app_handle().clone();
                    // A replacement external window may already exist (tap on a
                    // web tile while another was open); then this is the OLD one
                    // going away, not the end user returning.
                    if app
                        .get_webview_window(launchers::webview_app::EXTERNAL_LABEL)
                        .is_none()
                    {
                        kiosk::window_watcher::restore_home(&app);
                        let _ = app.emit(kiosk::window_watcher::CLOSED_EVENT, ());
                    }
                }
                _ => {}
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
