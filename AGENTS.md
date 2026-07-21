# NoniOS - AGENTS.md

Always-on rules for Claude Code. Read `CLAUDE.md` for full architectural context.

---

## Dependency Management

**No carets or tildes in `dependencies` or `devDependencies`.** Ever. All non-peer dependencies use exact versions — this matters more, not less, now that strangers will `pnpm install` this repo on their own machines.

```json
// correct
"dependencies": { "zod": "3.24.1" }
"devDependencies": { "vitest": "3.2.4" }

// never
"dependencies": { "zod": "^3.24.1" }
```

**Exception — `peerDependencies` use ranges intentionally.**

**pnpm security config lives in `pnpm-workspace.yaml`, not `package.json`:**
- `saveExact: true` — enforces exact versions on `pnpm add`
- `allowBuilds` — allowlist for lifecycle scripts

`.npmrc` holds the rest (`ignore-scripts=true`, `registry`, etc.). Never modify either file without flagging it in the session report.

**Adding a new dependency checklist:**
1. Check if an existing package already covers the need — this project is small, it is very easy to accidentally reinvent something (Ponytail rung 2/5). This includes not reaching for a full i18n framework (`react-i18next`, `formatjs`) — the custom `src/i18n/` dictionary is the deliberate choice for two static locales.
2. `pnpm add package@x.y.z` with the exact version.
3. Verify no `^` or `~` was introduced.
4. If it needs lifecycle scripts, add it to `allowBuilds` and document why in the session report.

**Rust crates:** same philosophy, pin versions in `Cargo.toml` rather than relying on loose semver ranges for anything touching `kiosk/`, `anydesk_setup.rs`, or the watchdog.

---

## File and Component Naming

**Rust modules (`src-tauri/src/`, `watchdog/src/`):** one file per responsibility, named for what it does, not generically (`keyboard_hook.rs`, not `hook.rs`).

**Custom shadcn/ui components:** PascalCase prefixed with `Noni`, mirroring Zelvem's `Zelvem*` convention.

```
NoniButton.tsx
NoniCard.tsx
NoniTile.tsx
```

Never modify shadcn primitives in `src/components/ui/` in place — extend them into a `Noni*` component instead.

**Tauri commands (Rust functions exposed to the frontend):** snake_case, verb-first, and named for exactly what they do — `launch_tile`, `get_config`, `save_config`, `list_installed_apps`, `set_locale`. The frontend never constructs shell commands or file paths itself; it only calls these.

**i18n keys:** dot-namespaced by screen/section, `screen.section.element` — `home.greeting`, `admin.tiles.addButton`, `admin.general.languageLabel`, `admin.remoteAccess.copyId`. Keeps a 200+ key dictionary scannable as the project grows. Section names in keys are always English (`tiles`, `remoteAccess`, `general`) even though the design prototype's Spanish copy uses "Accesos" as the on-screen label for the `tiles` section — the key names the concept, the dictionary value is what's actually shown.

---

## Engineering Conventions

**Testing: Vitest**
Unit tests for anything genuinely testable without a live Windows environment: config Zod schemas and their fallback behavior, weather client parsing, tile-launch decision logic (given a `TileSource`, which Tauri command gets called), and the i18n dictionary/type-sync itself (a test that both locale files export the exact same key set catches drift even before the `satisfies` type check would in some editor setups). Test files live alongside the code they test (`*.spec.ts`).

Native Win32 code (`kiosk/`, `anydesk_setup.rs`, the watchdog) is inherently hard to unit test meaningfully — favor small, readable functions with clear preconditions/postconditions over forcing test coverage that doesn't catch real bugs. Flag any such module explicitly in the session report as "manually verified, not unit tested."

**Environment variables**
NoniOS has very few — this is a single-machine app, not a service with infra config. Whatever does exist (build-time flags only, never secrets) is documented in `.env.example` with a descriptive comment. No AnyDesk credential, Netflix AUMID, user config value, or locale preference is ever an env var — those are runtime, per-machine, local config, not build-time.

