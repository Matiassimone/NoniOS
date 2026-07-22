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
