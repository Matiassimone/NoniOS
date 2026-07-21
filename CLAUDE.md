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
- **AnyDesk silent install + unattended-access password entry** happens the first time the administrator opens the Remote Access section, not in a separate step.
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

**Home is a four-state machine, one visible state at a time:**

| State | What's shown | Exits to |
|---|---|---|
| `home` | The tile grid, at rest. | `launching`, on tap |
| `launching` | Full-screen overlay: the tapped tile's icon "breathing" inside a spinning progress ring, "Opening {app}…". Exists because the end user taps again if she doesn't see instant feedback — this has to appear the instant the tap registers, not after the external app has actually opened. | `inApp`, automatically once the external process/window is confirmed up |
| `inApp` | The external app/webview has focus; NoniOS itself is not visible. | `returning`, the moment the window watcher detects the external app closed, crashed, or lost its window |
| `returning` | Full-screen overlay: the logo plus "Welcome back, {name}" / "You're home now" — deliberately framed as a warm return, never as an error screen, even if the external app crashed. | `home`, automatically after a short beat |

The `launching`→`inApp` and `inApp`→`returning` transitions are driven by events emitted from `kiosk/window_watcher.rs` (see `AGENTS.md`), not by a fixed timer in the frontend — the prototype uses a timer only as a stand-in since it has no real OS window to watch.

**Sound:** a short confirmation tone on tap, a short warm tone on returning home. Implemented as two bundled short audio files (`src/assets/audio/tap.ogg`, `src/assets/audio/return-home.ogg`) played via the Tauri webview's `<audio>`, not Web Audio oscillators — the prototype's synthesized tones are a placeholder for iterating on timing/feel only.

**The brand mark (`NoniLogo`) is a static illustrated face — it never rotates.** During `launching` it "breathes" (a subtle scale/opacity pulse), never spins; a spinning face would read as broken, not as a loading indicator. Use a separate ring/arc element for the actual spinner motion.

### Admin (hidden, reached only via `F4`)

- Not password-protected by default (see Deployment Model for why this is a correct fit, not an oversight).
- Sidebar with three sections — **General**, **Tiles**, **Remote Access** — plus a persistent "Back to Home" button (with an "or press F4" hint underneath). This is the only way out and it is never hidden in a submenu.
- **General:** end user's display name, language toggle (Español/English), weather location search.
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
11. **A tile's launch target can be either a Store-app AUMID or a classic executable path — this is one field, not two.** `Tile.target: string` holds either form; `Tile.targetKind: 'aumid' | 'exe'` (set at detection time, in `netflix.rs`/`installed_apps.rs`) tells `launchers/generic_app.rs` which strategy to use. Do not introduce a `path` field that silently means different things for different tiles.

---

## Data Model

Local config, one JSON file per install, no cloud, no cross-install data:

```jsonc
{
  "schemaVersion": 1,
  "user": { "name": "Noni", "locale": "es" },
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

**Icon glyph library:** a small fixed set of bundled SVGs for generic/web tiles — `play, tv, photos, phone, video, music, globe, book, heart, weather` — living in `src/assets/icons/`. Known first-party tiles (Netflix, Telefe) use their real brand logo image instead of a glyph, stored the same way as any other asset in `src/assets/logos/`. The glyph library and the brand-logo assets are two different things and should not be confused in the icon picker's UI, even though both ultimately render into the same tile slot.

---

## Reliability Architecture (the part that cannot fail)

Two independent, redundant layers guarantee NoniOS is always what the end user sees:

1. **Scheduled Task, not a Registry Run key.** Registered with: trigger "At startup" AND "At log on", "Run whether user is logged on or not", "Run with highest privileges", and "If the task fails, restart every 1 minute, up to 3 times." This covers reboot, sleep/resume, and power loss far more reliably than a Run key.
2. **A separate, minimal watchdog binary** (`watchdog/`, its own tiny Rust crate, not part of the main Tauri binary). Runs as its own lightweight Scheduled Task on a short interval (e.g. every 60 seconds), checks whether the NoniOS process is alive, and relaunches it immediately if not.

Both layers are intentionally simple and boring. This is the one part of the codebase where "boring and redundant" beats "elegant and clever."

---

## Netflix and Telefe — implementation notes

- **Netflix launches the Microsoft Store app**, never a browser tab — the Store app's session does not expire the way a web session does. Its tile has `targetKind: "aumid"`; the AUMID itself is resolved at setup time (and re-resolvable from the "Re-detect" action in Admin → Tiles) via installed-app enumeration, never hardcoded, since it varies by Windows build/Store region.
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
│   │   │   ├── Home.tsx          # owns the home/launching/inApp/returning state machine
│   │   │   ├── HomeHeader.tsx    # greeting + name + date + weather
│   │   │   └── TileGrid.tsx
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
│   │   └── audio/                # tap.ogg, return-home.ogg
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
│   │   ├── kiosk/                # ALL Win32 lockdown code, isolated and auditable
│   │   │   ├── mod.rs
│   │   │   ├── keyboard_hook.rs  # WH_KEYBOARD_LL: blocks Win key, Alt+Tab, Ctrl+Esc
│   │   │   ├── taskbar.rs        # Shell_TrayWnd show/hide
│   │   │   ├── admin_hotkey.rs   # F4 global shortcut -> toggle Admin screen
│   │   │   └── window_watcher.rs # detects external app close -> refocus Home
│   │   ├── launchers/
│   │   │   ├── mod.rs
│   │   │   ├── netflix.rs
│   │   │   ├── webview_app.rs    # Telefe + any Admin-added URL tile
│   │   │   └── generic_app.rs    # Admin-added installed-app tiles
│   │   ├── config/
│   │   │   └── local_store.rs    # reads/writes JSON in the Tauri app data dir
│   │   ├── installed_apps.rs     # enumerates Start Menu entries for InstalledAppsPicker
│   │   └── anydesk_setup.rs      # first-run: silent install + unattended access config
│   ├── tauri.conf.json
│   └── Cargo.toml
│
├── watchdog/                     # separate tiny binary, its own Scheduled Task
│   ├── src/main.rs
│   └── Cargo.toml
│
├── scripts/
│   └── install/                  # first-run setup: Scheduled Tasks, AnyDesk, wizard entry point
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

**Both `.dc.html` prototypes render at a fixed 1920×1080 canvas.** Real machines run other resolutions (1366×768 is common on older hardware; 4K on newer). Do not reinterpret this as "make it responsive" — a responsive redesign would let card sizes, spacing, and grid wrapping drift from what was actually designed and reviewed. Instead, render the whole UI inside a fixed 1920×1080 root and apply a single `transform: scale()` computed from the real window size (`useViewportScale.ts`). The layout itself never changes; only its rendered size does.

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
- **Branching:** `develop` is active work, `main` is production. A merge/tag on `main` triggers a signed public release.
- **Auto-update:** Tauri's built-in updater plugin, checking the public release manifest on every NoniOS launch (or on a daily timer). Update artifacts are signed; the private signing key is never committed — it lives outside the repo, injected into CI as a secret at release time.
- **Update safety:** an update must never interrupt the end user mid-use in a way that leaves them looking at anything other than Home. Apply updates on next launch/restart, not by tearing down the running kiosk window.
- **No install ever phones home.** The updater checks a public, static release manifest — it does not report which version, which OS, or any other identifying information back to a server.
- Manual reinstall via AnyDesk (for installs the administrator personally manages) remains the fallback path if the updater itself ever needs fixing.
