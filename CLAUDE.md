# NoniOS - CLAUDE.md

This file is the source of truth for Claude Code. Every architectural, stack, and product decision documented here was made deliberately. Do not propose alternatives to decisions already made unless a concrete problem justifies it.

---

## What is NoniOS

NoniOS is an **open-source accessibility kiosk launcher** for Windows (MIT licensed). It is not a productivity app and not a hosted service. It is built so that **anyone** can install it on a family member's machine to give them a radically simplified, single-purpose computer: an elderly or cognitively/motor-impaired end user who must never be exposed to the standard Windows desktop, taskbar, or any UI surface they didn't explicitly ask for.

**Archetype: "The Guardian Room"** — one door in, one door out, nothing else visible. The system takes full responsibility for what the end user sees; the end user never has to remember a sequence of steps. Every installation is independent — there is no shared backend, no cloud, no cross-user data. What we (the maintainers) ship is new versions of the app itself, nothing more.

**Core principle (affects both architecture and product decisions):**
> Every screen the end user can reach must be reachable in exactly one tap, with no confirmation step, no hidden state, and no way to get lost. If a feature requires the end user to remember something between sessions, it does not belong in Home — it belongs in the Admin panel, configured once by whoever administers that specific machine.

**Reliability principle (overrides convenience, always):**
> NoniOS launching successfully after every boot, resume, or crash is a harder requirement than any feature. A missed autostart means the end user is looking at bare Windows, which they cannot operate and will not know how to escape. This is not an edge case to "handle gracefully" — it is the single failure mode the entire native layer exists to prevent. When a reliability decision and a simplicity decision conflict, reliability wins.

Any feature that breaks either of these breaks the product's promise.

---

## Deployment Model

NoniOS is a **single-machine, single-install** product distributed as open-source code (MIT) — not a hosted service. There is no backend, no multi-tenant auth, no database server, no telemetry, and **no data ever crosses between installations**. Every person who downloads, builds, or forks NoniOS gets their own fully isolated install: their own local config, their own AnyDesk unattended-access credentials, their own everything. What the maintainers of this repo deploy is new versions of the app itself (via the public release channel); we never see or touch any individual installation's data or remote-access credentials.

There are two roles on every single install, with very different needs:
- **The end user** (e.g. a grandmother): sees only the Home screen and the tiles configured for that machine. Never sees admin, never sees Windows.
- **The administrator** (whoever set the machine up — a family member, a caregiver, anyone): reaches the hidden Admin screen via a physical hotkey (`F4`) to run first-time setup and later reconfigure Home, tiles, language, and AnyDesk.

Because every install is isolated and the administrator is physically the only person who can reach Admin on that specific machine, **Admin has no PIN by default** — the hotkey plus physical access to the machine is the access control. This is not a security gap that needs a server-side fix; it's a correct match for a product with no cloud component. A PIN could be added later as an opt-in Admin setting if real users ask for it, but it's not a v1 requirement.

---

## First Boot

**Decision (superseding the earlier standalone "Setup Wizard" concept):** there is no separate wizard screen set. The actual Home and Admin designs only cover two surfaces, and Admin's three sections (General, Tiles, Remote Access) already contain every field a first-time setup would need. Building a third, parallel set of wizard screens would duplicate that UI for no real benefit — a clear YAGNI call.

Instead: **on first boot (no local config file found yet), NoniOS opens directly into Admin instead of Home**, pre-populated with sensible defaults (English as a neutral fallback locale, empty name, no weather location, Netflix + Telefe seeded as tiles pending AUMID detection). The administrator fills in General, adds/confirms Tiles, and sets up AnyDesk under Remote Access — using the exact same UI they'll use later to make changes. A "Finish setup" affordance (or simply pressing "Back to Home" once the minimum required fields are filled) transitions into Home for the first time.

This means:
- **AnyDesk is read-only in v1 (decided 2026-09-10):** Remote Access locates an already-installed AnyDesk and shows the ID it reports (`AnyDesk.exe --get-id`). NoniOS does not download or silently install AnyDesk (a runtime network + supply-chain dependency that cannot be verified off Windows) and never touches the unattended-access password — the administrator installs AnyDesk from the desktop ("Close NoniOS" gets them there) and sets the password inside AnyDesk. Revisit silent install only if real administrators ask for it.
- **Netflix AUMID detection** runs automatically in the background on first boot and simply shows as "detected" / "not detected — install Netflix and retry" on the Netflix tile row, same as the "re-detect" action described in Screens → Admin.
- There is no dedicated `screens/Setup/` folder — see the updated Repo Structure below.

---

---

## Coding Agent

