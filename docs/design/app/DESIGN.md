# NoniOS — Design Document

A Windows desktop launcher (Tauri) that fully replaces the system UI in kiosk mode.
Built for an elderly end user with reduced hand dexterity and short-term memory
difficulty. Always runs full screen, no taskbar, no desktop, no window chrome.
It is the only thing the end user ever sees.

Two surfaces under the same design system:

- **Home** — seen by the end user. Maximum simplicity, one tap, huge targets.
- **Admin** — used by whoever installs/maintains the machine (a family member).
  Normal configuration-panel density.

Reference prototypes in this project: `NoniOS.dc.html` (Home) and
`NoniOSAdmin.dc.html` (Admin). Both were exported from Claude Design and are kept
here purely as markup/spec reference — they are **not meant to be opened in a
browser** (they reference a design-system bundle and helper scripts that live
outside this repo). Read them for layout, spacing, states, component names, and
copy; use the token tables below, not their `<link>` tags, as the source of
truth for colors and typography.

---

## 1. Design system (NoniUI — "Tinta + Musgo")

All color and typography values below are the canonical reference for
implementation. **Do not invent colors or fonts** outside these tokens.

### Color tokens (light — the only register exposed in the product)

| Token             | Value                 | Use                                    |
| ------------------ | --------------------- | --------------------------------------- |
| `--paper`          | `#f2f0e9`             | App background                          |
| `--surface`        | `#fbfaf6`             | Cards, panels, inputs                   |
| `--ink`            | `#14171a`             | Primary text                            |
| `--ink2`           | `#5c584e`             | Secondary text                          |
| `--muted`          | `#8a8579`             | Labels, meta text, placeholders         |
| `--moss`           | `#3f5d42`             | The single brand accent (CTAs, active)  |
| `--moss-hover`     | `#344c37`             | Accent hover                            |
| `--on-moss`        | `#f2f0e9`             | Text/icon on top of moss                |
| `--border`         | `#dad7cb`             | Card/input borders                      |
| `--border-soft`    | `#e4e1d6`             | Internal dividers                       |
| `--tint`           | `rgba(63,93,66,.12)`  | Soft hover/active state                 |
| `--tint2`          | `rgba(63,93,66,.07)`  | Icon cells, accent blocks               |
| `--accent-border`  | `rgba(63,93,66,.25)`  | Border on informational blocks          |

Dark tokens exist (inherited from Zelvem) but **are not exposed** in the product —
they exist only for internal previews via `:root[data-theme="dark"]`.

### Typography

- `--font-sans` → **Geist** (UI and body copy).
- `--default-mono-font-family` → **Geist Mono** (uppercase labels, dates, IDs,
  list meta text). ⚠️ There is no `--font-mono` CSS variable — use
  `var(--default-mono-font-family)`.
- Section labels: mono font, `10px`, uppercase, `letter-spacing:.13em`, `--muted`.

### Radii and shadows

- Buttons/pills `9px` · icon cells `10px` · cards `11–14px` · modals `~18px`.
- Shadows are nearly nonexistent: cards are flat or use `0 1px 2px rgba(0,0,0,.04)`.
  Modals use `0 24px 60px rgba(0,0,0,.22)`.

### Design-system components

In the prototype, these are loaded from the exported design-system bundle
(irrelevant to the real implementation — see the note above). What matters here
is which components exist and how they're used, so the real React/shadcn layer
mirrors them:

- `NoniUI.NoniButton` — `variant` (`default` moss | `outline` | `ghost`), `size`
  (`default` | `sm` | `icon`).
- `NoniUI.NoniInput` — pre-styled input. **Never use a bare `<input>`.**
- `NoniUI.NoniLogo` — the brand mark, an illustrated face. Static:
  **it never rotates** (it's a face — spinning it as a loading indicator would
  read as broken, not as "loading").

Default in-product language: **Río de la Plata Spanish** ("Guardar", "Agregar
acceso", "Volver"). English is a fully supported second locale (see
`CLAUDE.md` → Internationalization) — this document shows the Spanish copy used
in the prototype as the reference default, not as the only supported language.

---

## 2. Home (end user)

Fixed canvas **1920×1080**. Structure: greeting header + tile grid. Never shows
OS navigation, a system clock, notifications, or badges.

