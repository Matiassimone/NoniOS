//! Web tiles (Telefe and any Admin-added URL) open in a child webview INSIDE the
//! main NoniOS window — never a separate window or a browser. The child sits
//! below a [`BAR_HEIGHT`] strip where the main webview shows one large bar
//! ("Atrás" / "Volver al inicio"), so the end user always has the way back in
//! front of them and NoniOS never loses its always-on-top, fullscreen lockdown.

use tauri::webview::PageLoadEvent;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Url, WebviewBuilder, WebviewUrl};

use crate::diag;

/// Label of the child webview. Shared with `close()`/`back()`.
pub const EXTERNAL_LABEL: &str = "external";

/// Height in logical pixels of the strip kept for the bar. Must match
/// `BAR_HEIGHT` in `src/screens/Home/InAppBar.tsx`.
pub const BAR_HEIGHT: f64 = 120.0;

/// Opens `url` in the child webview (replacing one that is already open).
pub fn open(app: &AppHandle, url: &str) -> Result<(), String> {
    let url = Url::parse(url).map_err(|error| error.to_string())?;
    close(app);

    let window = app
        .get_window("main")
        .ok_or_else(|| "main window missing".to_string())?;
    let scale = window.scale_factor().unwrap_or(1.0);
    let (width, height) = match window.inner_size() {
        Ok(size) => (size.width as f64 / scale, size.height as f64 / scale),
        // No size yet: fall back to the design canvas; the bar still works.
        Err(_) => (1920.0, 1080.0),
    };

    let builder = WebviewBuilder::new(EXTERNAL_LABEL, WebviewUrl::External(url))
        // Local-only breadcrumbs so a blank page on a test machine can be told
        // apart from a webview that never navigated (host only — nothing about
        // what the end user watched is recorded).
        .on_page_load(|_, payload| {
            let host = payload.url().host_str().unwrap_or("?").to_string();
            match payload.event() {
                PageLoadEvent::Started => diag::log(&format!("external page load started: {host}")),
                PageLoadEvent::Finished => {
                    diag::log(&format!("external page load finished: {host}"))
                }
            }
        });

    window
        .add_child(
            builder,
            LogicalPosition::new(0.0, BAR_HEIGHT),
            LogicalSize::new(width, (height - BAR_HEIGHT).max(200.0)),
        )
        .map(|_| ())
        .map_err(|error| error.to_string())
}

/// Closes the child webview if it exists. Idempotent.
pub fn close(app: &AppHandle) {
    if let Some(webview) = app.get_webview(EXTERNAL_LABEL) {
        let _ = webview.close();
    }
}

/// Browser-style back inside the child webview (the bar's "Atrás").
pub fn back(app: &AppHandle) {
    if let Some(webview) = app.get_webview(EXTERNAL_LABEL) {
        let _ = webview.eval("history.back()");
    }
}
