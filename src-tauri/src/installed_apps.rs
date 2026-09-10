//! Enumerates the apps a Windows user can launch from the Start menu, for the
//! Admin "installed app" picker and for tile re-detection (Netflix included).
//!
//! One mechanism for everything: PowerShell's `Get-StartApps` lists Store apps
//! AND classic desktop apps with the `AppID` that `explorer.exe
//! shell:AppsFolder\<AppID>` accepts, so detection and launching agree by
//! construction. Only `Name` and `AppID` are read — nothing else about the
//! machine (AGENTS.md -> Security).

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    pub name: String,
    /// Application User Model ID as accepted by `shell:AppsFolder\<AppID>`.
    pub app_id: String,
}

#[derive(Debug, Error)]
pub enum InstalledAppsError {
    #[error("PowerShell could not be started: {0}")]
    Spawn(String),
    #[error("Get-StartApps output was not valid JSON: {0}")]
    Parse(String),
}

/// Pure parse of `Get-StartApps | ConvertTo-Json -Compress` output. PowerShell
/// emits a bare object (not a one-element array) when there is exactly one
/// result, so both shapes are accepted. Entries without a name or id are dropped.
pub fn parse_start_apps(json: &str) -> Result<Vec<InstalledApp>, InstalledAppsError> {
    #[derive(Deserialize)]
    struct Row {
        #[serde(rename = "Name")]
        name: Option<String>,
        #[serde(rename = "AppID")]
        app_id: Option<String>,
    }
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Payload {
        Many(Vec<Row>),
        One(Row),
    }

    let trimmed = json.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }
    let rows = match serde_json::from_str::<Payload>(trimmed)
        .map_err(|error| InstalledAppsError::Parse(error.to_string()))?
    {
        Payload::Many(rows) => rows,
        Payload::One(row) => vec![row],
    };
    let mut apps: Vec<InstalledApp> = rows
        .into_iter()
        .filter_map(|row| match (row.name, row.app_id) {
            (Some(name), Some(app_id)) if !name.is_empty() && !app_id.is_empty() => {
                Some(InstalledApp { name, app_id })
            }
            _ => None,
        })
        .collect();
    apps.sort_by_key(|app| app.name.to_lowercase());
    Ok(apps)
}

/// Lists the Start menu apps, sorted by name.
#[cfg(windows)]
pub fn list() -> Result<Vec<InstalledApp>, InstalledAppsError> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    // UTF-8 output so accented app names survive the console code page.
    const SCRIPT: &str = "[Console]::OutputEncoding=[Text.Encoding]::UTF8; \
        Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Compress";

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            SCRIPT,
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|error| InstalledAppsError::Spawn(error.to_string()))?;
    parse_start_apps(&String::from_utf8_lossy(&output.stdout))
}

/// Dev-host stub — there is no Start menu to enumerate off Windows.
#[cfg(not(windows))]
pub fn list() -> Result<Vec<InstalledApp>, InstalledAppsError> {
    Ok(Vec::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_an_array_and_sorts_by_name() {
        let json = r#"[{"Name":"Netflix","AppID":"4DF9E0F8.Netflix_mcm4njqhnhss8!App"},
                       {"Name":"Calculator","AppID":"Microsoft.WindowsCalculator_8wekyb3d8bbwe!App"}]"#;
        let apps = parse_start_apps(json).unwrap();
        assert_eq!(apps.len(), 2);
        assert_eq!(apps[0].name, "Calculator");
        assert_eq!(apps[1].app_id, "4DF9E0F8.Netflix_mcm4njqhnhss8!App");
    }

    #[test]
    fn accepts_a_single_object_and_skips_incomplete_rows() {
        let one = parse_start_apps(r#"{"Name":"Netflix","AppID":"x!App"}"#).unwrap();
        assert_eq!(one.len(), 1);
        let partial =
            parse_start_apps(r#"[{"Name":"Broken","AppID":null},{"Name":"","AppID":"y"}]"#)
                .unwrap();
        assert!(partial.is_empty());
        assert!(parse_start_apps("   ").unwrap().is_empty());
    }

    #[test]
    fn rejects_non_json() {
        assert!(matches!(
            parse_start_apps("Get-StartApps : not recognized"),
            Err(InstalledAppsError::Parse(_))
        ));
    }
}
