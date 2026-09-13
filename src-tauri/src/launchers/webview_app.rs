//! Web tiles (Telefe, any Admin-added URL) and bundled games open in a second
//! NoniOS webview — borderless, always on top, positioned *below* a
//! [`BAR_HEIGHT`] strip so the main window's "Atrás / Volver al inicio" bar
//! stays visible above it. It is a separate top-level webview rather than a
//! child webview on purpose: on Windows a child webview renders BEHIND the main
//! webview (the end user would see Home, not the site). This one is borderless,
//! skips the taskbar and is owned by the main window, so it reads as part of
//! NoniOS while actually being reliable. NoniOS itself never loses its
//! fullscreen, always-on-top lockdown behind it.

use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::webview::PageLoadEvent;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};

use crate::diag;

/// Label prefix for the external webview window. A fresh, unique label is used
/// for every launch: `WebviewWindow::destroy` is asynchronous, so reusing one
/// fixed label made a quick "close then open another tile" fail with
/// "a webview with label `external` already exists". Unique labels sidestep the
/// race entirely; [`is_external`] recognises them and [`close`] tears down any
/// that linger.
pub const EXTERNAL_PREFIX: &str = "external-";

/// The label of the external window currently in use, if any.
static CURRENT_LABEL: Mutex<Option<String>> = Mutex::new(None);

/// True for any window this module created (see [`EXTERNAL_PREFIX`]).
pub fn is_external(label: &str) -> bool {
    label.starts_with(EXTERNAL_PREFIX)
}

/// Height in logical pixels of the strip kept for the bar. Must match
/// `BAR_HEIGHT` in `src/screens/Home/InAppBar.tsx`.
pub const BAR_HEIGHT: f64 = 72.0;

/// Browser args for the external webview. MUST match the main window's
/// `additionalBrowserArgs` in `tauri.conf.json`, or WebView2 refuses to share
/// the data directory and the external webview fails to render (Telefe showed
/// nothing while a plain window worked). Includes Tauri's default disabled
/// features plus the autoplay policy that lets video start with sound.
const BROWSER_ARGS: &str =
    "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required";

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

/// Content-area size in logical pixels (below the bar) and where to place it.
fn content_rect(app: &AppHandle) -> (f64, f64) {
    let (mut width, mut height) = (1920.0, 1080.0);
    if let Some(main) = app.get_webview_window("main") {
        let scale = main.scale_factor().unwrap_or(1.0);
        if let Ok(size) = main.inner_size() {
            width = size.width as f64 / scale;
            height = size.height as f64 / scale;
        }
    }
    (width, (height - BAR_HEIGHT).max(200.0))
}

fn build(app: &AppHandle, url: WebviewUrl, focus_video: bool) -> Result<(), String> {
    close(app);
    let (width, height) = content_rect(app);
    let label = format!(
        "{EXTERNAL_PREFIX}{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    );
    let mut builder = WebviewWindowBuilder::new(app, &label, url)
        .title("NoniOS")
        .decorations(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .position(0.0, BAR_HEIGHT)
        .inner_size(width, height)
        .focused(true)
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
    builder = builder.additional_browser_args(BROWSER_ARGS);
    if focus_video {
        builder = builder.initialization_script(FOCUS_VIDEO_SCRIPT);
    }
    builder
        .build()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

/// Opens `url` in the external webview (replacing one already open). When
/// `focus_video` is set, the page's main video is shown full screen with sound
/// and the rest of the page is hidden (see [`FOCUS_VIDEO_SCRIPT`]).
pub fn open(app: &AppHandle, url: &str, focus_video: bool) -> Result<(), String> {
    let url = Url::parse(url).map_err(|error| error.to_string())?;
    build(app, WebviewUrl::External(url), focus_video)
}

/// Opens a game/page bundled with NoniOS (served from the app itself, offline)
/// in the external webview. `game_id` names a file under `games/` in the
/// frontend bundle, e.g. `"spider"` -> `games/spider.html`.
pub fn open_builtin(app: &AppHandle, game_id: &str) -> Result<(), String> {
    // Guard: only a plain id, so a tile can never open an arbitrary app path.
    if !game_id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(format!("invalid builtin game id: {game_id}"));
    }
    build(
        app,
        WebviewUrl::App(std::path::PathBuf::from(format!("games/{game_id}.html"))),
        false,
    )
}

/// Closes the external webview if it exists. Idempotent. Sweeps every window
/// this module created, so a lingering one (destroy is async) can never block
/// the next launch.
pub fn close(app: &AppHandle) {
    *CURRENT_LABEL.lock().unwrap() = None;
    for (label, window) in app.webview_windows() {
        if is_external(&label) {
            let _ = window.destroy();
        }
    }
}

/// Browser-style back inside the external webview (the bar's "Atrás"). A no-op
/// when the page has no history yet (the tile was just opened).
pub fn back(app: &AppHandle) {
    let label = CURRENT_LABEL.lock().unwrap().clone();
    match label.and_then(|l| app.get_webview_window(&l)) {
        Some(window) => match window.eval("window.history.back()") {
            Ok(()) => diag::log("external back: history.back() dispatched"),
            Err(error) => diag::log(&format!("external back failed: {error}")),
        },
        None => diag::log("external back: no external webview"),
    }
}
