# NoniOS — single Windows verification round

Everything that could be verified without a Windows machine already is: the
frontend has unit + render tests, the Rust code compiles with MSVC in CI, and
`scripts/ci/Smoke-Test.ps1` proves on a real `windows-latest` runner that NoniOS
starts, engages the lockdown, registers F4, registers both Scheduled Tasks, is
relaunched by the watchdog, and configures autologon without ever putting the
password in the registry or a log.

This document is the rest: what only a human at a real, rebootable Windows
10/11 machine can confirm. Budget: one afternoon. Do it in order; stop and
report at the first failure of a **blocking** row.

## Before you start: the machine

- **Real hardware or a VM in Basic Session.** Hyper-V's *Enhanced Session* is an
  RDP connection with its own sign-in — autologon happens in the console
  session, so from an enhanced session it looks as if autostart never fired.
  Use View → uncheck *Enhanced Session*, or VirtualBox/VMware, or a real PC.
- **A dedicated local account** for the end user (e.g. `Noni`) with a password,
  signed in as that account while installing. A Microsoft account works too
  (`configure-autologon` switches off the "Require Windows Hello" block), but a
  local account avoids every cloud nag.

- **Hyper-V routes Windows key combos to the HOST by default** unless the VM
  window is full screen. Win, Ctrl+Esc and Alt+Tab then open *your PC's* Start
  menu / switcher, which looks exactly like the kiosk failing. Before section 2:
  Hyper-V Manager → Hyper-V Settings (host, right pane) → Keyboard → **"Use on
  the virtual machine"**, or run the VM window full screen (Ctrl+Alt+Break).
  Proof either way: after the test, F4 → Cerrar NoniOS and read
  `nonios.log` — the exit line says `keyboard hook blocked N keystrokes`. N = 0
  after pressing Win/Alt+Tab means the keys never reached the VM.

## 0. Get the build (5 min)

Do **not** build on the test machine. Download the artifact of the latest green
run of the `windows` workflow for the branch under test
(GitHub → Actions → windows → the run → Artifacts → `nonios-windows-<sha>`).
Unzip it, e.g. to `C:\NoniOS\`. It contains:

```
NoniOS.exe                 nonios-watchdog.exe
install\Install-NoniOS.ps1 install\Uninstall-NoniOS.ps1 install\README.md
ci\Smoke-Test.ps1
NoniOS_0.1.0_x64-setup.exe (NSIS installer — optional, not needed for this round)
```

Confirm the build is the one you think it is: `F4` → Admin sidebar must show
**General / Accesos / Acceso remoto** and both **Volver a Home** and **Cerrar
NoniOS**. If Admin is a placeholder, you have an old binary.

## 1. Pre-flight: run the smoke test yourself (5 min)

From an **elevated** PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
C:\NoniOS\ci\Smoke-Test.ps1 -InstallDir C:\NoniOS
```

Expected: every line `PASS`, final line `all checks passed`. It leaves the
machine clean (tasks removed, autologon off, NoniOS closed). If anything fails
here, stop — the CI run already passed these on a clean image, so a failure
points at this machine (policy, antivirus, existing kiosk software).

## 2. Keyboard lockdown — real keys (10 min) — BLOCKING

Start `C:\NoniOS\NoniOS.exe` directly (double-click). It is first boot: Admin
opens. Press **F4** to see Home (the seeded Netflix + Telefe tiles).

| # | Press | Expected |
| --- | --- | --- |
| 2a | Win | Nothing (no Start menu) |
| 2b | Ctrl+Esc | Nothing |
| 2c | Alt+Tab | Nothing |
| 2d | Alt+F4 | Nothing; NoniOS stays |
| 2d' | Ctrl+Shift+Esc, Alt+Esc | Nothing (no Task Manager, no window switch) |
| 2e | Move mouse to bottom edge | No taskbar |
| 2f | F4 | Admin opens; F4 again → Home |
| 2g | Ctrl+Alt+Del, Win+L | These DO work (kernel-owned; expected, not a bug) |
| 2h | F4 → Cerrar NoniOS, then `Get-Content $env:LOCALAPPDATA\NoniOS\nonios.log -Tail 1` | `keyboard hook blocked N keystrokes` with N > 0 |

Log to check: `%LOCALAPPDATA%\NoniOS\nonios.log` has `kiosk lockdown engaged`.

## 3. First-boot setup through Admin (15 min)

In Admin (F4):

