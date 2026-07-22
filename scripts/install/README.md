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

Reboot coverage comes from **Windows autologon**: enable autologon for the kiosk
account (a Windows setting, configured separately — it stores a password in
Windows, entered by the administrator, never by NoniOS or this repo) so a reboot
auto-logs the account in, which fires the `NoniOS` logon trigger. The watchdog
then covers sleep/resume and crashes within a minute.

## Not handled here

- **Autologon** — configure separately (e.g. `netplwiz` or Sysinternals
  Autologon). Required for unattended reboot recovery.
- **AnyDesk unattended access** — set up from the app (Admin → Remote Access),
  not from these scripts.
- **Taskbar restore** — done at runtime by NoniOS itself when it exits; not a
  concern of these scripts.
