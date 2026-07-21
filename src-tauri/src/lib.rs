/// Application entry point shared by the desktop binary (`main.rs`) and the
/// mobile entry point. This runs on every boot, so it must never panic — a
/// failed startup exits non-zero so the watchdog / Scheduled Task relaunches
/// NoniOS instead of leaving the end user on a bare Windows desktop
/// (see CLAUDE.md -> Reliability Architecture).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(error) = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
    {
        // Local-only diagnostics — never transmitted anywhere (no telemetry).
        eprintln!("fatal: NoniOS failed to start: {error}");
        std::process::exit(1);
    }
}
