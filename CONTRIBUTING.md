# Contributing

Thanks for helping improve **solana cli**.

## Development setup

**Requirements**

- [Bun](https://bun.sh/) 1.1+
- [Rust](https://rustup.rs/) stable
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) on `PATH` (optional but needed for most features)
- macOS (supported platform for releases; other OSes are not targeted)

```bash
git clone https://github.com/bashxgg/solana-cli-gui.git
cd solana-cli-gui
bun install
bun run tauri:dev
```

Build a release app:

```bash
bun run tauri:build
```

## Project layout

| Path | Role |
|------|------|
| `src/` | React UI (pages, layout, forms) |
| `src/lib/commands/catalog.ts` | Command catalog + form field metadata |
| `src-tauri/src/cli/` | Binary resolve, process runner, streaming, install launchers |
| `src-tauri/src/lib.rs` | Tauri command registration |
| `src-tauri/tauri.conf.json` | App metadata, window, bundle icons |

## Coding guidelines

- Keep the UI dense / utilitarian (workstation tool, not marketing chrome).
- New CLI surfaces: add catalog entries with a clear **description** and field **help**.
- Dangerous / chain-writing commands: set `requiresConfirm` / `dangerous` and test the confirm dialog.
- Process execution: **argv only**, allowlisted binaries only.
- Prefer TypeScript types in `src/lib/types.ts` for anything shared with Rust serde (camelCase).

## Pull requests

1. Fork and branch from `main`.
2. Keep PRs focused (one feature or fix).
3. Describe what changed and how you tested (`bun run tauri:dev`, optional `cargo test` in `src-tauri`).
4. Do not include build artifacts, keypairs, or personal config.

## License

By contributing, you agree that your contributions are licensed under the MIT License (see [LICENSE](./LICENSE)).
