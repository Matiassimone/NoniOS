//! The only code that knows how to start an external app or URL (CLAUDE.md ->
//! Architecture Rule 2). The frontend calls `launch_tile(tileId)` and nothing
//! else; the tile's `kind`/`target_kind` picks the strategy here.
//!
//! Tiles are data: Netflix and Telefe go through exactly the same two branches
//! as anything an administrator adds later (Architecture Rule 3).

pub mod generic_app;
pub mod webview_app;

use tauri::AppHandle;
use thiserror::Error;

use crate::config::Tile;
use crate::kiosk::window_watcher;

#[derive(Debug, Error)]
pub enum LaunchError {
    #[error("tile '{0}' has no launch target yet")]
    NoTarget(String),
    #[error("unknown tile kind '{0}'")]
    UnknownKind(String),
    #[error("could not open URL: {0}")]
    Web(String),
    #[error("could not start app: {0}")]
    App(String),
}

/// Launches a tile. Web tiles open in a child webview inside the main window
/// (closed by the bar via `return_home`); app tiles are started via the OS and
/// then followed by the foreground watcher, which emits `external-app-shown` /
/// `external-app-closed` to the frontend.
pub fn launch(app: &AppHandle, tile: &Tile) -> Result<(), LaunchError> {
    if tile.target.is_empty() {
        return Err(LaunchError::NoTarget(tile.id.clone()));
    }
    match tile.kind.as_str() {
        "web" => {
            webview_app::open(app, &tile.target).map_err(LaunchError::Web)?;
            // Our own window exists as soon as `open` returns: that is the
            // "shown" signal for web tiles (no foreground watcher involved).
            window_watcher::notify_shown(app);
            Ok(())
        }
        "app" => {
            // Drop always-on-top BEFORE the app appears so it can come to the
            // front; NoniOS stays fullscreen behind it, so the desktop is never
            // visible even if the app takes a while (Decision 1 in the plan).
            window_watcher::prepare_for_external(app);
            generic_app::launch(&tile.target, &tile.target_kind).map_err(LaunchError::App)?;
            window_watcher::watch(app.clone());
            Ok(())
        }
        other => Err(LaunchError::UnknownKind(other.to_string())),
    }
}
