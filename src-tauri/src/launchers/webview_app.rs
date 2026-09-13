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
pub const BAR_HEIGHT: f64 = 72.0;

/// WebView2 flag that lets the focused video autoplay WITH sound (no user
/// gesture). Only applied to focus-video tiles, so ordinary web tiles keep the
/// default policy.
const AUTOPLAY_ARGS: &str = "--autoplay-policy=no-user-gesture-required";

/// Injected at document start on focus-video tiles. It does NOT alter the page's
/// structure (which would break the player) — it drops a black backdrop over the
/// whole page and lifts the largest `<video>` above it, full screen, unmuted and
/// playing. Re-applies on a timer and on DOM changes, since the player element
/// is created and sometimes replaced after load (ads, quality switches).
const FOCUS_VIDEO_SCRIPT: &str = r#"
(function () {
  var BACKDROP_Z = 2147483646, VIDEO_Z = 2147483647;
  function ensureBackdrop() {
    var b = document.getElementById('noni-focus-backdrop');
    if (!b) {
      b = document.createElement('div');
      b.id = 'noni-focus-backdrop';
      b.style.cssText = 'position:fixed;inset:0;background:#000;z-index:' + BACKDROP_Z + ';';
      (document.body || document.documentElement).appendChild(b);
    }
  }
  function biggestVideo() {
    var best = null, bestArea = 0;
    var vids = document.getElementsByTagName('video');
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i], r = v.getBoundingClientRect();
      var area = Math.max(r.width, v.videoWidth || 0) * Math.max(r.height, v.videoHeight || 0);
      if (area >= bestArea) { bestArea = area; best = v; }
    }
    return best;
  }
  function apply() {
    try {
      var v = biggestVideo();
      if (!v) return;
      ensureBackdrop();
      v.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;' +
        'background:#000;z-index:' + VIDEO_Z + ';pointer-events:none;';
      try { v.muted = false; v.volume = 1; } catch (e) {}
      if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      document.documentElement.style.overflow = 'hidden';
    } catch (e) {}
  }
  function start() {
    apply();
    setInterval(apply, 1000);
    try { new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
"#;

/// Opens `url` in the child webview (replacing one that is already open). When
/// `focus_video` is set, the page's main video is shown full screen with sound
/// and the rest of the page is hidden (see [`FOCUS_VIDEO_SCRIPT`]).
pub fn open(app: &AppHandle, url: &str, focus_video: bool) -> Result<(), String> {
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

    let mut builder = WebviewBuilder::new(EXTERNAL_LABEL, WebviewUrl::External(url))
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
    if focus_video {
        builder = builder
            .additional_browser_args(AUTOPLAY_ARGS)
            .initialization_script(FOCUS_VIDEO_SCRIPT);
    }

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

/// Browser-style back inside the child webview (the bar's "Atrás"). A no-op when
/// the page has no history yet (the tile was just opened).
pub fn back(app: &AppHandle) {
    match app.get_webview(EXTERNAL_LABEL) {
        Some(webview) => match webview.eval("window.history.back()") {
            Ok(()) => diag::log("external back: history.back() dispatched"),
            Err(error) => diag::log(&format!("external back failed: {error}")),
        },
        None => diag::log("external back: no external webview"),
    }
}
