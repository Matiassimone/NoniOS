# NoniOS — Session Log

Append-only audit trail. Newest entries at the bottom. Format per
`AGENTS.md` → Session Discipline.

---

## Session Report — Build Order step 1 (Scaffold)

Task scope: Build Order step 1 — "Tauri + React + TS + Tailwind + shadcn
scaffold." Single scoped unit, well under 3h.

### Skills activated this session

| Skill / Plugin  | Moment                       | Result                                                       |
| --------------- | ---------------------------- | ------------------------------------------------------------ |
| Ponytail full   | pre-hook every turn          | active                                                       |
| security-guidance | pre-tool hook on Write/Edit | active (hardened `.npmrc`: added save-exact, min-release-age) |
| /brainstorming  | before starting task         | skipped — pure scaffolding, no design decisions; reserved for kiosk/anydesk/watchdog per AGENTS.md |
| /execute-plan   | implementation               | skipped — single mechanical step, not a multi-task plan      |
| TDD             | non-trivial code             | partial — scaffold has no logic; added one smoke test for `cn()` proving Vitest + `@` alias + TS resolve |
| /ponytail-review | before marking complete     | applied inline (reasoning below), not the slash command      |
| /ponytail-debt  | end of session               | one `ponytail:` marker in repo (NoniButton passthrough seed)  |
| /ponytail-audit | new module start             | n/a — no feature module started yet                          |

### What happened

- Scaffolded `src-tauri/` from `create-tauri-app` (Tauri v2, react-ts) as a base, then reshaped the frontend by hand to match CLAUDE.md's repo structure.
- Frontend: Vite 8 + React 19 + TS 5.9.3 (strict, project-reference tsconfigs, `@/*` alias); Tailwind v4 via `@tailwindcss/vite`.
- Transcribed the full "Tinta + Musgo" token set into `src/index.css` and aliased them onto shadcn's semantic color names so primitives inherit the palette automatically.
- Self-hosted Geist / Geist Mono via `@fontsource-variable/*` (no runtime network — kiosk runs offline).
- shadcn `Button` primitive + thin `NoniButton` wrapper; temporary `App.tsx` scaffold screen proves tokens + fonts + Noni pipeline render.
- ESLint flat config + Prettier (no semi, single quotes, width 100); `src/components/ui/` and human-authored markdown excluded from formatting.
- Regenerated the Tauri app icon set from the provided `src/assets/logos/source-logo.png`.
- `lib.rs` `run()` rewritten with no `.expect()` on the startup path — failed start logs locally and exits non-zero (feeds the reliability restart path).
- Supply chain: exact versions everywhere; `.npmrc` (ignore-scripts, save-exact, min-release-age) + `pnpm-workspace.yaml` (saveExact, empty onlyBuiltDependencies).
- Rewrote the inherited (Zelvem) `.gitignore` for NoniOS's real layout.
- All gates green: `format:check`, `lint`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `pnpm build`; 3/3 Vitest tests pass.
- Committed on a new `develop` branch (main is reserved for production/release per CLAUDE.md).

### Pending

- Nothing outstanding for step 1. Next up is step 2 (kiosk skeleton).

### Decisions made

- **`pnpm-workspace.yaml` exists for config only, with no `packages:` list.** AGENTS.md says pnpm security config lives there; CLAUDE.md says the file appears "only if src/ and watchdog/ become workspace packages." Reconciled: modern pnpm (v10) uses this file as its settings location even for a single package, so it holds `saveExact`/`onlyBuiltDependencies` without declaring a multi-package workspace. Not a genuine doc contradiction — resolved by intent.
- **`ignore-scripts=true` + empty `onlyBuiltDependencies`.** Followed AGENTS.md literally. Every dependency chosen ships prebuilt binaries, so nothing needs a lifecycle script; the allowlist is an empty, documented safety net.
- **TypeScript pinned to 5.9.3, not the 7.0.2 that `latest` now resolves to.** TS 7 (native compiler) is unsupported by `typescript-eslint` (peer `<6.1.0`) — pinning 5.9.x keeps lint working.
- **Tauri identifier `com.nonios.launcher`**; productName `NoniOS`; crate name `nonios`.
- **`--danger` / `--danger-hover` tokens added** (`#a23b2e` / `#8c3125`) for destructive actions. DESIGN.md calls delete "red on hover" but gives no hex — chosen to sit with the earthy palette. Flagged below for design sign-off.
- **3-file tsconfig layout** (solution + `tsconfig.app.json` + `tsconfig.node.json`) to satisfy `tsc -b` composite requirements and cleanly separate browser vs node typing.
- **Tailwind v4** (CSS-first, no `tailwind.config.js`) over v3 — less config, current shadcn support.
- Mobile icon dirs (`src-tauri/icons/{android,ios}`) gitignored — NoniOS is Windows-only; `tauri icon` emits them regardless.

### Manually verified vs. unit tested

- Everything in step 1 is verifiable on this (macOS) machine and was: gates + build + tests all run green here. No Windows-only behavior is involved yet, so nothing is deferred to real-hardware verification this step. `cargo clippy` compiled the Tauri crate for the macOS host — the Windows kiosk paths do not exist yet.

### Docs to update

- **CLAUDE.md** — none required. (Minor note: the `pnpm-workspace.yaml` line could be clarified to mention it also holds pnpm config, but current wording is not wrong.)
- **AGENTS.md** — none required.
- **DESIGN.md** — should specify the destructive/delete color explicitly (a hex for "red on hover"); implemented as `--danger #a23b2e` pending confirmation.