This project uses **Ponytail** in `full` mode as a discipline layer, same as Zelvem. It applies YAGNI before writing any code.

**Superpowers** and the **security-guidance** plugin are active in this environment too — same workflow as Zelvem, not a lighter version. A kiosk app that hooks keyboards and auto-installs remote-access software, and that will be forked and run by strangers, is exactly the kind of code that benefits from a security pre-tool hook catching mistakes before they ship to a machine no one on this team will ever see.

The most important project-specific rules (full list in `AGENTS.md`):

- **UI:** always use shadcn/ui as the base, wrapped into `Noni*` components — never raw shadcn primitives, never native HTML inputs when a styled component exists.
- **Native lockdown code (kiosk hooks, keyboard interception, taskbar hiding) lives in its own isolated Rust module** (`src-tauri/src/kiosk/`), never inlined into `main.rs` or mixed with feature code. This is a security-auditability requirement, not a style preference — this project is MIT and forkable, so "what can this binary do to the OS" must be readable in one place for anyone reviewing it before they install it on a relative's computer.
- **No credential of any kind (AnyDesk ID/password, or any future per-install secret) ever enters the repository** — not in code, not in `.env.example`, not in comments, not in commit messages, not in test fixtures.
- **No telemetry, ever.** No install ever reports usage, errors, or configuration back to any server the maintainers control. If crash diagnostics are ever added, they stay local to the machine and are only ever transmitted manually, by the administrator, through their own support channel of choice.

Never use `ultra` mode as the default for the `src-tauri/src/kiosk/` or `src-tauri/src/anydesk_setup.rs` modules — these are exactly the "hard, do it right the first time" rungs Ponytail exists to protect.

---

## Code Standards

All code, variable names, function names, file comments, and inline comments must be in **English**. No exceptions. This includes CSS custom property names (`--ink`, `--paper`, `--moss`, `--muted`, etc.) — no abbreviations that don't read as clean identifiers.

**All user-facing strings go through the i18n layer.** No hardcoded strings in components — see Internationalization below.

When comments are necessary, follow **TSDoc** conventions:

```ts
/**
 * Resolves the AUMID (Application User Model ID) for the installed Netflix
 * app so it can be launched via `explorer.exe shell:AppsFolder\<aumid>`.
 * Queried at setup time rather than hardcoded, because the AUMID can vary
 * slightly across Windows builds and Store regions.
 *
 * @returns The Netflix AUMID if the Store app is installed, otherwise null
 */
export function resolveNetflixAumid(): string | null { ... }
```

Write comments only when the *why* is not obvious from the code. Do not comment what the code does; comment why it does it.

**Formatting: Prettier** (`.prettierrc.json` at root):
- No semicolons
- Single quotes
- Print width 100
- Trailing commas

`docs/` is excluded from both linting and formatting — design reference prototypes, not application code.

**Import order** — three groups, separated by blank lines:
1. Node built-ins and external packages
2. Internal aliases (`@/lib`, `@/components`, `@/hooks`, `@/i18n`)
3. Relative imports (`./`, `../`)

```ts
import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'

import { NoniButton } from '@/components/NoniButton'
import { useTranslation } from '@/i18n/useTranslation'

import { HomeCard } from './HomeCard'
```

**Named exports only** — no default exports, except:
- React page/screen components (`Home.tsx`, `Admin.tsx`) if the routing setup requires it
- Vite's `main.tsx` entry point

**No `any`** — never use `any` as an escape hatch. If the type is genuinely unknown (e.g. a Tauri IPC payload before validation), use `unknown` and narrow it with a Zod schema.

**No TypeScript `enum` keyword** — use `as const` + union type instead.

```ts
// never
enum AppLaunchKind { NATIVE = 'NATIVE', URL = 'URL' }

// correct
const AppLaunchKind = {
  NATIVE: 'NATIVE',
  URL: 'URL',
} as const

type AppLaunchKind = typeof AppLaunchKind[keyof typeof AppLaunchKind]
```

---

## Internationalization (i18n)

