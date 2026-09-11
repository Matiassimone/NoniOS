//! Programmatic Windows Autologon setup (CLAUDE.md -> Reliability Architecture).
//!
//! For a kiosk to recover from a reboot unattended, the machine must auto-log
//! the kiosk account in so the "at log on" Scheduled Task trigger fires. NoniOS
//! configures this itself — the administrator must never have to download and
//! run a separate tool.
//!
//! What gets written:
//!   * Registry `HKLM\...\Winlogon`: `AutoAdminLogon=1`, `DefaultUserName`,
//!     `DefaultDomainName` (non-secret — normal registry values).
//!   * Registry `HKLM\...\PasswordLess\Device`: `DevicePasswordLessBuildVersion=0`.
//!     Windows 11's "Require Windows Hello sign-in for Microsoft accounts"
//!     silently ignores AutoAdminLogon while this is 2 (its default on a
//!     Microsoft-account machine) — the classic "autologon is configured but
//!     the lock screen still appears" failure.
//!   * The PASSWORD is stored as the LSA secret `DefaultPassword` via
//!     `LsaStorePrivateData` — the same mechanism Sysinternals Autologon uses.
//!     It is NEVER written to the registry (which would be plaintext), never
//!     logged, and never leaves the machine.
//!
//! The password only ever exists here as a borrowed `&str` passed straight to
//! the LSA call; this module must never log or persist it anywhere else.

use thiserror::Error;

/// Errors from configuring or clearing autologon.
#[derive(Debug, Error)]
pub enum AutologonError {
    #[cfg(windows)]
    #[error("registry write '{value}' failed (code {code})")]
    Registry { value: String, code: u32 },
    #[cfg(windows)]
    #[error("LSA operation failed (win32 error {0})")]
    Lsa(u32),
    #[cfg(not(windows))]
    #[error("autologon is only supported on Windows")]
    Unsupported,
}

#[cfg(windows)]
mod imp {
    use std::ffi::c_void;

    use windows::core::{PCWSTR, PWSTR};
    use windows::Win32::Foundation::{NTSTATUS, STATUS_OBJECT_NAME_NOT_FOUND};
    use windows::Win32::Security::Authentication::Identity::{
        LsaClose, LsaNtStatusToWinError, LsaOpenPolicy, LsaStorePrivateData, LSA_HANDLE,
        LSA_OBJECT_ATTRIBUTES, LSA_UNICODE_STRING,
    };
    use windows::Win32::System::Registry::{
        RegSetKeyValueW, HKEY_LOCAL_MACHINE, REG_DWORD, REG_SZ,
    };

    use super::AutologonError;

    const WINLOGON_KEY: &str = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon";
    const PASSWORDLESS_KEY: &str =
        "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\PasswordLess\\Device";
    /// `POLICY_CREATE_SECRET` access right (ntsecapi.h). Needed by
    /// `LsaStorePrivateData`; defined locally to avoid depending on the constant
    /// being re-exported by the bindings.
    const POLICY_CREATE_SECRET: u32 = 0x0000_0020;

