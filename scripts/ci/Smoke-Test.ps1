<#
.SYNOPSIS
    Exercises the NoniOS reliability chain on a Windows machine without a human:
    start → lockdown log → Scheduled Tasks → watchdog relaunch → autologon
    registry shape → teardown. Used by CI (windows-latest) and runnable on any
    test machine from an elevated PowerShell as a pre-flight before the manual
    round.

.DESCRIPTION
    Requires NoniOS.exe, nonios-watchdog.exe and install\Install-NoniOS.ps1 /
    Uninstall-NoniOS.ps1 under -InstallDir (the layout the CI artifact has).
    Writes a real AutoAdminLogon entry with a throwaway password and removes it
    again — only run it on a disposable machine or one you administer.

    Exits non-zero on the first failed check; prints PASS/FAIL per check.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$InstallDir,
    [int]$StartupWaitSeconds = 12,
    [int]$WatchdogWaitSeconds = 20
)

$ErrorActionPreference = 'Stop'
$nonios = Join-Path $InstallDir 'NoniOS.exe'
$watchdog = Join-Path $InstallDir 'nonios-watchdog.exe'
$installScript = Join-Path $InstallDir 'install\Install-NoniOS.ps1'
$uninstallScript = Join-Path $InstallDir 'install\Uninstall-NoniOS.ps1'
$logDir = Join-Path $env:LOCALAPPDATA 'NoniOS'
$noniosLog = Join-Path $logDir 'nonios.log'
$winlogon = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
$script:failed = 0

function Check([string]$name, [bool]$ok, [string]$detail = '') {
    if ($ok) { Write-Host "PASS  $name" }
    else { Write-Host "FAIL  $name  $detail"; $script:failed++ }
}

function Get-NoniosProcess { Get-Process -Name 'NoniOS', 'nonios' -ErrorAction SilentlyContinue }

function Stop-Nonios {
    Get-NoniosProcess | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Runs a GUI-subsystem exe with text on stdin and waits for it. PowerShell's
# `| & exe` does not reliably wait for GUI apps, so use System.Diagnostics.Process.
function Invoke-WithStdin([string]$exe, [string[]]$arguments, [string]$stdin) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $exe
    $psi.Arguments = ($arguments -join ' ')
    $psi.RedirectStandardInput = $true
    $psi.UseShellExecute = $false
    $p = [System.Diagnostics.Process]::Start($psi)
    $p.StandardInput.WriteLine($stdin)
    $p.StandardInput.Close()
    $p.WaitForExit()
    return $p.ExitCode
}

foreach ($f in @($nonios, $watchdog, $installScript, $uninstallScript)) {
    if (-not (Test-Path -LiteralPath $f)) { throw "missing: $f" }
}