| # | Do | Expected |
| --- | --- | --- |
| 3a | General → type a name, pick Español | Greeting on Home shows the name in Spanish |
| 3b | General → weather: type a city, pick a result | "Ubicación actual: …" appears; Home shows a temperature chip within a few seconds (needs internet) |
| 3c | General → autostart switch OFF then ON | No error text. (Tasks must be installed — step 5 — for the switch to actually flip anything; before that the switch may show the error, which is correct.) |
| 3d | Accesos → Netflix row | Meta line shows `App · <AppID>` (auto-detected). If `no detectada`, install Netflix from the Store and press **Volver a detectar** |
| 3e | Accesos → Agregar acceso → App instalada | Picker lists the machine's apps with search; picking one adds a row |
| 3f | Accesos → Agregar acceso → Página web | youtube.com + label + icon → row shows `Web · youtube.com` |
| 3g | Reorder with ↑/↓, edit label/icon, delete the new rows | List updates immediately; first/last arrows dimmed |
| 3h | Acceso remoto | If AnyDesk installed: ID shown, Copiar → Copiado. If not: "AnyDesk no está instalado" + Volver a detectar |
| 3i | Volver a Home | Brief "Volviendo…" overlay, then Home |
| 3j | Close NoniOS (Cerrar NoniOS), reopen NoniOS.exe | Opens straight into Home (config persisted in `%APPDATA%\com.nonios.launcher\config.json`) |

## 4. Launch and return — the Home state machine (15 min) — BLOCKING

| # | Do | Expected |
| --- | --- | --- |
| 4a | Tap **Telefe** | Tap sound; "Abriendo Telefe…" overlay; the site opens below a top bar that reads "Telefe" + a big **Volver al inicio** button; the stream plays (JW Player, ads first). If the page stays white for > 15 s, open the same URL in Edge inside the VM and check `nonios.log` for `external page load started/finished` |
| 4b | Tap **Volver al inicio** | Warm sound; the logo for ~1 s; Home |
| 4c | Tap **Netflix** | Overlay; the Store app comes to the front; NoniOS is NOT visible (it is behind) |
| 4d | Close Netflix with its own X | Within ~1 s NoniOS is back in front with the returning overlay, then Home |
| 4e | Tap Netflix, then press **F4** while Netflix is in front | Admin opens in front of Netflix (NoniOS regains topmost) |
| 4f | Netflix not installed | The Netflix tile is NOT shown on Home (Admin lists it as `no detectada`). Add an exe tile with a bogus path to see: overlay, then the logo beat, never an error dialog |
| 4g | During 4c, watch the desktop | At no point is the bare Windows desktop the only thing visible |

If 4d does not return within ~5 s, note whether Netflix's window is still
listed in Task Manager and what the foreground window was; send
`nonios.log` lines around `launch_tile`.

## 5. Reliability: tasks, watchdog, reboot, sleep (30 min + reboots) — BLOCKING

```powershell
# elevated
C:\NoniOS\install\Install-NoniOS.ps1 -InstallDir C:\NoniOS
#  -> registers both tasks, then prompts for the Windows password (autologon)
```

| # | Do | Expected |
| --- | --- | --- |
| 5a | `reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"` | `AutoAdminLogon=1`, `DefaultUserName` set, **no `DefaultPassword` value added by us** |
| 5a' | `reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\PasswordLess\Device"` | `DevicePasswordLessBuildVersion = 0` |
| 5b | Task Manager → end `NoniOS.exe` | Back within ~60 s (watchdog) |
| 5b' | Freeze NoniOS: Task Manager → right-click `NoniOS.exe` → *Suspend* (Details tab, or Process Explorer) | Within ~60–120 s the watchdog logs `not responding`, kills it and NoniOS comes back |
| 5c | Admin → autostart OFF, end NoniOS | Does NOT come back; `Get-ScheduledTask NoniOS*` shows both Disabled. Turn it back ON (start NoniOS.exe by hand, F4, switch) |
| 5d | **Reboot** | Machine logs in by itself; NoniOS is on screen without anyone touching the keyboard |
| 5e | Sleep (power menu is unreachable — use `rundll32 powrprof.dll,SetSuspendState 0,1,0` from an elevated prompt before installing tasks, or the power button) → wake | **No sign-in/lock screen**; NoniOS is in front (or within ~60 s) |
| 5e' | Leave the machine idle past the screen-saver / screen-off timeout, then wake it | Again no lock screen, straight back to NoniOS |
| 5f | `Get-Content $env:LOCALAPPDATA\NoniOS\watchdog.log -Tail 5` | One line per minute, `NoniOS is running; nothing to do` |

## 6. Teardown (2 min)

```powershell
C:\NoniOS\install\Uninstall-NoniOS.ps1 -NoniosExe C:\NoniOS\NoniOS.exe
```
Taskbar back (restore-shell), tasks removed, autologon off.

## Report back

Per row: PASS / FAIL + one line of what you saw. For any FAIL attach
`%LOCALAPPDATA%\NoniOS\nonios.log` and `watchdog.log`. Rows 2, 4 and 5 are the
product's promise; rows 3 are UI polish and can be fixed without another round.
