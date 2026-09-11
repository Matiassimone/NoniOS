//! Web tiles (Telefe and any Admin-added URL) open in a second NoniOS webview
//! window rather than a browser: fullscreen-sized, always on top, but shifted
//! down by [`BAR_HEIGHT`] so the main window's "Back to home" bar stays visible
//! above it. Closing that window is how the end user returns; the main window
//! never loses its lockdown.

use tauri::webview::PageLoadEvent;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};

use crate::diag;

/// Label of the external webview window. Shared with `lib.rs` (destroy event)
/// and `close()`.
pub const EXTERNAL_LABEL: &str = "external";

/// Height in logical pixels of the strip the main window keeps for its
/// "Back to home" bar. Must match `BAR_HEIGHT` in `src/screens/Home/InAppBar.tsx`.
pub const BAR_HEIGHT: f64 = 120.0;

/// Opens `url` in the external window (replacing one that is already open).
pub fn open(app: &AppHandle, url: &str) -> Result<(), String> {
    let url = Url::parse(url).map_err(|error| error.to_string())?;
    close(app);

    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "main window missing".to_string())?;
    let (width, height) = match main.current_monitor() {
        Ok(Some(monitor)) => {
            let scale = monitor.scale_factor();
            let size = monitor.size();
            (size.width as f64 / scale, size.height as f64 / scale)
        }
        // No monitor info: fall back to the design canvas; the window still
        // opens and can be closed from the bar.
        _ => (1920.0, 1080.0),
    };

    WebviewWindowBuilder::new(app, EXTERNAL_LABEL, WebviewUrl::External(url))
        .title("NoniOS")
        .decorations(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .position(0.0, BAR_HEIGHT)
        .inner_size(width, (height - BAR_HEIGHT).max(200.0))
        .focused(true)
        // Local-only breadcrumbs so a blank page on a test machine can be told
        // apart from a window that never navigated (the URL host only, no path
        // or query — nothing about what the end user watched is recorded).
        .on_page_load(|_, payload| {
            let host = payload.url().host_str().unwrap_or("?").to_string();
            match payload.event() {
                PageLoadEvent::Started => diag::log(&format!("external page load started: {host}")),
                PageLoadEvent::Finished => {
                    diag::log(&format!("external page load finished: {host}"))
                }
            }
        })
        .build()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

/// Closes the external window if it exists. Idempotent.
pub fn close(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(EXTERNAL_LABEL) {
        let _ = window.destroy();
    }
}
