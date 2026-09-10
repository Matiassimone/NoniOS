//! Reads and writes `config.json` in the Tauri app-data directory.
//!
//! A corrupted or hand-edited file must never crash NoniOS (CLAUDE.md ->
//! Architecture Rule 4): anything that fails to parse falls back to the seed
//! defaults. The file is written atomically (temp file + rename) so a crash
//! mid-write cannot leave a half-written config behind.

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager};
use thiserror::Error;

use super::Config;

#[derive(Debug, Error)]
pub enum StoreError {
    #[error("app data directory unavailable: {0}")]
    AppDataDir(String),
    #[error("could not write config: {0}")]
    Write(#[from] std::io::Error),
    #[error("could not serialise config: {0}")]
    Serialise(#[from] serde_json::Error),
}

/// What `get_config` hands to the frontend: the config plus whether this is the
/// very first boot (no file yet), which sends the app straight into Admin.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ConfigEnvelope {
    pub config: Config,
    pub first_boot: bool,
}

fn config_path(app: &AppHandle) -> Result<PathBuf, StoreError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| StoreError::AppDataDir(error.to_string()))?;
    Ok(dir.join("config.json"))
}

/// Pure parse used by [`load`]: missing file → first boot with defaults;
/// unreadable/unparseable file → defaults, NOT first boot (the administrator
/// already set the machine up once; re-running setup would be more confusing
/// than showing Home with the seed tiles).
pub fn envelope_from(contents: Option<&str>) -> ConfigEnvelope {
    match contents {
        None => ConfigEnvelope {
            config: Config::default(),
            first_boot: true,
        },
        Some(text) => ConfigEnvelope {
            config: serde_json::from_str(text).unwrap_or_default(),
            first_boot: false,
        },
    }
}

/// Loads the config, never failing: any problem yields the seed defaults.
pub fn load(app: &AppHandle) -> ConfigEnvelope {
    let Ok(path) = config_path(app) else {
        return envelope_from(None);
    };
    match fs::read_to_string(&path) {
        Ok(text) => envelope_from(Some(&text)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => envelope_from(None),
        Err(_) => ConfigEnvelope {
            config: Config::default(),
            first_boot: false,
        },
    }
}

/// Persists the config atomically.
pub fn save(app: &AppHandle, config: &Config) -> Result<(), StoreError> {
    let path = config_path(app)?;
    write_atomic(&path, &serde_json::to_vec_pretty(config)?)
}

fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), StoreError> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, bytes)?;
    fs::rename(&tmp, path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_file_is_first_boot_with_seed_tiles() {
        let envelope = envelope_from(None);
        assert!(envelope.first_boot);
        assert_eq!(envelope.config.tiles.len(), 2);
        assert_eq!(envelope.config.user.locale, "en");
    }

    #[test]
    fn garbage_falls_back_to_defaults_without_first_boot() {
        let envelope = envelope_from(Some("{ this is not json"));
        assert!(!envelope.first_boot);
        assert_eq!(envelope.config, Config::default());
    }

    #[test]
    fn partial_file_fills_missing_fields() {
        let envelope = envelope_from(Some(r#"{"user":{"name":"Noni","locale":"es"}}"#));
        assert_eq!(envelope.config.user.name, "Noni");
        assert_eq!(envelope.config.user.locale, "es");
        assert!(envelope.config.autostart);
        assert_eq!(envelope.config.weather, None);
    }

    #[test]
    fn round_trips_through_camel_case_json() {
        let json = serde_json::to_string(&Config::default()).unwrap();
        assert!(json.contains("\"schemaVersion\":1"));
        assert!(json.contains("\"targetKind\":\"aumid\""));
        assert!(json.contains("\"anydeskId\":null"));
        let back: Config = serde_json::from_str(&json).unwrap();
        assert_eq!(back, Config::default());
    }
}
