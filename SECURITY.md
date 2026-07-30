# Security Policy

## What this app does

**solana cli** is a desktop GUI that shells out to local binaries (`solana`, `solana-keygen`, `spl-token`, and optionally `soltop`). It does **not** implement a wallet or store seed phrases.

## Report a vulnerability

Please **do not** open a public GitHub issue for security problems.

1. Prefer emailing the repository owner / maintainers privately, or
2. Use GitHub **Security Advisories** → *Report a vulnerability* on the repo (if enabled).

Include:

- Description of the issue and impact
- Steps to reproduce
- App version / commit hash and OS

## Safe contribution rules

- Never commit **keypair JSON**, seed phrases, private keys, or `.env` secrets.
- Vanity grind and CLI tools often write keypairs into the **current working directory**. Do not leave them under the repo.
- Do not expand the process allowlist without discussion (`solana`, `solana-keygen`, `spl-token` only for arbitrary run).
- Prefer argv arrays over shell strings for any new process execution.

## Known trust boundaries

| Boundary | Notes |
|----------|--------|
| Local CLI | The app trusts binaries found on `PATH` / known install dirs |
| Confirm dialogs | Value-moving commands require UI confirmation; still treat mainnet carefully |
| Install scripts | “Install” opens a system terminal with install recipes; review scripts before running |
| Solscan links | Opens browser to third-party explorer; cluster is inferred from RPC URL |

## Disclaimer

This software is provided as-is. Using mainnet with real funds is at your own risk. Always verify the cluster, keypair path, and command preview before confirming.