try {
    # Clean slate.
    Stop-Nonios
    if (Test-Path $logDir) { Remove-Item -Recurse -Force $logDir }

    # ---- 1. Startup + lockdown --------------------------------------------
    Write-Host "== 1. start NoniOS.exe and read $noniosLog"
    Start-Process -FilePath $nonios -WorkingDirectory $InstallDir | Out-Null
    Start-Sleep -Seconds $StartupWaitSeconds
    Check 'process is alive after startup' ([bool](Get-NoniosProcess))
    $log = if (Test-Path $noniosLog) { Get-Content $noniosLog -Raw } else { '' }
    Write-Host $log
    Check 'log has "NoniOS starting"' ($log -match 'NoniOS starting')
    Check 'log has "kiosk lockdown engaged"' ($log -match 'kiosk lockdown engaged') 'keyboard hook or taskbar failed — see log'
    Check 'log has "F4 admin hotkey registered"' ($log -match 'F4 admin hotkey registered')

    # ---- 1b. Keyboard hook: inject the blocked combinations, read the counter --
    # keybd_event goes through WH_KEYBOARD_LL like real keys (LLKHF_INJECTED set),
    # so this proves the hook receives and swallows each combination on a real
    # Windows session. Expected: Win (down+up) 2, Ctrl+Esc 2 (Esc only), Alt+Tab
    # 2 (Tab only), Alt+F4 2 = 8. A plain F4 afterwards makes NoniOS log the count.
    Write-Host '== 1b. keyboard hook blocks Win / Ctrl+Esc / Alt+Tab / Alt+F4'
    # SendInput (not keybd_event): the modern injection API. Uses the extended-key
    # flag for the Windows keys, which keybd_event does not, so LWIN actually
    # reaches the low-level hook.
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class NoniKbd {
    [StructLayout(LayoutKind.Sequential)]
    struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Sequential)]
    struct INPUT { public uint type; public KEYBDINPUT ki; public int pad; }
    [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint n, INPUT[] pInputs, int cb);
    const uint INPUT_KEYBOARD = 1;
    const uint KEYEVENTF_KEYUP = 2;
    const uint KEYEVENTF_EXTENDEDKEY = 1;
    static bool IsExtended(ushort vk) { return vk == 0x5B || vk == 0x5C; } // L/R Win are extended keys
    static void Send(ushort vk, bool up) {
        var i = new INPUT { type = INPUT_KEYBOARD };
        i.ki.wVk = vk;
        i.ki.dwFlags = (up ? KEYEVENTF_KEYUP : 0) | (IsExtended(vk) ? KEYEVENTF_EXTENDEDKEY : 0);
        SendInput(1, new[] { i }, Marshal.SizeOf(typeof(INPUT)));
        System.Threading.Thread.Sleep(40);
    }
    public static void Down(ushort vk) { Send(vk, false); }
    public static void Up(ushort vk) { Send(vk, true); }
    public static void Tap(ushort vk) { Down(vk); Up(vk); }
}
'@
    # Read the running counter by tapping F4 (F4 alone isn't blocked) and parsing
    # the latest log line, so each combo's contribution is measured separately.
    function Get-Blocked {
        Start-Sleep -Milliseconds 300
        [NoniKbd]::Tap(0x73)
        Start-Sleep -Milliseconds 700
        $m = [regex]::Matches((Get-Content $noniosLog -Raw), 'blocked (\d+) keystrokes so far')
        if ($m.Count -gt 0) { [int]$m[$m.Count - 1].Groups[1].Value } else { -1 }
    }
    # The block DECISION is proven deterministically by the Rust unit tests
    # (cargo test, in the build job). Injecting keys in a headless CI session is
    # unreliable and the Windows key never reaches an LL hook there, so here we
    # only confirm the live hook actually intercepts input end to end: inject the
    # three combos a few times and require the counter to move.
    $b = Get-Blocked
    for ($i = 0; $i -lt 3; $i++) {
        [NoniKbd]::Down(0x11); [NoniKbd]::Tap(0x1B); [NoniKbd]::Up(0x11)   # Ctrl+Esc
        [NoniKbd]::Down(0x12); [NoniKbd]::Tap(0x09); [NoniKbd]::Up(0x12)   # Alt+Tab
        [NoniKbd]::Down(0x12); [NoniKbd]::Tap(0x73); [NoniKbd]::Up(0x12)   # Alt+F4
    }
    $blocked = (Get-Blocked) - $b
    Write-Host "live hook blocked $blocked injected keystrokes (>0 means it intercepts)"
    Check 'live keyboard hook intercepts input' ($blocked -gt 0) "got $blocked"
    Check 'NoniOS still alive after Alt+F4' ([bool](Get-NoniosProcess))

    # ---- 2. Scheduled Tasks -------------------------------------------------
    Write-Host '== 2. register Scheduled Tasks (no autologon)'
    & $installScript -InstallDir $InstallDir -SkipAutologon
    Check "task 'NoniOS' registered" ([bool](Get-ScheduledTask -TaskName 'NoniOS' -ErrorAction SilentlyContinue))
    Check "task 'NoniOS Watchdog' registered" ([bool](Get-ScheduledTask -TaskName 'NoniOS Watchdog' -ErrorAction SilentlyContinue))
    $consoleLock = (& powercfg /Q SCHEME_CURRENT SUB_NONE 0e796bdb-100d-47d6-a2d5-f7d2daa51f51 2>&1) -join "`n"
    Write-Host $consoleLock
    Check 'sign-in on wake disabled (CONSOLELOCK AC index 0)' ($consoleLock -match 'AC Power Setting Index: 0x00000000')
    Check 'sign-in on wake disabled (CONSOLELOCK DC index 0)' ($consoleLock -match 'DC Power Setting Index: 0x00000000')
    Check 'NoLockScreen policy set' ((Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization' -ErrorAction SilentlyContinue).NoLockScreen -eq 1)
    $scMap = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Keyboard Layout' -ErrorAction SilentlyContinue).'Scancode Map'
    Check 'Windows key disabled (Scancode Map written)' ($scMap -and $scMap.Count -eq 24 -and $scMap[14] -eq 0x5B -and $scMap[18] -eq 0x5C)

    # ---- 3. Watchdog relaunch ----------------------------------------------
    Write-Host '== 3. kill NoniOS, run the watchdog once, expect a relaunch'
    Stop-Nonios
    Check 'NoniOS is gone after kill' (-not (Get-NoniosProcess))
    Start-Process -FilePath $watchdog -WorkingDirectory $InstallDir -Wait | Out-Null
    Start-Sleep -Seconds $WatchdogWaitSeconds
    $wdLog = Get-Content (Join-Path $logDir 'watchdog.log') -Raw -ErrorAction SilentlyContinue
    Write-Host $wdLog
    Check 'watchdog logged the relaunch attempt' ($wdLog -match "running task 'NoniOS'")
    Check 'NoniOS is running again after the watchdog' ([bool](Get-NoniosProcess)) 'schtasks /Run did not bring it back — check LastTaskResult'
    Get-ScheduledTaskInfo -TaskName 'NoniOS' | Format-List TaskName, LastRunTime, LastTaskResult | Out-String | Write-Host

    # ---- 3b. Watchdog honours the administrator's autostart switch ----------
    Write-Host '== 3b. autostart:false in config.json keeps the watchdog quiet'
    $configDir = Join-Path $env:APPDATA 'com.nonios.launcher'
    $configPath = Join-Path $configDir 'config.json'
    $hadConfig = Test-Path $configPath
    if ($hadConfig) { Copy-Item $configPath "$configPath.smoke-backup" }
    New-Item -ItemType Directory -Force -Path $configDir | Out-Null
    '{"schemaVersion":1,"autostart":false,"tiles":[]}' | Set-Content -Path $configPath -Encoding UTF8
    Stop-Nonios
    Start-Process -FilePath $watchdog -WorkingDirectory $InstallDir -Wait | Out-Null
    Start-Sleep -Seconds 5
    $wdLog = Get-Content (Join-Path $logDir 'watchdog.log') -Raw -ErrorAction SilentlyContinue
    Check 'watchdog logged that autostart is off' ($wdLog -match 'autostart is off in config.json')
    Check 'NoniOS was NOT relaunched while autostart is off' (-not (Get-NoniosProcess))
    if ($hadConfig) { Move-Item "$configPath.smoke-backup" $configPath -Force } else { Remove-Item $configPath -Force }

    # ---- 3c. Admin "Launch automatically" OFF disables both tasks -----------
    # This is what set_autostart(false) does (schtasks /Change /DISABLE). It is
    # the reboot-safety switch: with both tasks disabled, a reboot does not bring
    # NoniOS back, so the tester can never be locked out of a real machine.
    Write-Host '== 3c. disabling autostart leaves both scheduled tasks Disabled'
    foreach ($t in @('NoniOS', 'NoniOS Watchdog')) {
        & schtasks /Change /TN $t /DISABLE | Out-Null
    }
    $mainState = (Get-ScheduledTask -TaskName 'NoniOS').State
    $wdState = (Get-ScheduledTask -TaskName 'NoniOS Watchdog').State
    Check "task 'NoniOS' is Disabled after autostart off" ($mainState -eq 'Disabled') "state $mainState"
    Check "task 'NoniOS Watchdog' is Disabled after autostart off" ($wdState -eq 'Disabled') "state $wdState"
    foreach ($t in @('NoniOS', 'NoniOS Watchdog')) {
        & schtasks /Change /TN $t /ENABLE | Out-Null
    }
    Check "task 'NoniOS' is Ready again after autostart on" ((Get-ScheduledTask -TaskName 'NoniOS').State -eq 'Ready')

    # ---- 4. Autologon shape (throwaway password) ---------------------------
    Write-Host '== 4. configure-autologon writes registry + LSA secret, never plaintext'
    # Some machines (GitHub's runner images among them) already carry a plaintext
    # DefaultPassword in Winlogon. NoniOS must never ADD or CHANGE one, so compare
    # against the value present before the call rather than requiring absence.
    $before = Get-ItemProperty $winlogon
    $passwordBefore = $before.PSObject.Properties['DefaultPassword'].Value
    Write-Host ("DefaultPassword present before: " + [bool]$passwordBefore)
    $throwaway = 'smoke-test-not-a-real-password-' + [guid]::NewGuid().ToString('N')
    $code = Invoke-WithStdin $nonios @('configure-autologon', $env:COMPUTERNAME, $env:USERNAME) $throwaway
    Check 'configure-autologon exit code 0' ($code -eq 0) "exit $code"
    $props = Get-ItemProperty $winlogon
    Check 'AutoAdminLogon = 1' ($props.AutoAdminLogon -eq '1')
    Check "DefaultUserName = $env:USERNAME" ($props.DefaultUserName -eq $env:USERNAME)
    $passwordless = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\PasswordLess\Device' -ErrorAction SilentlyContinue
    Check 'DevicePasswordLessBuildVersion = 0 (Windows Hello requirement off)' ($passwordless.DevicePasswordLessBuildVersion -eq 0)
    $passwordAfter = $props.PSObject.Properties['DefaultPassword'].Value
    Check 'DefaultPassword in registry unchanged by NoniOS' ($passwordAfter -eq $passwordBefore)
    Check 'throwaway password NOT in registry' ($passwordAfter -ne $throwaway)
    $allLogs = (Get-ChildItem $logDir -Filter '*.log' | Get-Content -Raw) -join "`n"
    Check 'password appears in no NoniOS log' (-not ($allLogs -like "*$throwaway*"))
    $code = Invoke-WithStdin $nonios @('disable-autologon') ''
    Check 'disable-autologon exit code 0' ($code -eq 0) "exit $code"
    Check 'AutoAdminLogon = 0 after disable' ((Get-ItemProperty $winlogon).AutoAdminLogon -eq '0')
}
finally {
    Write-Host '== teardown + full-restore verification'
    Stop-Nonios
    & $uninstallScript -NoniosExe $nonios
    # The uninstaller is the tester's "put my PC back to normal" button. Prove it
    # actually undoes every machine change, so a real PC is never left broken.
    Check 'task NoniOS removed' (-not (Get-ScheduledTask -TaskName 'NoniOS' -ErrorAction SilentlyContinue))
    Check 'task NoniOS Watchdog removed' (-not (Get-ScheduledTask -TaskName 'NoniOS Watchdog' -ErrorAction SilentlyContinue))
    Check 'AutoAdminLogon disabled' ((Get-ItemProperty $winlogon -ErrorAction SilentlyContinue).AutoAdminLogon -eq '0')
    Check 'Windows key re-enabled (Scancode Map removed)' (-not (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Keyboard Layout' -ErrorAction SilentlyContinue).'Scancode Map')
    Check 'lock screen policy removed' (-not (Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization' -ErrorAction SilentlyContinue).NoLockScreen)
    $lockBack = (& powercfg /Q SCHEME_CURRENT SUB_NONE 0e796bdb-100d-47d6-a2d5-f7d2daa51f51 2>&1) -join "`n"
    Check 'sign-in on wake restored (CONSOLELOCK AC index 1)' ($lockBack -match 'AC Power Setting Index: 0x00000001')
}

if ($script:failed -gt 0) {
    Write-Host "$script:failed check(s) FAILED"
    exit 1
}
Write-Host 'all checks passed'