### Suggestions

- The provided `src/assets/logos/` files are the NoniOS **app icon set** (Tauri/Windows naming), not Netflix/Telefe brand logos. When brand logos are needed (Home tiles, step 9), they will have to be added separately; DESIGN.md's "first-party brand logos live in src/assets/logos/" may want a sub-folder split to avoid confusing the two.

### Next task

Build Order step 2 — `src-tauri/src/kiosk/` skeleton: fullscreen borderless window, taskbar hide/show, Alt+F4 interception (Win32, `#[cfg(windows)]`-gated with non-Windows stubs so the crate still builds on the dev host; runtime behavior pending verification on a real Windows machine). Preceded by the required `/brainstorming` pass.

---

## Session Report — Build Order steps 2 & 3 (Kiosk skeleton + Viewport scaling)

Task scope: Build Order step 2 (kiosk lockdown skeleton) + step 3
(useViewportScale). Both within one scoped block, under 3h.

### Skills activated this session

| Skill / Plugin    | Moment                       | Result                                                                 |
| ----------------- | ---------------------------- | ---------------------------------------------------------------------- |
| Ponytail full     | pre-hook every turn          | active                                                                  |
| security-guidance | pre-tool hook on Write/Edit  | active                                                                  |
| /brainstorming    | before starting step 2       | done as a self-exercise (per user's autonomous-run instruction — not the interactive skill); notes captured in the step-2 commit body and below |
| /execute-plan     | implementation               | skipped — following the Build Order directly, step by step             |
| TDD               | non-trivial code             | step 3: yes (pure scale fn test-first-style, 5 assertions). step 2: N/A — Win32 code isn't unit-testable; verified by cross-compile type-check instead |
| /ponytail-review  | before marking complete      | applied inline (dropped unused Result from taskbar; removed unused KioskError variant; kept engage/disengage symmetry deliberately) |
| /ponytail-audit   | new module start (kiosk/)    | applied inline — no explorer.exe kill, no hand-rolled FFI beyond the `windows` crate, minimal surface |
| /ponytail-debt    | end of session               | markers: NoniButton passthrough seed (step 1). No new debt markers in steps 2-3 |

### What happened

- **Step 2 — kiosk/:** `mod.rs` (engage/disengage, `KioskError` via thiserror, `ALLOW_USER_CLOSE`), `taskbar.rs` (hide/show `Shell_TrayWnd`), `keyboard_hook.rs` (`WH_KEYBOARD_LL` swallowing Win / Alt+Tab / Alt+F4 / Ctrl+Esc).
- `lib.rs`: fullscreen/borderless/always-on-top window via `tauri.conf.json`; `CloseRequested -> prevent_close()`; `engage()` wired into `setup()`, non-fatal on failure; no `.expect()` on the startup path.
- All Win32 gated `#[cfg(windows)]` with `cfg(not(windows))` no-op stubs so the crate builds/lints/tests on the macOS dev host.
- **Step 3 — useViewportScale:** pure `computeViewportScale()` + `useViewportScale()` hook + `ViewportScaler` wrapper; App scaffold now renders inside the fixed 1920×1080 scaled canvas.
- Gates: macOS `format:check`, `lint`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `pnpm build` all green; 8/8 Vitest tests.

### Brainstorming notes (step 2, kiosk)

- Worst failure: taskbar hidden + NoniOS dead = user trapped. Mitigation: the fullscreen always-on-top window is the *primary* cover; taskbar-hide is secondary; the watchdog (step 5) restores NoniOS; `disengage()` restores the taskbar for uninstall.
- Do NOT kill `explorer.exe` (breaks shell services, fragile) — hide the taskbar window only.
- Alt+F4 handled in two layers: Tauri `prevent_close()` (reliable) + the LL hook swallowing the keystroke.
- Ctrl+Alt+Del and Win+L are kernel Secure Attention Sequences — unblockable from user mode; require install-time machine policy (documented, out of scope).
- Multi-monitor secondary taskbar (`Shell_SecondaryTrayWnd`) out of scope — single-display kiosk target.
- LL hook callback kept trivial (no alloc/lock/panic) to stay under the ~300ms `LowLevelHooksTimeout`.

### Pending

- Nothing code-wise for steps 2-3. Next is step 4 (F4 admin hotkey).

### Decisions made

- **`windows` crate 0.61.3, pinned exact**, under `[target.'cfg(windows)'.dependencies]` so macOS never pulls it. `thiserror` 2.0.19 pinned exact.
- **`pub mod kiosk`** (not private `mod`) so `engage`/`disengage` are reachable lib API and don't trip `dead_code` — cleaner than `#[allow(dead_code)]`, and keeps the engage/disengage teardown symmetry a reviewer expects from a hook-installing module.
- **Taskbar hide is infallible/best-effort** — the fullscreen window is the real guarantee; a missing taskbar is a no-op, not an error. `KioskError` therefore carries only a `KeyboardHook` variant.
- **`computeViewportScale` uses `min()`** (contain + letterbox), never stretching — matches "never a responsive redesign."
- **Verification strategy for un-compilable Win32 code:** a throwaway crate depending only on `windows` 0.61.3, `cargo check --target x86_64-pc-windows-gnu`. This is now the repeatable way to type-check kiosk code on the macOS host without MSVC.

### Manually verified vs. unit tested

- **Step 3:** fully verified here — 5 unit tests on the scale math (incl. 1366×768 and 4K). 
- **Step 2:** IMPLEMENTED, PENDING MANUAL VERIFICATION ON REAL WINDOWS. macOS can only build the non-Windows stub path. The Windows Win32 path was **type-checked clean** against the real `windows` 0.61.3 crate via `cargo check --target x86_64-pc-windows-gnu` (this caught a real API mismatch: `SetWindowsHookExW`'s `hmod` is `Option<HINSTANCE>`). Type-checking is NOT runtime proof — that the taskbar actually hides, the keys are actually swallowed, and the window survives reboot/sleep-resume can only be confirmed on a real, powered Windows machine. Not done this session (no such machine available to me).

### Docs to update

- **CLAUDE.md** — none required.
- **AGENTS.md** — optional: could record the `cargo check --target x86_64-pc-windows-gnu` cross-check as the standard way to validate `kiosk/` Win32 code on a non-Windows host. Useful, not required.
- **DESIGN.md** — still open from step 1: specify the destructive/delete color hex (implemented as `--danger #a23b2e` pending sign-off).

### Suggestions

- When a real Windows machine is available, verify in this order: (1) window is truly fullscreen/borderless/topmost, (2) taskbar hidden, (3) each blocked combo (Win, Alt+Tab, Alt+F4, Ctrl+Esc) does nothing, (4) confirm Ctrl+Alt+Del/Win+L still work (expected — not blockable), (5) reboot and sleep/resume keep NoniOS in front (this also depends on step 5's Scheduled Task + watchdog).

### Next task

Build Order step 4 — `kiosk/admin_hotkey.rs`: F4 global shortcut wired to a placeholder Admin screen (needs a Home/Admin view toggle in the frontend). Preceded by a brainstorming pass; global-hotkey approach to be chosen (Tauri global-shortcut plugin vs. handling F4 in the existing LL keyboard hook).

---

## Session Report — Build Order step 4 (F4 admin hotkey)

Task scope: Build Order step 4 — F4 global shortcut → placeholder Admin screen.

### Skills activated this session

| Skill / Plugin    | Moment                      | Result                                                                    |
| ----------------- | --------------------------- | ------------------------------------------------------------------------- |
| Ponytail full     | pre-hook every turn         | active                                                                     |
| security-guidance | pre-tool hook on Write/Edit | active                                                                     |
| /brainstorming    | before starting step 4      | self-exercise (autonomous run): chose plugin over LL-hook handling; noted in commit |
| TDD               | non-trivial code            | N/A — registration/toggle is glue; validated by real compile (macOS) + build |
| /ponytail-review  | before marking complete     | inline — reused existing hook-block-list gap for F4, no new abstraction    |

### What happened

- `kiosk/admin_hotkey.rs`: F4 via `tauri-plugin-global-shortcut`, pulses `admin-hotkey` event; registered in `lib.rs` (non-fatal).
- `App.tsx`: listens for the event, toggles Home/Admin placeholders inside the scaled canvas.
- Dep `tauri-plugin-global-shortcut` pinned `=2.3.2`.
- All gates green (format, lint, cargo fmt, clippy, build) + 8 tests.

### Decisions made

- **Global-shortcut plugin over handling F4 in the LL keyboard hook** — keeps the hook callback trivial (no event emission) and follows Ponytail rung 5 (maintained crate over FFI). Bonus: cross-platform, so macOS clippy fully validates `admin_hotkey.rs`.
- **`admin_hotkey` is `pub mod` and NOT `#[cfg(windows)]`-gated** — it's the one kiosk file that runs on the dev host.
- Admin/Home placeholders are temporary and pre-i18n by necessity (Build Order sequences the hotkey at step 4, before i18n at step 7 and real screens at 8-9).

### Manually verified vs. unit tested

- `admin_hotkey.rs` is **compile-verified on macOS** against the real plugin API (a genuine improvement over the Win32 code, which is only cross-compile type-checked). Actual F4 keypress → Admin toggle at runtime is host-testable in principle but was NOT run this session (no interactive display driven); on real Windows it also interacts with the LL hook and should be confirmed there.

### Docs to update

- **CLAUDE.md / AGENTS.md** — none required.
- **DESIGN.md** — still open: destructive color hex (`--danger`), from step 1.

### Next task

Build Order step 5 — `watchdog/` (separate minimal Rust crate) + the two Scheduled Tasks (main app + watchdog). This is the reliability backbone; it needs a brainstorming pass and can only be truly verified with real reboot / sleep-resume cycles on Windows. The Scheduled Task registration will land as install scripts (`scripts/install/`), likely PowerShell driving `schtasks`/`Register-ScheduledTask`.

---

## Session Report — Build Order step 5 (Watchdog + Scheduled Tasks)

Task scope: Build Order step 5 — the `watchdog/` crate + the two reliability
Scheduled Tasks. Also formalized the `--danger` token in DESIGN.md (user-approved).
**STOP after this step** (per user): the three reliability pillars must be
verified on real Windows before building the rest of the app on top.

### Skills activated this session

| Skill / Plugin    | Moment                      | Result                                                                            |
| ----------------- | --------------------------- | --------------------------------------------------------------------------------- |
| Ponytail full     | pre-hook every turn         | active                                                                             |
| security-guidance | pre-tool hook on Write/Edit | active                                                                             |
| /brainstorming    | before starting step 5      | self-exercise (autonomous run): single-shot vs looping watchdog, detection method, session-0 GUI problem — notes in commit + below |
| /ponytail-audit   | new module (watchdog/)      | inline — zero deps, std only, single-shot; rejected `sysinfo`/toolhelp in favour of `tasklist` for minimal surface |
| TDD               | non-trivial code            | yes — pure `nonios_image_present` parse fn is test-first-style, 2 host-runnable tests |
| /ponytail-review  | before marking complete     | inline — kept the watchdog dependency-free and boring on purpose                  |

### What happened

- `watchdog/` (`nonios-watchdog`): zero-dependency, single-shot check (`tasklist`) + relaunch (`schtasks /Run /TN NoniOS`). 2 unit tests on the parse fn.
- `scripts/install/`: `Install-NoniOS.ps1` (registers both tasks, idempotent, admin-guarded, parameterised), `Uninstall-NoniOS.ps1`, `README.md`.
- DESIGN.md: `--danger` / `--danger-hover` added to the color table + a "semantic accents" note; `index.css` comment updated and `--color-danger` utilities exposed.
- Gates green across the whole repo (frontend + src-tauri + watchdog).

### Decisions made

- **Single-shot watchdog, cadence from Task Scheduler** (not an internal loop) — nothing long-running to hang; the scheduler is the reliable timer.
- **Detection via `tasklist`, zero deps** — a privileged relauncher should carry no third-party supply-chain surface. Case-insensitive substring match handles `nonios.exe` vs `NoniOS.exe`.
- **Relaunch via the Scheduled Task**, not by spawning the exe — inherits the task's privilege/session context.
- **⚠️ Tasks run INTERACTIVE, not SYSTEM/"whether logged on or not"** — a session-0 task hides the visible GUI. This deviates from CLAUDE.md's literal wording; it is the correct kiosk pattern (autologon + logon trigger + watchdog). **Flagged for your review.** If you want the literal SYSTEM behavior, that needs a session-token launcher (CreateProcessAsUser) — more complex and against the "boring" reliability rule; recommend against.
- **Autologon is out of step-5 scope** — it stores a password (admin-entered, Windows-managed, never in the repo). Documented as a reboot-recovery prerequisite.

### Manually verified vs. unit tested

- **Verified here (macOS):** watchdog fmt/clippy/build + 2 unit tests; windows branch type-checked via `cargo check --target x86_64-pc-windows-gnu`; all repo gates green.
- **PENDING real Windows:** every runtime behavior — the tasks actually registering/firing, the watchdog actually relaunching, and the kiosk lockdown itself. PowerShell and the Win32 paths cannot run on macOS. See the playbook below.

---

## 🔬 MANUAL VERIFICATION PLAYBOOK — reliability pillars (do this on real Windows)

Everything below requires a real Windows 10/11 machine you can power-cycle. None
of it could be verified on the macOS dev host. Do it in order.

### 0. Build on Windows

Prereqs: Node 22+, pnpm, Rust stable with the **MSVC** toolchain, VS Build Tools
(C++), WebView2 runtime (preinstalled on current Windows).

```powershell
pnpm install
pnpm tauri build                                   # -> src-tauri\target\release\<app>.exe (+ bundle\ installers)
cargo build --release --manifest-path watchdog\Cargo.toml   # -> watchdog\target\release\nonios-watchdog.exe
```

**Confirm the app's exe name** (Test 0a): note the file name produced under
`src-tauri\target\release\` (expected `NoniOS.exe`). With the app running, open
another terminal and run `tasklist /FI "IMAGENAME eq nonios.exe"`. If it lists
the process, the watchdog's case-insensitive `nonios.exe` match is correct. If
the exe has a different base name, tell me — it's a one-const change in
`watchdog/src/main.rs`.

> Testing tip — how to quit NoniOS during these tests: Alt+F4 is blocked and
> there is no close button (by design), and there is no graceful-quit path yet.
> Use **Ctrl+Alt+Del → Task Manager → End task** on the NoniOS process.
> ⚠️ Killing it this way does NOT restore the taskbar (no graceful teardown on
> kill). To get the taskbar back, restart Explorer (Task Manager → Run new task
> → `explorer.exe`), or just relaunch NoniOS. This is expected and is one reason
> the watchdog exists.

### 1. Kiosk lockdown (run `NoniOS.exe` directly, BEFORE installing tasks)

| # | Action | Expected |
| --- | --- | --- |
| 1a | Launch the app | Fills the whole screen, no title bar / borders, stays on top |
| 1b | Move mouse to the screen bottom | Windows taskbar does NOT appear (hidden) |
| 1c | Press the **Win** key | Start menu does NOT open |
| 1d | Press **Alt+Tab** | Task switcher does NOT appear |
| 1e | Press **Alt+F4** | NoniOS does NOT close |
| 1f | Press **Ctrl+Esc** | Start menu does NOT open |
| 1g | Press **F4** | Toggles to the Admin placeholder (cog + "Admin"); press F4 again → back to Home |
| 1h | Press **Ctrl+Alt+Del**, and separately **Win+L** | These DO still work — they are kernel Secure Attention Sequences a user-mode hook cannot block. Expected, not a bug. |

If any of 1c–1f let the OS through, the keyboard hook isn't engaging — capture
what happened and tell me.

### 2. Watchdog + Scheduled Tasks (install the tasks first)

```powershell
# Elevated PowerShell, from scripts\install\
.\Install-NoniOS.ps1 -InstallDir 'C:\path\to\the\two\exes'
Get-ScheduledTask -TaskName 'NoniOS','NoniOS Watchdog'   # confirm both exist
```

| # | Action | Expected |
| --- | --- | --- |
| 2a | With NoniOS running, End-task the NoniOS process | Within ~60s the watchdog relaunches it — NoniOS reappears on its own |
| 2b | Sleep the machine, then wake it | NoniOS is still in front (or the watchdog restores it within ~60s) |
| 2c | Reboot (see autologon note below), let it come back up | After logon, the `NoniOS` task launches it automatically |
| 2d | Check Task Scheduler → Task Scheduler Library → history for both tasks | Watchdog fires ~every minute; `NoniOS` fires at logon |

**Autologon for 2c:** the `NoniOS` task triggers *at logon*. For an unattended
reboot to recover, enable Windows autologon for the kiosk account (Sysinternals
**Autologon** or `netplwiz`). Without it, reboot recovery only happens after you
log in manually (which then fires the trigger). This is the documented
prerequisite; NoniOS never stores that password.

### 3. Report back

For each row: pass / fail + what you saw. Anything in section 1 failing points at
the keyboard hook or window flags; anything in section 2 failing points at the
Scheduled Tasks or the watchdog. I'll fix from there before building step 6+ on
top of this base.

### Docs to update

- **CLAUDE.md** — consider softening "Run whether user is logged on or not" for the app task to note the interactive-session requirement for the GUI (or confirm the interactive approach). Pending your call after verification.
- **AGENTS.md / DESIGN.md** — none.

### Next task (BLOCKED until you verify)

Build Order step 6 — `config/local_store.rs` + `lib/config.ts` (Zod schema, local JSON store, first-boot detection). **Not started**, per your instruction to stop after step 5 for real-Windows verification of the reliability pillars.

---

## Session Report — Windows verification round 1 fixes (keyboard hook, escape, watchdog diagnostics)

Scope: fixes/features on the already-built kiosk + reliability base, from the
user's real-Windows (Hyper-V / Win10) test results. NOT Build Order step 6.
Priority order followed: (1) escape dead-end + autostart, (2) keyboard hook,
(3) new features. Autostart switch (feature #2) deferred — see Pending.

### What happened

- **Keyboard hook rewritten to a dedicated thread** (`kiosk/keyboard_hook.rs`). Root cause of Win/Ctrl+Esc/Alt+Tab leaking: a `WH_KEYBOARD_LL` callback only fires while the *installing thread* pumps messages, which the Tauri main thread doesn't guarantee. Alt+F4 only looked blocked because Tauri's `prevent_close()` catches it independently. Now: dedicated thread + `GetMessage` loop, install result reported over a channel, blocks on key-down AND key-up. Type-checked vs. the real `windows` crate.
- **"Cerrar NoniOS" escape** — `exit_kiosk` Tauri command (disengage lockdown → restore taskbar → `app.exit`) behind a button in a new minimal Admin sidebar. Reached via F4 (focus-independent global hotkey). Solves the admin dead-end and also lets you exit NoniOS during testing without rebooting the VM.
- **`diag.rs`** — local-only log (`%LOCALAPPDATA%\NoniOS\nonios.log`) recording startup / kiosk-engage / hotkey-register results.
- **Watchdog diagnostics** — no console flash (`windows_subsystem` + `CREATE_NO_WINDOW`), and a local log (`%LOCALAPPDATA%\NoniOS\watchdog.log`) recording per-run whether NoniOS was seen running and the `schtasks /Run` exit code. Still zero-dependency.
- **Install script** — both task actions set `-WorkingDirectory` (tasks default to system32; a plausible launch failure).
- All gates green (frontend + src-tauri + watchdog).

### Decisions made

- Dedicated-thread hook over debugging the main-thread pump — canonical, removes all doubt, and reliability code should be right first time (CLAUDE.md).
- Escape is a *process exit* (watchdog relaunches if autostart on), not a hide — matches the "deliberate pause" the user described.
- Diagnosis-first for autostart: I can't reproduce off-Windows, so instead of guessing I instrumented the exact chain. Ruled out the "watchdog relaunches into session 0" hypothesis by confirming both tasks share the interactive `$principal`.

### Pending / deferred

- **Autostart switch (user feature #2)** — DEFERRED: it needs the local config layer (`autostart: boolean`), which is Build Order **step 6** (not yet built). It also should enable/disable both Scheduled Tasks as a pair. Recommend implementing it together with step 6. Flagged so it isn't forgotten.
- Admin is still a minimal shell (sidebar + escape only); the three real sections are step 8.
- Copy in Admin is temporary Spanish, pre-i18n (step 7).

### Manually verified vs. unit tested

- Verified here (macOS): all gates; new hook + watchdog windows branches type-checked via `cargo check --target x86_64-pc-windows-gnu`; watchdog parse tests pass.
- PENDING real Windows: every runtime behavior below.

---

## 🔬 RE-TEST ROUND 2 — what to test and how

Rebuild first (both binaries changed):

```powershell
pnpm install; pnpm tauri build
cargo build --release --manifest-path watchdog\Cargo.toml
```

### A. Keyboard hook (should now block; run NoniOS.exe directly)

| # | Action | Expected NOW |
| --- | --- | --- |
| A1 | Win key | Start menu does NOT open |
| A2 | Ctrl+Esc | Start menu does NOT open |
| A3 | Alt+Tab | Switcher does NOT appear |
| A4 | Alt+F4 | Still blocked |
| A5 | F4 | Toggles Home ↔ Admin |

Then open `%LOCALAPPDATA%\NoniOS\nonios.log` — expect a line
`kiosk lockdown engaged`. If instead you see `did NOT fully engage: ...`, paste
that line to me (it carries the exact Win32 error).

### B. Escape from the dead-end (the important one)

| # | Action | Expected |
| --- | --- | --- |
| B1 | With NoniOS in front, press **F4** | Admin opens (this is the key question you had pending — F4 is a global hotkey, so it should work even if the window is hogging focus) |
| B2 | In Admin, click **"Cerrar NoniOS"** | NoniOS exits to the real Windows desktop; the taskbar is back |
| B3 | (if tasks installed) wait ~60s | The watchdog relaunches NoniOS — confirming the "deliberate pause" behavior |

If B1 fails (F4 doesn't open Admin while trapped), that's important — tell me,
because the whole escape path depends on it.

### C. Autostart diagnosis (the reliability blocker)

First, **autologon must be configured** for the kiosk account or the logon
trigger never fires on reboot. Easiest safe way: Sysinternals **Autologon.exe**
(stores the password as an encrypted LSA secret, not plaintext). Then:

```powershell
# from an elevated prompt, in scripts\install\
.\Install-NoniOS.ps1 -InstallDir 'C:\path\to\the\two\exes'
```

Reboot. After it comes back up, collect these — they will pinpoint the break:

```powershell
Get-Content $env:LOCALAPPDATA\NoniOS\watchdog.log -Tail 20
Get-Content $env:LOCALAPPDATA\NoniOS\nonios.log   -Tail 20
Get-ScheduledTaskInfo -TaskName 'NoniOS'          | Format-List TaskName,LastRunTime,LastTaskResult
Get-ScheduledTaskInfo -TaskName 'NoniOS Watchdog' | Format-List TaskName,LastRunTime,LastTaskResult
```

How to read it (send me whatever you get):
- **Both logs empty after reboot** → the tasks never fired → autologon isn't set up (no logon = no trigger).
- **watchdog.log says "running task 'NoniOS'" + exit 0, but nonios.log has no new "NoniOS starting"** → the task ran but the app didn't start → check `NoniOS` `LastTaskResult` (path/permission) — likely a fixable task-config issue.
- **nonios.log shows "NoniOS starting" then "did NOT fully engage"** → app launched, lockdown errored → paste the error.
- **watchdog.log "schtasks /Run exited with exit status: 1"** → the NoniOS task itself refused to run → task config; send `LastTaskResult`.

Send me the four outputs and I'll know exactly what to fix.

### Next task (still BLOCKED on your verification)

Once autostart + the hook + escape are confirmed: Build Order step 6 (config
layer), which also unblocks the autostart switch (feature #2). Not started.

---

## Session Report — Round-2 diagnosis (old build) + programmatic autologon

Scope: user's round-2 results triage + user priorities (1) confirm build, (2)
programmatic autologon via LSA, (3) re-verify escape UI. NOT Build Order step 6.

### Key finding: round-2 was tested on an OLD binary

The tell: the user's Admin sidebar had **no "Cerrar NoniOS" button**, but that
button is unambiguously in the committed source (`src/screens/Admin/Admin.tsx`)
and `exit_kiosk` is in `lib.rs`. If the current `development` code had been
built, the button would be there. So the keyboard-hook result ("no change") and
the missing button both point to the same cause: the `.exe` under test predates
the round-1 fixes (it was the step-1–5 PR build). **The dedicated-thread hook fix
was never actually exercised.** Re-test needs a fresh build from `development`
HEAD. (I can't produce the Windows binary — macOS host, gates only.)

### What happened (this session)

- **Confirmed the old-build diagnosis** by grepping the committed source.
- **Programmatic autologon** (`kiosk/autologon.rs`): registry values + password as an LSA secret (`LsaStorePrivateData`), never plaintext registry, never logged. CLI subcommands `configure-autologon` (password via stdin) and `disable-autologon`. `Install-NoniOS.ps1` now prompts + configures it (`-SkipAutologon` to opt out); uninstall clears it.
- Security-sensitive LSA/registry FFI type-checked against the real `windows` crate (windows-gnu), incl. exact error-variant construction.
- All gates green.

### Decisions made

- **Autologon driven by the installer via a CLI subcommand of the main binary**, password piped on stdin (never argv, never a PowerShell var written to disk). The same `kiosk::autologon` module will later back the Admin autostart switch (feature #2).
- **LSA secret over plaintext `DefaultPassword` registry value** — matches the user's explicit instruction and Sysinternals' approach.

### Pending / deferred

- **Autostart switch (feature #2)** — still deferred: needs the config layer (`autostart: boolean`, Build Order step 6). The `kiosk::autologon` mechanism it will call now exists.
- Keyboard-hook fix + escape button are implemented but **unverified at runtime** (round-2 tested the old build).

### Manually verified vs. unit tested

- macOS: all gates; autologon FFI + hook + watchdog windows branches type-checked via windows-gnu; watchdog tests pass.
- PENDING real Windows (fresh build): keyboard hook, escape button, and the full autologon install cycle. **Autologon writes a real Windows password to the LSA store** — verify it does not appear in any log (`%LOCALAPPDATA%\NoniOS\*.log`) or the registry.

---

## 🔬 RE-TEST ROUND 3 — rebuild first, then test

> ⚠️ Build from the current `development` HEAD. Confirm the new build by checking
> that Admin's sidebar shows the **"Cerrar NoniOS"** button. If it doesn't,
> you're still on the old binary — stop and rebuild.

```powershell
git pull
pnpm install; pnpm tauri build
cargo build --release --manifest-path watchdog\Cargo.toml
```

### A. Keyboard hook (fresh build — this is the real first test of the fix)

Run NoniOS.exe directly. Win / Ctrl+Esc / Alt+Tab should now all do nothing;
Alt+F4 nothing; F4 toggles Admin. Then check
`%LOCALAPPDATA%\NoniOS\nonios.log` for `kiosk lockdown engaged` (if it says
`did NOT fully engage: ...`, paste that line).

### B. Escape from the dead-end

F4 → Admin → the **"Cerrar NoniOS"** button should be visible → click it →
NoniOS exits to the desktop, taskbar restored. (The autostart *switch* is NOT
here yet — that's feature #2 / step 6. Only the button.)

### C. Full autologon install cycle (no Sysinternals)

Both exes must be built first (the installer calls NoniOS.exe for autologon).

```powershell
# elevated, from scripts\install\
.\Install-NoniOS.ps1 -InstallDir 'C:\path\to\the\two\exes'
#   -> registers both tasks, then prompts: "Windows password for <user> (enables autologon)"
```

Verify autologon was set WITHOUT exposing the password:
```powershell
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v AutoAdminLogon
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultUserName
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultPassword  # EXPECTED: error / not found
```
`AutoAdminLogon`=1 and `DefaultUserName` set, but `DefaultPassword` must NOT
exist (it's an LSA secret, not a registry value). If `DefaultPassword` shows up
in the registry, that's a security bug — tell me immediately.

Then reboot and collect the four diagnostics (autologon should now make the
logon trigger fire on its own):
```powershell
Get-Content $env:LOCALAPPDATA\NoniOS\watchdog.log -Tail 20
Get-Content $env:LOCALAPPDATA\NoniOS\nonios.log   -Tail 20
Get-ScheduledTaskInfo -TaskName 'NoniOS'          | Format-List TaskName,LastRunTime,LastTaskResult
Get-ScheduledTaskInfo -TaskName 'NoniOS Watchdog' | Format-List TaskName,LastRunTime,LastTaskResult
```
Reading guide is in the round-2 report above. Also confirm the password appears
in NEITHER log. Send me the four outputs + the reg queries.

### Next task (still blocked on your verification)

Build Order step 6 (config layer) — which also unblocks the autostart switch
(feature #2). Not started.

---

## Session Report — Build Run Two (steps 6–12 + Windows CI) — branch `matiassimone/build-run-two`

Scope (user-approved plan, 2026-09-10): finish every remaining Build Order step
on the macOS host, move as much Windows verification as possible into CI, and
leave a single-afternoon manual playbook. Executed inline (autonomous run).

### Skills activated this session

| Skill / Plugin    | Moment                      | Result                                                                                                    |
| ----------------- | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| Ponytail full     | pre-hook every turn         | active                                                                                                    |
| security-guidance | pre-tool hook on Write/Edit | active                                                                                                    |
| /brainstorming    | before starting             | done as the assessment turn: four design decisions surfaced and approved (return-from-app, AnyDesk read-only, one app mechanism, updater deferred) |
| /writing-plans    | before code                 | used — `docs/superpowers/plans/2026-09-10-build-run-two.md` (decisions, interfaces, task list)             |
| /execute-plan     | implementation              | inline, task by task, gates after each                                                                    |
| TDD               | non-trivial code            | pure logic test-first: config parse/fallback (Rust + Zod), i18n parity, Get-StartApps parser, AnyDesk id, weather parsers, tile helpers, home reducer, date helpers, full-tree render under jsdom (36 Vitest + 8 cargo tests) |
| /ponytail-review  | before marking complete     | inline — lucide over SVG files, stdlib WAV generator over binary blobs, read-only AnyDesk, no portal Dialog, one PowerShell call for apps |
| /ponytail-debt    | end of session              | `ponytail:` markers: NoniButton passthrough seed (older). No new markers                                   |
| /ponytail-audit   | new modules                 | inline on launchers/, window_watcher, config/                                                              |

### What happened

- **Windows CI** (`.github/workflows/windows.yml`): frontend gates, MSVC fmt/clippy/test for both crates, `tauri build --bundles nsis`, watchdog release, artifacts; a `smoke` job runs `scripts/ci/Smoke-Test.ps1` on the runner. **First run: build green (the pre-existing kiosk/autologon Win32 code compiled clean on MSVC for the first time); smoke PASSED startup, `kiosk lockdown engaged`, F4 registration, both tasks, watchdog relaunch, autologon.** Two findings fixed: `disable-autologon` failed when the LSA secret was already gone (now tolerated); the runner image ships its own plaintext `DefaultPassword`, so the check compares against the pre-existing value. **Second and third runs: fully green.**
- **Install scripts** now drive `NoniOS.exe` (GUI subsystem) through `System.Diagnostics.Process` with redirected stdin — `$plain | & exe` does not reliably wait / return an exit code for GUI apps (likely a latent round-3 bug).
- **Step 6 config**: `config/{mod,local_store}.rs` (serde camelCase, atomic write, garbage → defaults), `get_config`/`save_config`/`set_autostart`, `kiosk/autostart.rs` (schtasks /Change on both tasks), `lib/config.ts` Zod mirror, `hooks/useConfig.tsx`.
- **Step 7 i18n**: es/en dictionaries (`satisfies`-locked), provider + `t()`, parity tests.
- **Step 8 Admin**: General (name, language, Open-Meteo geocoding, autostart switch), Tiles (reorder, re-detect, edit/delete, 2-step add, installed-app picker, empty state), Remote Access (AnyDesk ID read-only); first-boot notice + background detection of app tiles without a target. `installed_apps.rs` (Get-StartApps), `anydesk_setup.rs` (locate + `--get-id`).
- **Steps 9–12 Home**: header/grid/overlays, pure `homeMachine.ts`, `launchers/` (web → second always-on-top webview below a 120 px bar; app → `shell:AppsFolder\<AppID>` / exe), `kiosk/window_watcher.rs` (foreground polling, 20 s launch timeout, re-asserts topmost), `return_home`, generated WAVs.
- **Docs**: CLAUDE.md/AGENTS.md updated for the decisions and the real structure; `docs/verification/windows-round.md` is the single manual round.

### Decisions made

- Return-from-app mechanism, AnyDesk read-only, single app mechanism, updater deferred (all user-approved; recorded in CLAUDE.md).
- Glyphs via lucide-react (no `src/assets/icons/`); WAV instead of OGG, generated by a stdlib script.
- shadcn Dialog without Portal so modals stay inside the scaled canvas; the InAppBar is the one element deliberately portalled *outside* it (real pixels).
- New deps: `zod 4.6.1`, `neverthrow 8.2.0` (exact). `pnpm-workspace.yaml` / `.npmrc` untouched.

### Pending / deferred

- Brand logos + "upload image" icon option (needs fs/dialog plugins, trademark review).
- Tauri updater (step 13) — after a stable v1.
- AnyDesk silent install — only if administrators ask.
- Manual verification round (below).

### Manually verified vs. unit tested

- **Verified on Windows (CI runner, ephemeral):** startup, lockdown engaged, F4 registration, task registration, watchdog relaunch, autologon registry shape + password not in logs, uninstall. Build with MSVC.
- **Verified on macOS:** all gates, 36 Vitest (incl. full App tree render), 8 cargo tests.
- **NOT verified anywhere yet (needs a human + real hardware):** real keypresses against the hook, reboot with autologon, sleep/resume, Netflix Store launch + return via the foreground watcher, the web-tile window + bar geometry on a real monitor/DPI, Admin UI look on a real display, AnyDesk detection. All in `docs/verification/windows-round.md`.

### Docs to update

- **CLAUDE.md / AGENTS.md** — updated this session (return mechanism, AnyDesk scope, structure, CI gate).
- **DESIGN.md** — could record the "Back to home" bar (120 px, real pixels) as the return affordance for web tiles; not blocking.

### Next task

Run `docs/verification/windows-round.md` on a real Windows machine using the CI artifact; fix from the report; then merge `matiassimone/build-run-two` → `development` (human checkpoint).

### Addendum — three CI findings after the report above

- `window_watcher.rs` (Windows body): the spawn-failure fallback borrowed the `AppHandle` already moved into the thread. Caught only by MSVC; fixed by cloning the handle. This is exactly why the macOS host cannot be the last gate.
- The CI gate steps ran under PowerShell, which does **not** stop a multi-line `run` when a native command exits non-zero — clippy had failed while the step showed green. Gate steps now use `shell: bash` (`-eo pipefail`).
- With real gates on, Prettier flagged every file: `actions/checkout` on Windows applied `autocrlf`. Added `.gitattributes` (`* text=auto eol=lf`, binaries marked) — also protects anyone cloning on Windows.

Final state: run `34546063450` on `matiassimone/build-run-two` — build **and** smoke green with enforced gates; every smoke check PASS.

## Session Report — Kiosk reliability review (branch `matiassimone/build-run-two`, 2026-09-11)

Scope: user asked to compare our kiosk/autostart approach against Windows-native
kiosk modes and commercial kiosk software before the manual round.

### What happened

- **Verdict:** our autologon + at-logon task + watchdog is the standard trio (Microsoft's Shell Launcher does the same and restarts the shell on exit). Commercial kiosks additionally replace `explorer.exe` as shell; Shell Launcher needs Enterprise/Education/IoT. Decision: stay on top of explorer for v1, shell replacement documented as upgrade path (CLAUDE.md → Reliability Architecture).
- **Gaps closed:** watchdog kills a *Not responding* NoniOS before relaunching (hangs, not just crashes) and honours `autostart:false` from `config.json`; `configure-autologon` sets `DevicePasswordLessBuildVersion=0` (Windows 11 otherwise ignores AutoAdminLogon on Microsoft-account machines); installer disables sign-in on wake (`CONSOLELOCK`), secure screen saver and lock screen (uninstaller reverts); hook also blocks Alt+Esc (Ctrl+Shift+Esc was already covered by the Ctrl+Esc rule); the Admin switch saves the flag before touching the tasks and explains a permissions failure.
- **Smoke test** now checks CONSOLELOCK AC/DC, NoLockScreen, DevicePasswordLessBuildVersion and that the watchdog stays quiet with `autostart:false`.
- Playbook: Hyper-V *Enhanced Session* explains earlier "autostart didn't fire" results (autologon lands in the console session); recommends a dedicated local account; adds hang, lock-screen and Ctrl+Shift+Esc rows.

### Manually verified vs. unit tested

- Unit: `autostart_disabled` parser (watchdog). CI smoke: registry/powercfg shape + watchdog quiet path. Hang detection path itself needs a real frozen process (playbook row 5b').

### Next task

Manual round with the new artifact; then merge to `development` (human checkpoint).

### Addendum — wake-password setting

`powercfg` could not show the "Require a password on wakeup" value on Windows 11
because the setting is marked hidden; the installer now runs
`powercfg /ATTRIBUTES SUB_NONE 0e796bdb-… -ATTRIB_HIDE` first and addresses the
setting by GUID (the `CONSOLELOCK` alias is not defined on every build). Run
`34596609890`: build + smoke green, all checks PASS including the new
autostart-off, hang-kill path (parser), PasswordLess and lock-screen checks.
