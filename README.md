# NoniOS

**An accessibility kiosk launcher for Windows.** NoniOS takes over the entire
screen with one simple home page — no taskbar, no desktop, no Windows UI at
all — so that someone with reduced hand dexterity or memory difficulty can use
a computer with a single tap, without ever getting lost.

Built for a grandmother. Open to anyone who has one too.

---

## Why

Windows is not designed for someone who has trouble aiming a mouse, remembers
fewer steps than yesterday, or gets anxious the moment something unexpected
pops up on screen. Most "simplified" solutions still leave a taskbar, a
notification, an update dialog, or a stray click away from a confusing place
the person doesn't know how to leave.

NoniOS starts from a different premise: **the computer should only ever show
one screen, with a small number of huge, single-tap tiles to the things that
person actually uses** — a streaming app, a live TV channel, a video call with
family, whatever matters to them. Everything else about Windows disappears
behind it. A family member configures it once from a hidden admin screen and
can provide remote support later if something needs fixing.

## What it looks like

| Home (end user) | Admin (whoever maintains the machine) |
|---|---|
| One greeting, the date, the weather, and a grid of large tiles. One tap opens a tile. That's the entire interface. | A normal settings panel — name, language, weather location, tile management, remote-access info — reached only via a hidden hotkey (`F4`). |

Full design reference (tokens, states, and screen-by-screen specs) lives in
[`docs/design/app/DESIGN.md`](docs/design/app/DESIGN.md).

## Features

- **Full Windows UI replacement** — fullscreen kiosk mode, no taskbar, no
  desktop, no way to accidentally end up anywhere else.
- **One tap, no confirmations** — every tile launches immediately. There is no
  menu, no settings icon, no way to get lost on the home screen.
- **Fully configurable tiles** — install with the default Netflix + Telefe
  (live Argentine TV) tiles, or replace them with anything: another streaming
  app, a video-calling app, any installed program, or any website.
- **Built to never fail to start** — a Scheduled Task plus an independent
  watchdog process guarantee NoniOS is what the end user sees after every
  reboot, sleep/resume, or crash. See [`CLAUDE.md`](CLAUDE.md) for how.
- **Remote support built in** — optional AnyDesk unattended-access setup, so
  whoever administers the machine can help out from anywhere without the end
  user needing to do anything.
- **Spanish and English**, selectable on first run and changeable anytime from
  Admin.
- **No cloud, no accounts, no telemetry.** Every install is completely
  independent — nothing is shared between installations, and nothing about
  how the machine is used is ever sent anywhere.
- **Open source, MIT licensed.** Install it, fork it, adapt it for whoever you're
  building it for.

## Getting started

> NoniOS is under active development. If you're looking to install it for a
> family member today rather than build it from source, check the
> [Releases](../../releases) page for the latest installer once one is
> published.

### Prerequisites

- Windows 10 or 11 (the target platform — development can happen on other
  OSes, but kiosk-mode features only work on Windows)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/installation) — this project always uses pnpm, not
  npm or yarn

### Build from source

```bash
git clone https://github.com/<org>/noni-os.git
cd noni-os
pnpm install
pnpm tauri dev     # run in development mode
pnpm tauri build   # produce a production installer
```

### First run

The very first time NoniOS starts on a machine with no existing configuration,
it opens directly into the **Admin** screen instead of Home. From there,
whoever is setting up the machine can:

1. Set the end user's name and preferred language.
2. Set a location for the weather shown on Home.
3. Confirm or replace the default tiles (Netflix and Telefe are pre-seeded,
   but nothing about them is special — remove or replace either one like any
   other tile).
4. Optionally set up AnyDesk unattended access for remote support later.

After that, pressing **F4** at any time reopens Admin; everywhere else, F4 is
the only way back — there's no visible settings icon on Home, by design.

## How it's built

| Layer | Choice |
|---|---|
| Desktop shell | [Tauri](https://tauri.app/) — small, fast, and lets the lockdown logic live in Rust |
| Frontend | React + TypeScript + Tailwind + shadcn/ui |
| Native lockdown (kiosk mode, keyboard hooks, taskbar hiding) | Rust, isolated in its own auditable module |
| Reliability | A Windows Scheduled Task plus a separate, minimal watchdog binary |
| Config | A local JSON file per install — no database, no server |
| i18n | A small typed dictionary (Spanish + English), no external framework |

The full architecture, every deliberate decision behind it, and the coding
conventions for contributing are documented in [`CLAUDE.md`](CLAUDE.md) and
[`AGENTS.md`](AGENTS.md) — read those before opening a PR.

## Privacy and security

- No install ever "phones home." There is no analytics, no crash reporting to
  any server the maintainers control, and no update check beyond fetching a
  public, static release manifest.
- No credential — AnyDesk or otherwise — is ever stored in this repository or
  transmitted anywhere by NoniOS itself.
- Every installation is completely isolated. Nothing about one family's setup
  is visible to, or shared with, anyone else's.

If you find a security issue, please open an issue describing it rather than
including exploit details publicly.

## Contributing

Contributions are welcome. Before writing any code:

1. Read [`CLAUDE.md`](CLAUDE.md) for the product's architecture and the
   reasoning behind it.
2. Read [`AGENTS.md`](AGENTS.md) for coding conventions, testing expectations,
   and the security rules that apply to native/lockdown code specifically.
3. Keep changes scoped — this project favors small, reviewable sessions over
   large speculative rewrites.

## License

[MIT](LICENSE). Use it, fork it, adapt it for whoever you're building it for.
