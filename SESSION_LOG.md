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