NoniOS ships two locales from day one: **Spanish (`es`)** and **English (`en`)**. Spanish is the primary voice (it's where the project started), English is fully supported, not an afterthought — remember this will be installed by families who don't speak Spanish.

- Selected once on **first boot** (Admin, opened automatically — see First Boot above), changeable anytime afterward in **Admin → General**.
- All user-facing strings go through the i18n layer — no hardcoded strings in Home, Admin, or the setup wizard.
- **Translation philosophy: free translation, never literal**, same principle as Zelvem. A calm, simple, reassuring tone matters more than word-for-word equivalence — this app talks to someone who may be anxious about technology.

```
es: "Elegí qué querés ver."
en: "Choose what you'd like to watch."  -- not: "Choose what you want to see."
```

**Implementation:** a small custom dictionary + React Context (`src/i18n/`), not a heavyweight library like `react-i18next` or `formatjs`. Two static locales with no complex pluralization or ICU-format needs do not justify that dependency weight (Ponytail rung 1) — a `Record<string, string>` per locale plus a `t(key)` hook covers this cleanly. If NoniOS ever grows to more locales or needs real pluralization/ICU rules, that is the point to reconsider, not before.

```ts
// src/i18n/es.ts
export const es = {
  'home.greeting': 'Hola, {name}',
  'admin.addTile': 'Agregar acceso',
} as const

// src/i18n/en.ts
export const en = {
  'home.greeting': 'Hi, {name}',
  'admin.addTile': 'Add shortcut',
} as const satisfies Record<keyof typeof es, string>
```

The `satisfies Record<keyof typeof es, string>` on the second locale is what keeps them from silently drifting out of sync — a missing key becomes a type error, not a blank string in production.

---

## Screens

NoniOS has exactly two screens plus the one-time setup wizard. There is no third screen, no settings icon visible anywhere, no way to navigate between Home and Admin except the hotkey.

### Home (what the end user sees, always)

- Full screen, no window chrome, always on top, cannot be minimized or closed by any user-facing control.
- Shows: a time-of-day greeting (morning/afternoon/evening) with the end user's name, today's date written out in full, and current weather — small, calm, informational, never interactive.
- A grid of large tiles, fully configured by Admin — nothing about the tile grid is hardcoded to "Netflix + Telefe" in code; that's just the seeded default data.
- One tap on a tile launches that app or URL immediately. No confirmation dialog, ever.
- A tile whose launch target is still empty (Netflix before detection, an app that was uninstalled) is **not shown on Home** — the end user must never tap something that does nothing. Admin still lists it as "not detected" with Re-detect.
- One small, muted "Administración: F4" hint sits in the bottom-right corner (administrator's request, 2026-09-11) — the only visible reference to Admin.

**Home is a four-state machine, one visible state at a time:**

| State | What's shown | Exits to |
|---|---|---|
| `home` | The tile grid, at rest. | `launching`, on tap |
| `launching` | Full-screen overlay: the tapped tile's icon "breathing" inside a spinning progress ring, "Opening {app}…". Exists because the end user taps again if she doesn't see instant feedback — this has to appear the instant the tap registers, not after the external app has actually opened. | `inApp`, automatically once the external process/window is confirmed up |
| `inApp` | The external app/webview has focus; NoniOS itself is not visible. | `returning`, the moment the window watcher detects the external app closed, crashed, or lost its window |
| `returning` | Full-screen overlay with just the logo for about a second (the prototype's "Welcome back" copy was dropped 2026-09-11 as noise) — never an error screen, even if the external app crashed. | `home`, automatically after a short beat |

The `launching`→`inApp` and `inApp`→`returning` transitions are driven by events emitted from `kiosk/window_watcher.rs` (see `AGENTS.md`), not by a fixed timer in the frontend — the prototype uses a timer only as a stand-in since it has no real OS window to watch.

**How the end user gets back from an external app (decided 2026-09-10):**
- **Web tiles** open in a second NoniOS webview window (`launchers/webview_app.rs`, label `external`), always on top but positioned *below* a 120 px strip. The main window keeps that strip and renders one large "Volver al inicio / Back to home" bar there (`screens/Home/InAppBar.tsx`, portalled outside the scaled canvas so it lines up with real pixels). Tapping it destroys the external window, which is the `external-app-closed` signal. No script is injected into third-party pages and no remote-origin IPC is enabled.
- **App tiles** (Netflix, anything from the installed-app picker): before spawning, the main window drops always-on-top but stays fullscreen *behind* the app — the desktop is never visible, even if the watcher fails. `window_watcher.rs` polls `GetForegroundWindow`: a foreign window in front → `external-app-shown`; the foreground back on NoniOS or the desktop shell (`Progman`/`WorkerW`) for 1 s, or no window within 20 s of launch → `external-app-closed`, always-on-top re-asserted. The end user returns with the app's own close button; Alt+F4 stays blocked globally. F4 (Admin) while in-app calls `return_home`, which cancels the watcher and closes the web window.

**Sound:** a short confirmation tone on tap, a short warm tone on returning home. Implemented as two bundled short audio files (`src/assets/audio/tap.wav`, `src/assets/audio/return-home.wav`) played via the Tauri webview's `<audio>`, not Web Audio oscillators — the prototype's synthesized tones are a placeholder for iterating on timing/feel only. The WAVs are generated deterministically by `scripts/audio/generate.py` (stdlib only), so the repo carries no audio blob of unknown origin; regenerate rather than hand-edit.

**The brand mark (`NoniLogo`) is a static illustrated face — it never rotates.** During `launching` it "breathes" (a subtle scale/opacity pulse), never spins; a spinning face would read as broken, not as a loading indicator. Use a separate ring/arc element for the actual spinner motion.

### Admin (hidden, reached only via `F4`)

- Not password-protected by default (see Deployment Model for why this is a correct fit, not an oversight).
- Sidebar with three sections — **General**, **Tiles**, **Remote Access** — plus two persistent actions at the bottom: **"Back to Home"** (with an "or press F4" hint underneath) and **"Close NoniOS"**. This is the only way out and it is never hidden in a submenu.
- **"Close NoniOS"** exits the app cleanly (not just minimizes) so the administrator can reach the real Windows desktop for maintenance — e.g. Task Manager, Windows Update, debugging. If "Launch NoniOS automatically" (below) is on, the watchdog will relaunch it after its normal interval — this button is a deliberate pause, not a permanent way to leave kiosk mode; to actually stay closed, turn that toggle off first. It exists because discovering Task Manager via Ctrl+Alt+Del is real friction against a topmost kiosk window even though that key combo is unblockable by OS design — a same-app, in-UI way out beats relying solely on Ctrl+Alt+Del or Alt+F4.
- **General:** end user's display name, language toggle (Español/English), weather location search, and a **"Launch NoniOS automatically when Windows starts"** toggle. Off makes sense during setup/maintenance sessions; for the end user's actual machine this should be on. Toggling it enables/disables both Scheduled Tasks (the main app's At-Logon task and the watchdog's task) together — there's no state where the watchdog runs but the main app's autostart doesn't, since a watchdog with nothing to restart is meaningless.
- **Tiles:** the list of Home's tiles, each reorderable with simple up/down arrow buttons (first/last item's arrows dim to indicate they're disabled) — **no drag-and-drop**, it adds interaction complexity this list doesn't need. Each row shows an icon, name, and a small monospace meta line (`App · Netflix.exe` / `Web · example.com`). App-type tiles get a "Re-detect" action (for Netflix specifically, and any other installed-app tile whose launch target needs re-resolving). Edit opens a small modal (label + icon); delete removes immediately. The seeded Netflix/Telefe tiles carry no special protection — deleting or editing them works exactly like any tile the administrator added. An empty state ("No tiles yet" + a large "Add your first tile" button) replaces the list when it's empty, so it never reads as broken.
- **Remote Access:** shows the AnyDesk unattended-access ID (read-only, with a copy button) and a short reconnect note. **Never shows or asks for the AnyDesk password** — a small callout explicitly states the password is managed in AnyDesk itself, never stored or surfaced by NoniOS.
- Exiting Admin returns to Home in fullscreen kiosk mode — same "always safe to fall back to Home" guarantee as the rest of the app.

---

## Architecture Rules - Always Follow

1. **`src-tauri/src/kiosk/` is the only place that touches Win32 lockdown APIs** (keyboard hook, taskbar visibility, hotkey registration, window watcher). Feature code (launchers, config, weather) never calls these APIs directly.
2. **`src-tauri/src/launchers/` is the only place that knows how to start an external app or URL.** The frontend calls a single Tauri command (`launch_tile(tileId)`) and never constructs a shell command itself.
3. **Tiles are data, not code.** Netflix and Telefe exist only as seeded rows in the local config schema, launched through the same generic `launch_tile` path as anything an administrator adds later. There is no `if tile == netflix` special case anywhere in the frontend or in `launchers/` beyond the generic "native app vs. URL" branch.
4. **Local config is validated with Zod on both read and write.** A corrupted or hand-edited config file must never crash NoniOS — fall back to a safe default (empty tile list, no name set, English as a neutral fallback locale) rather than panic.
5. **No secrets in the repository, ever, for any install.** AnyDesk credentials and any future per-install secret live only in that machine's local state, generated or entered at setup time.
6. **The window watcher's "return to Home" path has no failure mode that leaves Windows visible.** If the watcher itself crashes, the separate watchdog process must detect NoniOS is gone and relaunch it. Two independent safety nets, not one.
7. **Minimum complexity.** If a mature crate or npm package solves a problem (window enumeration, global hotkeys, HTTP calls), use it. Do not hand-roll Win32 bindings that a maintained crate already wraps, and do not reach for a full i18n framework where a typed dictionary + Context does the job.
8. **Supply-chain security is non-negotiable.** Exact versions only (no `^` or `~`) in `dependencies`/`devDependencies`. Lifecycle scripts disabled by default via `.npmrc`. This matters more, not less, now that strangers will `pnpm install` this repo on their own machines.
9. **Status/kind fields are TypeScript union types via `as const`, never raw strings compared ad hoc** (e.g. `AppLaunchKind`, `TileSource`, `Locale`).
10. **Config field names are always English identifiers, even though the DESIGN.md prototype's illustrative JSON uses Spanish ones** (`accesos`) for readability during design. The real Zod schema/Rust struct uses `tiles`, not `accesos` — see Data Model below.
11. **A tile's launch target can be either a Store-app AUMID or a classic executable path — this is one field, not two.** `Tile.target: string` holds either form; `Tile.targetKind: 'aumid' | 'exe'` (set at detection time by `installed_apps.rs`) tells `launchers/generic_app.rs` which strategy to use. Do not introduce a `path` field that silently means different things for different tiles.

---

## Data Model

Local config, one JSON file per install, no cloud, no cross-install data:

```jsonc
{
  "schemaVersion": 1,
  "user": { "name": "Noni", "locale": "es" },
  "autostart": true,
  "weather": { "city": "Buenos Aires, Argentina", "lat": -34.6, "lon": -58.4 },
  "tiles": [
    {
      "id": "netflix",
      "name": "Netflix",
      "kind": "app",
      "icon": "play",
      "target": "4DF9E0F8.Netflix_mcm4njqhnhss8!App",
      "targetKind": "aumid"
    },
    {
      "id": "telefe",
      "name": "Telefe",
      "kind": "web",
      "icon": "tv",
      "target": "https://www.mitelefe.com/telefe-en-vivo",
      "targetKind": "url"
    }
  ],
  "anydeskId": "528 914 673"
}
```

- `kind: "app"` → resolved via `targetKind: "aumid"` (Store apps, preferred — see Netflix notes) or `targetKind: "exe"` (classic desktop apps, resolved as a full path via `installed_apps.rs`). Both support "re-detect."
- `kind: "web"` → `targetKind` is always `"url"`; opened in the embedded webview, same mechanism as Telefe.
- `icon` is either a key into the bundled icon glyph library (see below) or a reference to a user-uploaded image stored in the Tauri app data directory — never bundled in the repo, never a remote URL.
- Array order in `tiles` **is** the grid order shown on Home.
- `weather.lat`/`lon` are resolved once from the city search in Admin and cached — the Open-Meteo call at runtime uses coordinates, not a re-geocoded city string, so it doesn't depend on an external geocoding service being up every time Home loads.
- `anydeskId` is read-only display data; the password is never part of this file.

**Icon glyph library:** a small fixed set of glyph keys for tiles — `play, tv, photos, phone, video, music, globe, book, heart, weather` — rendered by `NoniIconGlyph` from `lucide-react` (already a dependency) rather than from separate SVG files; the key set is fixed by `ICON_KEYS` in `lib/config.ts` and an unknown key in a config file is repaired to `globe` instead of invalidating the config. Brand logo images for first-party tiles and the "upload image" icon option are deferred (trademark review + needs the fs/dialog plugins); the seeds use `play` (Netflix) and `tv` (Telefe) meanwhile.

---

## Reliability Architecture (the part that cannot fail)

Two independent, redundant layers guarantee NoniOS is always what the end user sees:

1. **Scheduled Task, not a Registry Run key.** Registered as an **interactive** task (elevated, for the target end-user account), triggered **"At log on"**, combined with **Windows Autologon** configured for that account so the trigger fires automatically on every reboot without anyone physically signing in. **Not** "Run whether user is logged on or not" — that setting runs the task in a non-interactive session, and a GUI kiosk app registered that way would start with no visible window, which defeats the entire point. Reboot is covered by autologon + the at-logon trigger firing right after; sleep/resume needs no separate trigger since the interactive session simply resumes; the task's own "restart every 1 minute, up to 3 times" retry policy covers a failed launch. This is more reliable than a Registry Run key because of that built-in retry policy, not because of any "always-on background service" property — NoniOS is a foreground GUI app by nature, and the reliability mechanism has to respect that.

   **The installer configures autologon programmatically — it is never a manual step for whoever is setting up the machine.** This isn't optional polish: NoniOS is meant to be installed by anyone, on a relative's machine, possibly with no developer background at all — asking them to separately download and run a tool (even an official Microsoft one, like Sysinternals Autologon) to make autostart actually work is not a real installation experience, it's a broken one with an extra manual step nobody will know to take. The install flow already prompts for local Windows credentials somewhere in its setup sequence (or can reuse the account the administrator is installing under); use those to configure autologon directly. **Store the credential via the LSA "Secrets" mechanism (the same approach Sysinternals Autologon itself uses internally — `LsaStorePrivateData` under `DefaultPassword`'s LSA secret, not a plaintext `HKLM\...\Winlogon\DefaultPassword` registry value)** — this keeps the credential out of a trivially-readable registry key while still achieving true autologon. `AutoAdminLogon`, `DefaultUserName`, and `DefaultDomainName` still go in the Winlogon registry key as usual (those aren't secrets); only the password itself goes through the LSA secret store.
2. **A separate, minimal watchdog binary** (`watchdog/`, its own tiny Rust crate, not part of the main Tauri binary). Runs as its own lightweight Scheduled Task on a short interval (e.g. every 60 seconds), checks whether the NoniOS process is alive **and responding** (a hung kiosk is killed first — `tasklist … STATUS eq NOT RESPONDING`), and relaunches it if not. It also reads `autostart` from NoniOS's own `config.json` and stays quiet when the administrator turned automatic launch off, so that switch holds even if the Scheduled Tasks themselves could not be flipped.

   **The installer also removes every other screen the end user could get stuck on:** the sign-in prompt after sleep (`powercfg CONSOLELOCK 0`), the secure screen saver, the lock screen policy, and Windows 11's "Require Windows Hello sign-in" block (`DevicePasswordLessBuildVersion=0`), without which `AutoAdminLogon` is silently ignored on Microsoft-account machines. Autologon that boots into a lock screen is not autologon.

   **Why not replace the shell?** Commercial kiosks (and Microsoft's Shell Launcher) set `Winlogon\Shell` to the kiosk app so explorer never runs. Shell Launcher needs Enterprise/Education/IoT; the per-user registry variant works on Home but changes the whole maintenance flow and how Store apps are activated. Decided 2026-09-11: NoniOS runs *on top of* explorer (fullscreen, topmost, taskbar hidden, keys hooked) for v1; shell replacement is the documented upgrade path if this lockdown proves insufficient in the field.

Both layers are intentionally simple and boring. This is the one part of the codebase where "boring and redundant" beats "elegant and clever."

---

## Netflix and Telefe — implementation notes

- **Netflix launches the Microsoft Store app**, never a browser tab — the Store app's session does not expire the way a web session does. Its tile has `targetKind: "aumid"`; the AUMID itself is resolved at setup time (and re-resolvable from the "Re-detect" action in Admin → Tiles) via installed-app enumeration, never hardcoded, since it varies by Windows build/Store region. **One mechanism for detection and launch:** `installed_apps.rs` shells PowerShell's `Get-StartApps` (name + `AppID` for Store *and* classic apps) and `generic_app.rs` launches with `explorer.exe shell:AppsFolder\<AppID>`, so what the picker shows is exactly what gets launched. There is no `netflix.rs` — Netflix is found by name like any other app.
- **Telefe is embedded directly in the Tauri webview**, `targetKind: "url"`, pointing at `https://www.mitelefe.com/telefe-en-vivo`. Confirmed: this page serves its live stream via JW Player over HLS with standard pre-roll ads — no Widevine/VMP requirement, unlike Netflix — so it plays natively inside WebView2. If Telefe ever changes their player setup, this is the one integration point to re-validate.
- Both are seeded as **default tile data**, not special-cased code — see Architecture Rule 3 and the Data Model above. Any administrator can delete or replace either one from Admin → Tiles exactly like a tile they added themselves.
- **Generic tiles added via Admin** use the same two launch patterns: `targetKind: "aumid" | "exe"` for an installed app (resolved via `installed_apps.rs`) or `targetKind: "url"` for a web tile (embedded the same way as Telefe). No third launch mechanism without a concrete need.

---

## Repo Structure

```
noni-os/
├── src/                          # React frontend (Tauri webview)
│   ├── screens/
│   │   ├── Home/
│   │   │   ├── Home.tsx          # renders the four states; timers only for the returning beat
│   │   │   ├── homeMachine.ts    # pure reducer: home/launching/inApp/returning (unit tested)
│   │   │   ├── HomeHeader.tsx    # greeting + name + date + weather
│   │   │   ├── TileGrid.tsx
│   │   │   └── InAppBar.tsx      # "Back to home" bar for web tiles (portal, real pixels, matches BAR_HEIGHT in Rust)
│   │   └── Admin/
│   │       ├── Admin.tsx         # also handles the first-boot case (see CLAUDE.md -> First Boot)
│   │       ├── GeneralSection.tsx
│   │       ├── TilesSection.tsx
│   │       ├── TileEditorModal.tsx
│   │       ├── AddTileModal.tsx  # 2-step: pick type -> installed app / URL
│   │       ├── InstalledAppsPicker.tsx
│   │       └── RemoteAccessSection.tsx
│   ├── components/
│   │   ├── ui/                   # raw shadcn primitives, never modified in place
│   │   └── Noni*.tsx             # customized components (NoniButton, NoniCard, NoniLogo, ...)
│   ├── assets/
│   │   ├── icons/                # bundled glyph library (play, tv, photos, phone, video, music, globe, book, heart, weather)
│   │   ├── logos/                # first-party brand logos (Netflix, Telefe, ...)
│   │   └── audio/                # tap.wav, return-home.wav (generated by scripts/audio/generate.py)
│   ├── i18n/
│   │   ├── es.ts
│   │   ├── en.ts
│   │   └── useTranslation.ts     # Context + t(key, vars?) hook
│   ├── lib/
│   │   ├── config.ts             # Zod schema + typed read/write over Tauri IPC
│   │   ├── weather.ts            # Open-Meteo client, no API key required
│   │   └── launch.ts             # thin wrapper calling the `launch_tile` Tauri command
│   ├── hooks/
│   │   ├── useWindowWatcherEvents.ts
│   │   └── useViewportScale.ts   # scales the fixed 1920x1080 canvas to the real screen resolution
│   └── App.tsx
│
├── src-tauri/                    # main NoniOS binary
│   ├── src/
│   │   ├── main.rs
│   │   ├── diag.rs               # local-only log (%LOCALAPPDATA%\NoniOS\nonios.log), never transmitted
│   │   ├── kiosk/                # ALL Win32 lockdown code, isolated and auditable
│   │   │   ├── mod.rs
│   │   │   ├── keyboard_hook.rs  # WH_KEYBOARD_LL on its own thread: blocks Win, Alt+Tab, Alt+F4, Ctrl+Esc
│   │   │   ├── taskbar.rs        # Shell_TrayWnd show/hide
│   │   │   ├── admin_hotkey.rs   # F4 global shortcut -> toggle Admin screen
│   │   │   ├── autologon.rs      # Winlogon registry values + password as an LSA secret
│   │   │   ├── autostart.rs      # enables/disables both Scheduled Tasks together
│   │   │   └── window_watcher.rs # foreground polling: external-app-shown / -closed events
│   │   ├── launchers/
│   │   │   ├── mod.rs            # launch(tile): dispatch on tile data only
│   │   │   ├── webview_app.rs    # web tiles: second always-on-top webview window below the bar
│   │   │   └── generic_app.rs    # app tiles: shell:AppsFolder\<AppID> or an exe path
│   │   ├── config/
│   │   │   ├── mod.rs            # Config/Tile structs (camelCase JSON) + first-boot seed
│   │   │   └── local_store.rs    # reads/writes config.json in the Tauri app data dir, atomically
│   │   ├── installed_apps.rs     # Get-StartApps -> name + AppID, for the picker and re-detect
│   │   └── anydesk_setup.rs      # read-only: locate AnyDesk.exe, --get-id
│   ├── tauri.conf.json
│   └── Cargo.toml
│
├── watchdog/                     # separate tiny binary, its own Scheduled Task
│   ├── src/main.rs
│   └── Cargo.toml
│
├── scripts/
│   ├── install/                  # Install-NoniOS.ps1 / Uninstall-NoniOS.ps1: Scheduled Tasks + autologon
│   ├── ci/Smoke-Test.ps1         # reliability chain smoke test (CI on windows-latest; also a pre-flight on a real machine)
│   └── audio/generate.py         # regenerates src/assets/audio/*.wav
│
├── .github/workflows/windows.yml # the only MSVC build: gates, artifacts (NoniOS.exe, watchdog, installer), smoke test
│
├── docs/
│   └── design/
│       └── app/
│           └── DESIGN.md         # tokens, Home + Admin specs, .dc.html prototypes alongside (reference only, not rendered)
│
├── pnpm-workspace.yaml           # present only if src/ and watchdog/ end up as separate workspace packages
├── LICENSE                       # MIT
├── CLAUDE.md                     # this file
└── AGENTS.md
```

---

## Design and UI

High-fidelity designs live in `docs/design/app/DESIGN.md`, one Markdown file with design tokens, screen specs, and the two `.dc.html` files (`NoniOS.dc.html` for Home, `NoniOSAdmin.dc.html` for Admin) alongside it as visual/markup reference.

**These `.dc.html` files are read as reference material, not rendered.** They were exported from Claude Design and reference a `_ds/nonios-design-system-.../` bundle and helper scripts (`support.js`, `image-slot.js`) that are **not** part of this repo — nobody needs to open them in a browser, so there's nothing to fetch or install to make that work. Claude Code (and anyone reading the repo) treats them purely as markup/spec: layout, spacing, states, component names, and copy. Every token value that actually matters for implementation (colors, radii, shadows, fonts) is already transcribed as plain values in the tables in `DESIGN.md` itself — that table, not the `.dc.html`'s `<link>` tags, is the source of truth for colors and typography.

One `DESIGN.md` is enough — NoniOS has one surface (the desktop app) and two screens (Home, Admin). If either grows complex enough to need its own document, split then, not preemptively.

**Asset placement:** anything consumed by an `import` or `<img src>` lives in `src/assets/`. Anything that is visual reference material for humans only (prototypes, screenshots) lives in `docs/design/`. Nothing in `docs/` is ever imported by application code.

Before touching any frontend component, read `docs/design/app/DESIGN.md`. Any visual decision not covered there requires confirmation before implementing.

**Both `.dc.html` prototypes render at a fixed 1920×1080 canvas.** Real machines run other resolutions (1366×768 is common on older hardware; 4K on newer). Do not reinterpret this as "make it responsive" — a responsive redesign would let card sizes, spacing, and grid wrapping drift from what was actually designed and reviewed. Instead, render the whole UI inside a fixed design canvas and apply a single `transform: scale()` computed from the real window size (`useViewportScale.ts`). The layout itself never changes; only its rendered size does. **Cover, not contain (decided 2026-09-11):** the canvas is scaled to fit and then extended along the axis with spare room (1920×1200 on 16:10, 1920×1920 on a square window), so there are never empty letterbox bands; Home keeps its header top-left and centres the grid in the extra height, Admin's sidebar and content simply get taller. Component sizes never change.

**The `.dc.html` files use raw inline-styled HTML elements, not the real component layer** — that's a property of the prototyping tool, not a design decision. The actual implementation still goes through `Noni*`/shadcn components (`NoniButton`, `NoniInput`, etc.) per the Stack Rules in `AGENTS.md`; treat the prototypes as the source of truth for layout, spacing, states, and copy — not for how the markup itself should be written.

---

## Visual Identity

Shares the **"Tinta + Musgo"** palette with Zelvem — same 4 brand tokens:

| CSS Variable | Light | Dark | Use |
|---|---|---|---|
| `--ink` | `#14171A` | `#F2F0E9` | Primary text |
| `--paper` | `#F2F0E9` | `#141110` | App background |
| `--moss` | `#3F5D42` | `#6E9A73` | Single brand accent |
| `--muted` | `#8A8579` | `#7C7567` | Secondary / labels |

NoniOS runs **light theme only** in practice — an elderly end user in a well-lit room benefits from higher contrast and familiarity more than from a dark mode toggle nobody in this target audience will use. Dark mode tokens exist in the palette for consistency with Zelvem's system but are not exposed as a user-facing setting for now.

**The NoniOS mark (`NoniLogo`) is a warm, illustrated face — not an abstract icon.** It's static: it never spins, even as a loading indicator (see Home's `launching` state, which uses a separate breathing/pulse animation on the face plus a spinning progress ring around it, never a rotating logo). Typography is **Geist** for UI/body text and **Geist Mono** for uppercase labels, meta text, and IDs (the AnyDesk ID, tile meta lines like `App · Netflix.exe`) — there is no `--font-mono` CSS variable, use `var(--default-mono-font-family)`.

Full token system, tap-target sizing, and grid scaling rules live in `docs/design/app/DESIGN.md`.

---

## Distribution and Updates

- **License:** MIT. Anyone can install, fork, and modify NoniOS.
- **Branching:** three tiers, not two. Autonomous/iteration work happens on scoped feature branches (e.g. `matiassimone/build-run-one`), each merged into **`development`** once its checkpoint passes the 3 gates — `development` is the ongoing integration branch, not something released from directly. **`main`** only receives a merge from `development` once a full milestone is verified working end to end (including the manual Windows verification steps that can't be automated) — a merge/tag on `main` is what triggers a signed public release build. Nothing skips straight from a feature branch to `main`.
- **Auto-update:** Tauri's built-in updater plugin, checking the public release manifest on every NoniOS launch (or on a daily timer). Update artifacts are signed; the private signing key is never committed — it lives outside the repo, injected into CI as a secret at release time.
- **Update safety:** an update must never interrupt the end user mid-use in a way that leaves them looking at anything other than Home. Apply updates on next launch/restart, not by tearing down the running kiosk window.
- **No install ever phones home.** The updater checks a public, static release manifest — it does not report which version, which OS, or any other identifying information back to a server.
- Manual reinstall via AnyDesk (for installs the administrator personally manages) remains the fallback path if the updater itself ever needs fixing.
