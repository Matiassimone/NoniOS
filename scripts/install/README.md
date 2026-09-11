# NoniOS install scripts

First-run setup for the reliability layer (CLAUDE.md → Reliability
Architecture). Windows only. Run from an **elevated** PowerShell.

## What gets installed

Two independent Scheduled Tasks — two safety nets, not one:

| Task | When it runs | What it does |
| --- | --- | --- |
| `NoniOS` | At the kiosk user's logon | Launches the NoniOS app, elevated, in the interactive session. Restarts it up to 3× (1 min apart) on failure. |
| `NoniOS Watchdog` | Every minute (repeats forever) | Runs `nonios-watchdog.exe`; if the NoniOS process is gone, starts the `NoniOS` task again. Covers crash, process kill, and sleep/resume. |

## Usage

```powershell
# Install (from an elevated prompt)
.\Install-NoniOS.ps1 -InstallDir 'C:\Program Files\NoniOS'

# Remove
.\Uninstall-NoniOS.ps1
```

If the executables aren't at `<InstallDir>\NoniOS.exe` and
`<InstallDir>\nonios-watchdog.exe`, pass `-NoniosExe` / `-WatchdogExe`
explicitly. `-User` defaults to the current account; pass the kiosk account if
installing for a different user.

## Why the tasks run interactively (not as SYSTEM)

CLAUDE.md describes "run whether the user is logged on or not" with highest
privileges. NoniOS is a **visible GUI kiosk**, so it must run in the interactive
user session — a SYSTEM/session-0 task would keep the window off the user's
screen. The tasks therefore use `LogonType Interactive` + `RunLevel Highest`.

Reboot coverage comes from **Windows autologon**, which `Install-NoniOS.ps1`
configures for you (no separate tool). It prompts for the kiosk account's Windows
password and hands it to NoniOS on stdin; NoniOS stores it as an **LSA secret**
(`LsaStorePrivateData`, the same mechanism Sysinternals Autologon uses) and sets
`AutoAdminLogon` / `DefaultUserName` / `DefaultDomainName` in the registry. The
password is **never** written to the registry as plaintext, never logged, and
never leaves the machine. Pass `-SkipAutologon` to skip this step.

`Uninstall-NoniOS.ps1 -NoniosExe <path>` reverses it (clears `AutoAdminLogon` and
the stored secret).

## What else the installer changes (and the uninstaller reverts)

- Sign-in prompt after sleep: off (`powercfg … CONSOLELOCK 0`, AC and DC).
- Secure screen saver: off (`ScreenSaverIsSecure=0` for the current user).
- Lock screen policy: `NoLockScreen=1`.
- `DevicePasswordLessBuildVersion=0` (via `configure-autologon`) so Windows 11
  honours `AutoAdminLogon` even on Microsoft-account machines. Left in place by
  the uninstaller — it only re-enables a Settings checkbox.

The watchdog also reads NoniOS's own `config.json`: when the administrator turns
"Launch automatically" off in Admin, the watchdog stays quiet even if the
Scheduled Tasks could not be disabled, and it terminates a NoniOS that Windows
reports as *Not responding* so the relaunch covers hangs, not just crashes.

Testing in Hyper-V? Use a **Basic Session**: Enhanced Session is RDP with its own
sign-in, so autologon appears not to work from there.

## Not handled here

- **AnyDesk unattended access** — set up from the app (Admin → Remote Access),
  not from these scripts.
- **Taskbar restore** — done at runtime by NoniOS itself when it exits; not a
  concern of these scripts.
