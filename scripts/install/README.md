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

## Not handled here

- **AnyDesk unattended access** — set up from the app (Admin → Remote Access),
  not from these scripts.
- **Taskbar restore** — done at runtime by NoniOS itself when it exits; not a
  concern of these scripts.
