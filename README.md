# solana cli

Desktop GUI for the [Solana CLI](https://docs.solana.com/cli) — built with **Tauri 2**, **React**, **TypeScript**, and **Bun**.

A dense workstation-style wrapper around your local tools: `solana`, `solana-keygen`, `spl-token`, plus optional [soltop](https://github.com/soltop-sh/soltop-oss) launch support.

> **Not an official Solana Foundation product.** Not a wallet. It runs binaries already installed on your machine.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-orange.svg)](https://tauri.app/)
[![Release](https://img.shields.io/github/v/release/bashxgg/solana-cli-gui?include_prereleases)](https://github.com/bashxgg/solana-cli-gui/releases)

## Download

Prebuilt **macOS Apple Silicon** apps are on **[GitHub Releases](https://github.com/bashxgg/solana-cli-gui/releases)** (arm64 only — no Intel Mac / Windows builds).

| Platform | Asset |
|----------|--------|
| macOS Apple Silicon (M1+) | `.dmg` (`aarch64`) |

You still need the **Solana CLI** on your `PATH` (`solana`, `solana-keygen`, `spl-token`). This app does not bundle those tools.

### Install

1. Download the arm64 `.dmg` from Releases  
2. Open → drag **solana cli** to Applications → open  

**Signed + notarized** releases open without Gatekeeper “damaged” warnings.  
That requires Apple Developer ID secrets on the repo — see [docs/MACOS_SIGNING.md](./docs/MACOS_SIGNING.md).

Until those secrets are configured, browser downloads may still show *“app is damaged”*. Temporary workaround:

```bash
curl -fsSL https://raw.githubusercontent.com/bashxgg/solana-cli-gui/main/scripts/install-macos.sh | bash
```

## Features

- **Catalog forms** for common CLI workflows (config, wallet, transfer, stake, programs, tokens, reclaim rent / close accounts, address lookup tables, cluster, …) with plain-English descriptions
- **Reclaim rent** scan UI (sol-incinerator-style): list empty SPL token accounts and close them via `spl-token gc` / `close`
- **Console** escape hatch for any allowlisted subcommand
- **Global overrides**: RPC (`-u`), keypair (`-k`), commitment, config path, JSON / verbose / skip-preflight
- **Vanity grind** UI for `solana-keygen grind` (streamed output + cancel)
- **Solscan links** for addresses and transaction signatures (cluster-aware)
- **Confirm dialogs** for chain-writing actions + mainnet warnings
- **Tool install helpers** on Overview (opens system terminal)
- **soltop** launcher (opens system terminal with `--rpc-url`)

## Requirements

| Tool | Notes |
|------|--------|
| [Bun](https://bun.sh/) 1.1+ | Frontend package manager / scripts |
| [Rust](https://rustup.rs/) stable | Tauri backend |
| [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) | `solana`, `solana-keygen`, `spl-token` on `PATH` |
| OS | **macOS Apple Silicon** (M1/M2/M3/…); release builds are arm64-only |

Optional: [soltop](https://github.com/soltop-sh/soltop-oss) for the program-monitor TUI integration.

```bash
# soltop (works on macOS via source build)
cargo install --git https://github.com/soltop-sh/soltop-oss
export PATH="$HOME/.cargo/bin:$PATH"
```

## Quick start

```bash
git clone https://github.com/bashxgg/solana-cli-gui.git
cd solana-cli-gui
bun install
bun run tauri:dev
```

### Production build (this machine)

```bash
bun run tauri:build
```

Artifacts land under `src-tauri/target/release/bundle/` (e.g. `.dmg` on macOS).

### Publishing a release (maintainers)

1. Bump `version` in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` together.
2. Commit, then tag and push:
   ```bash
   git tag v0.1.0
   git push origin main --tags
   ```
3. GitHub Actions (`.github/workflows/release.yml`) builds the macOS arm64 DMG and attaches it to the Release.

### Useful scripts

| Script | Description |
|--------|-------------|
| `bun run tauri:dev` | Dev app + Vite HMR |
| `bun run tauri:build` | Release bundle |
| `bun run build` | Frontend only (`tsc` + Vite) |
| `bun run tauri icon <png>` | Regenerate app icons from a 1024×1024 source |

## Project layout

```
solana-cli-gui/
├── src/                      # React UI
│   ├── components/
│   ├── lib/
│   │   └── commands/catalog.ts
│   └── styles/
├── src-tauri/                # Rust / Tauri
│   ├── src/cli/              # process runner, streaming, installers
│   ├── icons/
│   └── tauri.conf.json
├── public/
├── package.json
├── bun.lock
└── LICENSE
```

## Configuration

App toolbar settings (RPC, keypair, commitment, flags) persist to:

```text
~/.config/solana-cli-gui/config.toml
```

Example:

```toml
url = "devnet"
keypair = ""
commitment = "confirmed"
solana_config = ""
ws = ""
json = false
verbose = false
skip_preflight = false
```

- `solana_config` is the optional path passed as Solana CLI `-C` (usually still a **config.yml** from the Solana CLI).
- This TOML file is **only** for the GUI; it does not replace `~/.config/solana/cli/config.yml`.

## Safety model

- **Allowlisted binaries only**: `solana`, `solana-keygen`, `spl-token` for arbitrary execution; `soltop` for dedicated launch
- **No shell string interpolation** — commands use argv arrays
- **Confirm** before transfers, deploys, stake mutations, etc.
- **No private keys in the UI** — only paths and pubkeys
- **Never commit keypair JSON** — vanity grind writes files to the process CWD; keep them out of git

See [SECURITY.md](./SECURITY.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Trademark note

“Solana” is a trademark of Solana Foundation. This project is an independent open-source tool and is not affiliated with or endorsed by Solana Foundation.

## License

[MIT](./LICENSE)