**Both prototypes render at this fixed 1920×1080 size.** Real machines run other
resolutions (1366×768 on older hardware, 4K on newer). The implementation must
not turn this into a responsive redesign — instead, scale the whole fixed canvas
to the real window size with a single `transform: scale()` (see
`useViewportScale.ts` in `CLAUDE.md`'s repo structure). Card sizes, spacing, and
grid wrapping stay exactly as designed; only the rendered size changes.

### Header

- Large greeting (`64px/600`): `"{greeting}, {name}"`. `greeting` depends on the
  hour: `Buenos días` (<12), `Buenas tardes` (<20), `Buenas noches` — translated
  per locale via the i18n layer.
- Below it (`32px`, `--ink2`): the day and date written out, first letter
  capitalized (e.g. "Lunes 21 de julio" / "Monday, July 21").
- On the right, a weather chip on `--surface`: a sun icon + `{temp}°` (`52px`).
  In the prototype this is a static configured value; the real implementation
  calls Open-Meteo using the coordinates saved from the Admin → General location
  search (see the Data Model in `CLAUDE.md`), refreshed periodically rather than
  on every Home render.

### Tile grid

- `flex-wrap` container, centered, `gap:52px`, `max-width:990px`.
- Each tile: **430×380px**, `--surface` background, thin border, `28px` radius.
  - A `196×196` icon cell on `--tint2` (an `image-slot` placeholder in the
    prototype, standing in for the real brand logo/icon asset).
  - A single word underneath (`44px/600`): the tile's name (Netflix, Telefe…).
- Hard rules: **one tap = the action**, no confirmations, no menus, no hover as
  the only source of information, no badges/counters, no explanatory text.
- **Scalability:** fixed card size + `flex-wrap` → 2 tiles fit in a row, 3–4 wrap
  into a 2×2, 5–6 keep wrapping, with no redesign needed. Validated via the
  `cardCount` prototype tweak.

### States (a single-active-view state machine)

`view ∈ { home, launching, inApp, returning }`.

1. **home** — the resting screen.
2. **launching** (right after the tap) — a `--paper` overlay: a spinning `--moss`
   ring around the tile's icon "breathing," plus "Opening {app}…". A short
   confirmation tone plays. **Why it exists:** the end user taps again if she
   doesn't see an instant response, so this feedback has to appear the moment
   the tap registers — not after the external app has actually finished
   opening. Lasts ~1.8s in the prototype, then hands focus to the external app.
3. **inApp** — the external app (Netflix/stream) is in the foreground. The
   prototype represents this with a dark placeholder screen; tapping anywhere
   returns to Home.
4. **returning** — "coming back home": a `--paper` overlay with the logo and
   "Hola de nuevo, {name}" / "Estás en casa" ("Welcome back, {name}" / "You're
   home now"). A warm tone plays. This screen must **never** feel like an
   error, even if the external app crashed. Returns to **home**.

In the real implementation, the `launching → inApp` and `inApp → returning`
transitions are driven by events from `kiosk/window_watcher.rs`, not by a fixed
timer — the prototype's timer is a stand-in since it has no real OS window to
watch.

### Sound

The prototype uses Web Audio (sine oscillators) — a short ascending chord on
tap, two warm tones on returning home. The real Tauri implementation replaces
these with short bundled audio files (`src/assets/audio/tap.ogg`,
`src/assets/audio/return-home.ogg`).

### Access to Admin (hidden)

- **F4** (the end user does not know this shortcut).
- An invisible `96×96` hotspot in the top-left corner (a maintenance fallback).
- No visible admin affordance anywhere on Home.

---

## 3. Admin (maintainer)

Same 1920×1080 canvas. Normal configuration-panel density: sidebar + content.
Keeps the design system's calm visual language (flat surfaces, thin borders).
This is not a "developer/debug" panel. Small iconography is allowed here.

**First boot:** if no local config file exists yet, NoniOS opens directly into
Admin instead of Home, pre-filled with sensible defaults (see `CLAUDE.md` →
First Boot). There is no separate setup-wizard UI — Admin's three sections
already cover everything a first-time setup needs.

### Layout

- **Sidebar** `320px`, `--surface`, right border:
  - Brand mark (`NoniLogo`) + "NoniOS" / "ADMINISTRACIÓN" ("ADMIN").
  - A 3-item nav: **General**, **Tiles**, **Remote Access** (active item has a
    `--tint` background, `--ink` text).
  - At the bottom, always visible: a **Back to Home** button (`--moss`,
    full-width) + an "or press F4" hint underneath. This is the only way out,
    and it is never hidden.
- **Main** area, scrollable, `max-width:860px`, centered.

No breadcrumbs, no deep navigation (it's 3 flat sections).

### 3.1 General

A card with three fields separated by dividers:

- **User's name** (`NoniInput`) — feeds Home's greeting.
- **Language** — a segmented toggle, Español / English.
- **Weather location** — `NoniInput` with a search icon (city lookup).

### 3.2 Tiles

- Header with a title + an **Add tile** button (`--moss`).
- **List** of tiles (Netflix and Telefe by default — **editable and removable
  like any other tile, with no "protected" marker**). Each row:
  - Reorder: ↑/↓ arrows (single click; the first/last item's arrows dim to
    `opacity .25`). No drag-and-drop — that interaction is deliberately not
    part of this design.
  - Icon cell + name + a monospace meta line (`App · Netflix.exe` /
    `Web · host`).
  - App-type tiles get a **Re-detect** action (a ~1.6s spinner) for when the
    setup-time auto-detection failed. It lives inline in the row, not as a
    separate screen.
  - Edit (pencil) opens a modal. Delete (trash) removes immediately (red on
    hover).
- **Empty state:** if everything is deleted, a dashed-border card with an
  icon, "No tiles yet," and a large "Add your first tile" button. This never
  reads as broken.

#### "Add tile" flow (2 steps, modal)

- **Step A — type:** two large cards → "An app installed on this computer" vs.
  "A web page."
- **Step B (app):** a search field + list of detected apps (icon + name); one
  click adds it and returns to the list.
- **Step B (web):** URL + label + icon picker (a simple glyph library, or
  "Upload image") + a footer with Cancel / Add (the CTA is disabled until both
  URL and label have a value). A back arrow returns to step A.

#### Edit modal

Label (`NoniInput`) + icon picker. Cancel / Save.

### 3.3 Remote Access (AnyDesk)

- A mono label + the **AnyDesk ID**, large (`44px`, mono) + a **Copy** button
  (shows "Copied" for ~1.8s as feedback).
- "How to reconnect": a short instructional note.
- An accent block (`--tint2` + `--accent-border`) with a lock icon:
  **the password is managed in AnyDesk itself — it is never stored or shown
  here.**
- This version of Admin **has no PIN**: the access control is physical access
  to the machine plus the F4 shortcut.

### Leaving Admin

The "Back to Home" button or F4 → a brief "Returning to the home screen…"
overlay → navigates to Home in fullscreen.

---

## 4. Data model (for implementation)

```jsonc
// Per-install config (local, no cloud, no account)
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
    },
    {
      "id": "yt-1",
      "name": "YouTube",
      "kind": "web",
      "icon": "video",
      "target": "https://youtube.com",
      "targetKind": "url"
    }
  ],
  "anydeskId": "528 914 673" // read-only; the password is never stored here
}
```

- `kind: "app"` → resolved through `targetKind: "aumid"` (Store apps, preferred
  — see Netflix) or `targetKind: "exe"` (classic desktop apps, resolved as a
  full path). Both support "Re-detect."
- `kind: "web"` → `targetKind` is always `"url"`; opened in the embedded
  webview.
- `icon` is either a key into the bundled glyph library (below) or a reference
  to a user-uploaded image stored in the Tauri app data directory — never
  bundled in the repo.
- The order of the `tiles` array **is** the order shown in Home's grid.
- Every install is fully independent: nothing is shared between families.

### Icon glyph library (keys used in the prototype)

`play, tv, photos, phone, video, music, globe, book, heart, weather`.

On Home, a known first-party app's real logo image is used instead of a glyph;
these glyphs are the fallback / the icon set for web tiles and any app whose
brand logo isn't bundled.

---

## 5. Tauri implementation notes

- **Kiosk mode:** `fullscreen` window, `decorations: false`, `alwaysOnTop`, no
  minimize/close; hide the taskbar and the `explorer` shell. The app *is* the
  shell.
- **Interaction:** single tap/click only. No double-click, gestures,
  drag-and-drop, or keyboard combinations in day-to-day use. Home's targets are
  ≥ 200×200 real pixels (tiles are 430×380 at the design's native resolution).
- **Navigation:** Home and Admin are two views; F4 toggles between them. Home's
  invisible hotspot is a maintenance fallback. "Back to Home" is always visible
  in Admin.
- **Launching apps/URLs:** `targetKind: "aumid"` → `explorer.exe
  shell:AppsFolder\<aumid>`; `targetKind: "exe"` → the resolved executable path;
  `targetKind: "url"` → the embedded fullscreen webview.
- **Returning to the launcher:** detect the external app losing its window or
  closing, and refocus NoniOS, showing the `returning` state (never an error).
- **App detection:** enumerate installed apps (Start Menu / registry / UWP) for
  the picker and for "Re-detect."
- **Scaling:** designed at 1920×1080, scaled proportionally to the real
  resolution (supports 1366×768 through 4K). Never break the grid — fixed tile
  size + wrap, never a responsive redesign.
- **Persistence:** local config only (JSON file / Tauri store). No telemetry,
  no accounts.
- **Consistency:** Home looks identical every time the machine boots. No
  onboarding, no long splash screen, no system popups.
- **Sound:** replace the prototype's Web Audio with short bundled `.wav`/`.ogg`
  assets.
- **AnyDesk:** read the installation's AnyDesk ID; never read, store, or
  display the password.

---

## 6. Non-negotiable principles (checklist)

- [ ] One tap = the action. Zero intermediate steps on Home.
- [ ] Huge targets, generous spacing between tiles.
- [ ] Each tile = a large icon + one word. No explanatory text/badges/counters.
- [ ] No navigation on Home (no "back," no menus, no visible settings).
- [ ] Home looks identical on every boot.
- [ ] Admin is hidden (F4), has no PIN, "Back to Home" always visible.
- [ ] All UI copy goes through the i18n layer (Spanish default, English fully supported).
- [ ] Only NoniUI tokens; the logo (a face) never rotates.
