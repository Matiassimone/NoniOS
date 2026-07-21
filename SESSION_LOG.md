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
