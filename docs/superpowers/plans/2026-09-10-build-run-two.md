# Build Run Two — finish NoniOS for a single Windows verification round

> **For agentic workers:** executed inline in the authoring session (the user asked for
> autonomous execution). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Build Order steps 6–12 plus a Windows CI so that everything that can be
verified without a physical Windows machine is verified before the one manual round.

**Architecture:** Keep the existing split: `kiosk/` owns every Win32 call, `launchers/` owns
starting external things, `config/local_store.rs` owns the JSON file. The frontend gets a
config context, an i18n context, the real Admin and Home screens, and a Home state machine
driven by Rust events. GitHub Actions `windows-latest` builds both binaries, runs clippy on
real MSVC, and smoke-tests the reliability chain (start → lockdown log → tasks → watchdog
relaunch → autologon registry shape) on the runner.

**Tech Stack:** Tauri 2.11 / React 19 / TS 5.9 / Tailwind 4 / shadcn / Zod / Vitest;
Rust `windows` 0.61.3; PowerShell for install scripts; GitHub Actions.

**Spec:** `CLAUDE.md`, `AGENTS.md`, `docs/design/app/DESIGN.md` (+ the two `.dc.html`
prototypes for layout and copy).

## Global Constraints

- Exact dependency versions only (no `^`/`~`); Rust crates touching `kiosk/` pinned `=x.y.z`.
- All user-facing strings via `t(key)`; keys `screen.section.element`, English section names.
- Named exports only (screens may default-export); no `any`; no `enum`.
- Prettier: no semicolons, single quotes, width 100, trailing commas.
- Win32 only inside `src-tauri/src/kiosk/`; launch logic only in `src-tauri/src/launchers/`.
- Startup path never panics; every lockdown failure is logged and non-fatal.
- No telemetry, no secrets in the repo.

## Decisions locked for this run (approved by the user 2026-09-10)

1. **Returning from an external app.** Web tiles open in a second Tauri webview window that
   is always-on-top and positioned *below* a 120 px strip; the main window keeps that strip
   and renders a large "Volver al inicio" bar there. Closing that window = returning. App
   tiles (Netflix): the main window drops always-on-top while the app is in front (it stays
   fullscreen *behind* the app, so the desktop is never visible), and `window_watcher.rs`
   polls `GetForegroundWindow`: first a foreign window → `inApp`; then our HWND foreground
   again → `returning`, and always-on-top is re-asserted. A 20 s launch timeout also returns.
2. **AnyDesk v1 = read-only.** `anydesk_setup.rs` locates an installed `AnyDesk.exe`, runs
   `--get-id`, and returns the ID. No download, no silent install, no password handling.
3. **One app mechanism.** `installed_apps.rs` shells `Get-StartApps` (PowerShell) → name +
   AppID for Store *and* classic apps; launching uses `explorer.exe shell:AppsFolder\<AppID>`
   for `targetKind: 'aumid'`. `targetKind: 'exe'` stays for hand-entered paths.
4. **Updater deferred** until there is a stable v1 to update to.
5. **Icons** = lucide-react glyphs keyed by the DESIGN.md glyph names (no SVG files to
   maintain). Seeds use `play` (Netflix) and `tv` (Telefe); brand logos and "upload image"
   are deferred (trademark + needs fs/dialog plugins).
6. **Audio** = two short WAVs generated deterministically (`scripts/audio/generate.py`,
   stdlib `wave`), matching the prototype's chords. Swappable later.

## Interfaces (shared by every task)

Config file `<app_data_dir>/config.json`:

```ts
type Locale = 'es' | 'en'
type TileKind = 'app' | 'web'
type TargetKind = 'aumid' | 'exe' | 'url'
type IconKey = 'play'|'tv'|'photos'|'phone'|'video'|'music'|'globe'|'book'|'heart'|'weather'
interface Tile { id: string; name: string; kind: TileKind; icon: IconKey; target: string; targetKind: TargetKind }
interface Config {
  schemaVersion: 1
  user: { name: string; locale: Locale }
  autostart: boolean
  weather: { city: string; lat: number; lon: number } | null
  tiles: Tile[]
  anydeskId: string | null
}
```

Tauri commands (Rust → snake_case):

| Command | Args | Returns |
| --- | --- | --- |
| `get_config` | – | `{ config: Config, firstBoot: boolean }` |
| `save_config` | `config: Config` | `()` |
| `set_autostart` | `enabled: boolean` | `()` (enables/disables both Scheduled Tasks) |
| `list_installed_apps` | – | `InstalledApp[]` = `{ name, appId }` |
| `launch_tile` | `tileId: string` | `()` — emits watcher events afterwards |
| `return_home` | – | `()` — closes the web tile window, cancels the watcher, re-asserts the kiosk window |
| `get_anydesk_id` | – | `string \| null` |
| `exit_kiosk` | – | existing |

Events (Rust → webview): `admin-hotkey` (existing), `external-app-shown`, `external-app-closed`.

## Tasks

- [x] **Task 1 — Windows CI** `.github/workflows/windows.yml`: gates, MSVC clippy/test, build
      both exes, smoke test, upload artifacts. Verify: workflow green on push.
- [x] **Task 2 — Config layer** `config/local_store.rs`, `lib/config.ts` (Zod + fallback),
      `kiosk/autostart.rs`, `hooks/useConfig.tsx`. Tests: schema fallback, seed defaults.
- [x] **Task 3 — i18n** `i18n/es.ts`, `en.ts`, `useTranslation.tsx`. Test: key parity.
- [x] **Task 4 — Admin** General / Tiles (+ add/edit modals, installed-apps picker, re-detect)
      / Remote Access; `installed_apps.rs`, `anydesk_setup.rs`; `Noni*` wrappers
      (`NoniInput`, `NoniCard`, `NoniLogo`, `NoniIconGlyph`, `NoniModal`).
- [x] **Task 5 — Home + launchers + watcher + audio** `launchers/`, `kiosk/window_watcher.rs`,
      `Home.tsx` state machine (pure reducer + test), `HomeHeader`, `TileGrid`, `lib/weather.ts`
      (Open-Meteo, tested parse), `InAppBar`, WAV assets.
- [x] **Task 6 — Docs + playbook** update CLAUDE.md/AGENTS.md deviations, SESSION_LOG report,
      single-afternoon manual verification playbook.