**Error handling: Result pattern**
Use `neverthrow` on the TypeScript side for recoverable errors (config read/write, weather fetch). On the Rust side, use `Result<T, E>` idiomatically with `thiserror` for typed errors in `kiosk/` and `launchers/` — never `.unwrap()` in code that runs on every boot.

```rust
// never, in startup-path code
let config = load_config().unwrap();

// correct
let config = load_config().unwrap_or_else(|_| Config::default());
```

**Validation**
`config/local_store.rs` (Rust) and `lib/config.ts` (frontend) both validate against the same shape, including the `locale` field — keep the Zod schema and the Rust struct's field names in sync manually, since this project has no shared-codegen layer. Document the schema version in the config file itself so a future format change can migrate old configs instead of discarding them.

**Linting and formatting**
- `pnpm lint` — ESLint flat config (eslint recommended + typescript-eslint recommended + react-hooks).
- `pnpm format` — Prettier, writes in place.
- `pnpm format:check` — CI-ready, fails on drift.
- `cargo fmt --check` and `cargo clippy -- -D warnings` for both `src-tauri/` and `watchdog/`.

Gates before marking any task complete (in order):
```
pnpm format:check
pnpm lint
cargo clippy -- -D warnings
pnpm build
```

---

## Stack Rules

- **UI:** always `shadcn/ui` wrapped into `Noni*` components. Never native HTML inputs when a styled component exists.
- **Native lockdown code:** lives only in `src-tauri/src/kiosk/`. If you find yourself calling `winapi`/`windows` crate functions for hiding UI, hooking input, or managing focus anywhere outside that folder, stop and move it there first.
- **Launch mechanisms:** live only in `src-tauri/src/launchers/`. Adding a new way to start something external (a third pattern beyond "installed app" and "URL") requires a concrete need, not speculative flexibility.
- **Tiles:** always data (config rows), never hardcoded per-app branches in the frontend. Netflix and Telefe are seed data, treated identically to anything an administrator adds. Reordering in Admin → Tiles is up/down buttons on each row, never drag-and-drop — the design deliberately avoids that interaction, don't add it as a "nicer" alternative.
- **i18n:** always through `t(key)` from `useTranslation()`. No string literal shown to the end user or administrator anywhere in JSX.
- **Packages:** this is a single-package repo. Do not introduce a monorepo/workspace split unless a second genuinely independent deliverable appears (the `watchdog/` binary is the one existing exception, and it stays minimal on purpose).
- **Assets:** if a file is consumed by an `import` or `<img src>`, it lives in `src/assets/`. If it's visual reference for humans, it lives in `docs/design/`.
- **Config:** `config/local_store.rs` is the only Rust code that reads/writes the local JSON config file. Frontend code always goes through the `get_config`/`save_config` Tauri commands, never touches the filesystem directly.

---

## Code Standards

- All code, variable names, and comments in **English**. All user-facing strings (Spanish and English both) go through the i18n layer — see `CLAUDE.md` → Internationalization.
- Comments follow **TSDoc** on the TypeScript side, standard `///` doc comments on the Rust side. Only comment the *why*.
- CSS custom properties use English names: `--ink`, `--paper`, `--moss`, `--muted`.
- **Import order**: (1) external packages, (2) internal aliases (`@/lib`, `@/components`, `@/i18n`), (3) relative imports — blank line between groups.
- **Named exports only** — no default exports except screen-level React components and Vite's entry point.
- **No `any`** — use `unknown` and narrow with Zod. Any `eslint-disable` on an `any` requires an explicit comment.
- **No TypeScript `enum` keyword** — use `as const` + union type.

---

## Ponytail Mode

Mode: **`full`**. Never default to `ultra` on `src-tauri/src/kiosk/` or `src-tauri/src/anydesk_setup.rs` — these need to be right the first time, not iterated on live on someone's relative's machine.