    fn utf16_nul(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    /// Builds an `LSA_UNICODE_STRING` over a null-terminated UTF-16 buffer:
    /// `Length` excludes the null, `MaximumLength` includes it (both in bytes).
    fn lsa_string(buf: &mut [u16]) -> LSA_UNICODE_STRING {
        let chars_with_nul = buf.len();
        LSA_UNICODE_STRING {
            Length: ((chars_with_nul - 1) * 2) as u16,
            MaximumLength: (chars_with_nul * 2) as u16,
            Buffer: PWSTR(buf.as_mut_ptr()),
        }
    }

    fn set_reg_dword(subkey: &str, value_name: &str, data: u32) -> Result<(), AutologonError> {
        let subkey = utf16_nul(subkey);
        let name = utf16_nul(value_name);
        // SAFETY: valid null-terminated wide strings; a REG_DWORD is exactly the
        // four bytes of `data`.
        let status = unsafe {
            RegSetKeyValueW(
                HKEY_LOCAL_MACHINE,
                PCWSTR(subkey.as_ptr()),
                PCWSTR(name.as_ptr()),
                REG_DWORD.0,
                Some(&data as *const u32 as *const c_void),
                core::mem::size_of::<u32>() as u32,
            )
        };
        if status.0 == 0 {
            Ok(())
        } else {
            Err(AutologonError::Registry {
                value: value_name.to_string(),
                code: status.0,
            })
        }
    }

    fn set_reg_sz(value_name: &str, data: &str) -> Result<(), AutologonError> {
        let subkey = utf16_nul(WINLOGON_KEY);
        let name = utf16_nul(value_name);
        let value = utf16_nul(data);
        // SAFETY: valid null-terminated wide strings; cbData counts the bytes of
        // `value` including its terminator, as REG_SZ requires.
        let status = unsafe {
            RegSetKeyValueW(
                HKEY_LOCAL_MACHINE,
                PCWSTR(subkey.as_ptr()),
                PCWSTR(name.as_ptr()),
                REG_SZ.0,
                Some(value.as_ptr() as *const c_void),
                (value.len() * 2) as u32,
            )
        };
        if status.0 == 0 {
            Ok(())
        } else {
            Err(AutologonError::Registry {
                value: value_name.to_string(),
                code: status.0,
            })
        }
    }

    fn lsa_ok(status: NTSTATUS) -> Result<(), AutologonError> {
        if status.0 == 0 {
            Ok(())
        } else {
            // SAFETY: pure translation of an NTSTATUS to a Win32 error code.
            let win = unsafe { LsaNtStatusToWinError(status) };
            Err(AutologonError::Lsa(win))
        }
    }

    /// Stores (or, with `None`, clears) the `DefaultPassword` LSA secret.
    fn store_password_secret(password: Option<&str>) -> Result<(), AutologonError> {
        let attrs = LSA_OBJECT_ATTRIBUTES {
            Length: core::mem::size_of::<LSA_OBJECT_ATTRIBUTES>() as u32,
            ..Default::default()
        };
        let mut handle = LSA_HANDLE::default();
        // SAFETY: standard LSA policy handle lifecycle — opened here, closed
        // below before returning; the object attributes are zeroed as documented.
        lsa_ok(unsafe { LsaOpenPolicy(None, &attrs, POLICY_CREATE_SECRET, &mut handle) })?;

        let mut key_buf = utf16_nul("DefaultPassword");
        let key = lsa_string(&mut key_buf);

        let result = unsafe {
            if let Some(pw) = password {
                let mut pw_buf = utf16_nul(pw);
                let data = lsa_string(&mut pw_buf);
                LsaStorePrivateData(handle, &key, Some(&data))
            } else {
                LsaStorePrivateData(handle, &key, None)
            }
        };
        let _ = unsafe { LsaClose(handle) };
        // Clearing a secret that does not exist is already the desired state;
        // don't fail `disable` (or the uninstaller) over it.
        if password.is_none() && result == STATUS_OBJECT_NAME_NOT_FOUND {
            return Ok(());
        }
        lsa_ok(result)
    }

    pub fn configure(domain: &str, username: &str, password: &str) -> Result<(), AutologonError> {
        // Must be 0 or Windows 11 ignores AutoAdminLogon (see module docs). Left
        // in place by `disable`: it only re-enables a Settings checkbox.
        set_reg_dword(PASSWORDLESS_KEY, "DevicePasswordLessBuildVersion", 0)?;
        set_reg_sz("AutoAdminLogon", "1")?;
        set_reg_sz("DefaultUserName", username)?;
        set_reg_sz("DefaultDomainName", domain)?;
        store_password_secret(Some(password))
    }

    pub fn disable() -> Result<(), AutologonError> {
        set_reg_sz("AutoAdminLogon", "0")?;
        store_password_secret(None)
    }
}

/// Enables Windows autologon for `domain\username` with `password`. The password
/// is stored only as an LSA secret (never the registry, never a log).
#[cfg(windows)]
pub fn configure(domain: &str, username: &str, password: &str) -> Result<(), AutologonError> {
    imp::configure(domain, username, password)
}

/// Disables autologon and clears the stored password secret.
#[cfg(windows)]
pub fn disable() -> Result<(), AutologonError> {
    imp::disable()
}

/// Dev-host stub — autologon is Windows-only.
#[cfg(not(windows))]
pub fn configure(_domain: &str, _username: &str, _password: &str) -> Result<(), AutologonError> {
    Err(AutologonError::Unsupported)
}

/// Dev-host stub — see [`configure`].
#[cfg(not(windows))]
pub fn disable() -> Result<(), AutologonError> {
    Err(AutologonError::Unsupported)
}
