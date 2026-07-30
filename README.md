# solana cli

Desktop GUI for the [Solana CLI](https://docs.solana.com/cli) — built with **Tauri 2**, **React**, **TypeScript**, and **Bun**.

A dense workstation-style wrapper around your local tools: `solana`, `solana-keygen`, `spl-token`, plus optional [soltop](https://github.com/soltop-sh/soltop-oss) launch support.

> **Not an official Solana Foundation product.** Not a wallet. It runs binaries already installed on your machine.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2-orange.svg)
![Bun](https://img.shields.io/badge/bun-1.x-black.svg)

## Features

- **Catalog forms** for common CLI workflows (config, wallet, transfer, stake, programs, tokens, cluster, …) with plain-English descriptions
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
| OS | macOS, Linux, or Windows |

Optional: [soltop](https://github.com/soltop-sh/soltop-oss) for the program-monitor TUI integration.

```bash
# soltop (works on macOS via source build)
cargo install --git https://github.com/soltop-sh/soltop-oss
export PATH="$HOME/.cargo/bin:$PATH"
```

## Quick start

```bash
git clone https://github.com/<you>/solana-cli-gui.git
cd solana-cli-gui
bun install
bun run tauri:dev
```

### Production build

```bash
bun run tauri:build
```

Artifacts land under `src-tauri/target/release/bundle/`.

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