Ponytail's rung 5 ("already-installed dependency") applies to:
- `shadcn/ui` components over native inputs
- Maintained Rust crates (e.g. a global-hotkey crate, a window-enumeration crate) over hand-rolled Win32 FFI where one exists
- Existing local-store/Zod patterns over new ad hoc parsing
- The custom `src/i18n/` dictionary over a full i18n framework, for as long as there are only two locales

**Deliberate shortcut annotation:**
```ts
// ponytail: polling the window list every 1s instead of an event-driven hook — revisit if this ever shows CPU impact on low-spec hardware
```

**Commands:**

| Command | When |
|---|---|
| `/ponytail-review` | Before marking any task complete |
| `/ponytail-audit` | At the start of a new module |
| `/ponytail-debt` | End of every session |
| `/ponytail lite\|full\|ultra\|off` | `off` only if a task genuinely needs upfront structure |
| `/ponytail-help` | Quick command reference |

---

## Superpowers Integration

**Before starting any new feature or module:** `/brainstorming` first, especially for anything touching `kiosk/`, `anydesk_setup.rs`, or the watchdog — these are exactly the modules where an edge case missed at design time becomes a real-world failure for a real person. Skip only for trivial changes.

**For implementation tasks:** `/execute-plan` to batch work into reviewable checkpoints. The code-reviewer agent evaluates against this `AGENTS.md` and `CLAUDE.md` automatically.

**For all non-trivial code:** TDD where the code is genuinely testable (see Testing above). For native lockdown code that isn't, manual verification on a real Windows VM/machine before considering it done — a passing `cargo build` proves nothing about whether the taskbar actually stays hidden after a real reboot.

**For debugging:** reproduce, root cause, hypothesis, fix. If three fix attempts fail, stop and flag for architectural review — do not keep patching a kiosk-lockdown bug under time pressure.

---

## Security

The **security-guidance** plugin runs automatically as a pre-tool hook on every Write/Edit/MultiEdit, same as Zelvem. Treat its warnings as blockers.

NoniOS-specific rules, enforced here because they're outside the plugin's generic scope:

- **No AnyDesk ID, password, or unattended-access credential ever enters the repository** — not in code, not in `.env.example`, not in a comment, not in a commit message, not in a test fixture. These are generated/entered at install time and live only in the machine's local state or in AnyDesk's own storage.
- **`anydesk_setup.rs` only ever writes credentials to AnyDesk's own configuration** (via its documented CLI), never to NoniOS's own config file or logs.
- **No telemetry, no phone-home, ever, for any install.** Not for usage stats, not for crash reports, not for update checks beyond fetching the public static release manifest. Every install is a black box to the maintainers by design.
- **The end-user's activity is not logged or transmitted anywhere.** Which tile they opened, when, stays ephemeral (in-memory, for the window watcher's own bookkeeping) unless an administrator deliberately adds local crash logs for their own debugging — and if so, those logs never leave that specific machine except through an AnyDesk session that administrator personally initiates.
- **`config/local_store.rs` is the only Rust code that touches the local config file on disk.** No other module reads or writes it directly.
- **The keyboard hook (`kiosk/keyboard_hook.rs`) blocks only documented, specific key combinations** (Win key, Alt+Tab, Ctrl+Esc) — it must never become a general-purpose keylogger, even for debugging.
- **The installed-apps enumeration (`installed_apps.rs`) only reads what's needed to populate the Admin picker** (name, icon, launch identifier) — it does not need to and should not collect anything beyond that.

---

## Session Discipline

Each session targets a single, scoped task completable in ~3 hours — same discipline as Zelvem.

**Start of session:**
1. State the task and its scope explicitly.
2. If it could exceed 3 hours, split it and confirm the boundary before starting.
3. Read the relevant files before touching them — for `kiosk/` or `anydesk_setup.rs`, also re-read the Security section above before starting.

