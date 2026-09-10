//! Local per-install configuration (CLAUDE.md -> Data Model).
//!
//! `local_store` is the ONLY code that reads or writes the config file on disk
//! (AGENTS.md -> Security). Everything else — commands, launchers — goes through
//! it. Field names are English identifiers serialised as camelCase so the JSON
//! matches the frontend's Zod schema one-to-one.

pub mod local_store;

use serde::{Deserialize, Serialize};

/// Current on-disk schema version. Bump together with a migration in
/// `local_store::load` when the shape changes incompatibly.
pub const SCHEMA_VERSION: u32 = 1;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Config {
    pub schema_version: u32,
    pub user: User,
    pub autostart: bool,
    pub weather: Option<Weather>,
    pub tiles: Vec<Tile>,
    pub anydesk_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct User {
    pub name: String,
    pub locale: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Weather {
    pub city: String,
    pub lat: f64,
    pub lon: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Tile {
    pub id: String,
    pub name: String,
    /// `"app"` or `"web"` — mirrored by the frontend's `TileKind` union.
    pub kind: String,
    pub icon: String,
    /// AUMID, executable path, or URL depending on `target_kind`.
    pub target: String,
    /// `"aumid"`, `"exe"` or `"url"` — tells `launchers/` which strategy to use.
    pub target_kind: String,
}

impl Default for User {
    fn default() -> Self {
        // English is the neutral fallback locale; the administrator picks the
        // real one on first boot (CLAUDE.md -> First Boot).
        Self {
            name: String::new(),
            locale: "en".into(),
        }
    }
}

impl Default for Config {
    /// The first-boot seed: Netflix (target filled in by AUMID detection) and
    /// Telefe. Plain data — nothing special-cases these two later on.
    fn default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            user: User::default(),
            autostart: true,
            weather: None,
            tiles: vec![
                Tile {
                    id: "netflix".into(),
                    name: "Netflix".into(),
                    kind: "app".into(),
                    icon: "play".into(),
                    target: String::new(),
                    target_kind: "aumid".into(),
                },
                Tile {
                    id: "telefe".into(),
                    name: "Telefe".into(),
                    kind: "web".into(),
                    icon: "tv".into(),
                    target: "https://www.mitelefe.com/telefe-en-vivo".into(),
                    target_kind: "url".into(),
                },
            ],
            anydesk_id: None,
        }
    }
}