**During session:**
- One thing at a time. Finish and test before moving to the next file.
- If something requires a real Windows machine to verify (taskbar hiding, keyboard hook, autostart behavior), say so explicitly rather than marking it done on the strength of a successful build.
- If something unexpected requires a significant architectural decision, stop and surface it rather than improvising — especially anything that touches the reliability architecture (Scheduled Task + watchdog).

**End of session:**

```
---
## Session Report

### Skills activated this session
| Skill / Plugin | Moment | Result |
|---|---|---|
| Ponytail full | pre-hook every turn | active |
| security-guidance | pre-tool hook on Write/Edit | active |
| /brainstorming | before starting task | [ used / skipped — reason ] |
| /execute-plan | implementation | [ used / skipped — reason ] |
| TDD | non-trivial code | [ used / skipped — reason ] |
| /ponytail-review | before marking complete | [ used / skipped — reason ] |
| /ponytail-debt | end of session | [ used / skipped — reason ] |
| /ponytail-audit | new module start | [ used / skipped — reason ] |

### What happened
- [ short bullet list, one line each ]

### Pending
- [ what was not finished and why ]

### Decisions made
- [ any architectural or implementation decision taken that was not pre-defined ]

### Manually verified vs. unit tested
- [ explicit note on anything that only a real Windows machine could confirm, and whether that verification happened this session ]

### Docs to update
- **CLAUDE.md** — [ what needs to be added or changed, or "none" ]
- **AGENTS.md** — [ what needs to be added or changed, or "none" ]
- **DESIGN.md** — [ what needs to be added or changed, or "none" ]

### Suggestions
- [ optional: patterns observed, risks spotted — omit if nothing to flag ]

### Next task
[ single sentence describing the logical next step ]
---
```

---

## Build Order (reference)

1. Tauri + React + TS + Tailwind + shadcn scaffold.
2. `src-tauri/src/kiosk/` skeleton: fullscreen borderless window, taskbar hide/show, Alt+F4 interception.
3. `hooks/useViewportScale.ts` — the fixed 1920x1080 canvas + scale-to-real-resolution mechanism, verified on at least one non-1080p test resolution before building anything on top of it.
4. `src-tauri/src/kiosk/admin_hotkey.rs` — F4 global shortcut wired to a placeholder Admin screen.
5. `watchdog/` — the separate binary, plus the two Scheduled Tasks, verified with real reboots/sleep-resume.
6. `config/local_store.rs` + `lib/config.ts` — the Zod schema (`user`, `weather`, `tiles`, `anydeskId`, `schemaVersion`) and local JSON store, with safe-default fallback and a "no config file found" case that flags first boot.
7. `src/i18n/` — `es.ts`, `en.ts`, `useTranslation()` hook, wired before any screen has real copy in it.
8. Admin screen, built first (not Home) since first boot opens directly into it: General section, then Tiles section (list + add flow: URL tiles first, installed-app picker second, needs `installed_apps.rs`), then Remote Access (`anydesk_setup.rs`, silent install + unattended-access password entry, ID display).
9. Home screen: greeting + date + weather header, then the tile grid with Netflix and Telefe seeded as the first two tiles, reading from the same config Admin writes to.
10. `launchers/netflix.rs` and `launchers/webview_app.rs` — get both launch paths working end to end (Netflix via `targetKind: "aumid"`, Telefe via `targetKind: "url"`).
11. Home's `launching` → `inApp` → `returning` state machine, driven by real `kiosk/window_watcher.rs` events instead of the prototype's placeholder timers.
12. Bundled audio assets (`tap.ogg`, `return-home.ogg`) wired into the `launching`/`returning` transitions, replacing the prototype's Web Audio oscillators.
13. Tauri updater wiring + `develop`/`main` release flow — once there's a stable v1 to actually update to.
