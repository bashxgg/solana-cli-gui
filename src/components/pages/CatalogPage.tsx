import { commandsForPage } from "../../lib/commands/catalog";
import type { PageId } from "../../lib/types";
import { CommandForm } from "../forms/CommandForm";

const TITLES: Partial<
  Record<PageId, { title: string; blurb: string; detail: string }>
> = {
  config: {
    title: "Config",
    blurb: "CLI defaults",
    detail:
      "Manage the Solana CLI config file (~/.config/solana/cli/config.yml): which cluster (RPC) you talk to, which keypair signs by default, and commitment. Changes here affect every later command unless overridden in the top bar (-u / -k).",
  },
  wallet: {
    title: "Wallet",
    blurb: "keys, SOL, faucet",
    detail:
      "Inspect and fund your default wallet: public address, SOL balance, testnet airdrop, and keypair file tools. Vanity grind (custom address prefixes) is further down this page.",
  },
  accounts: {
    title: "Accounts",
    blurb: "inspect chain state",
    detail:
      "Read any on-chain account, estimate rent-exempt minimums, confirm transactions by signature, browse recent history, and derive program PDAs. All of these are informational except where noted.",
  },
  transfer: {
    title: "Transfer",
    blurb: "move SOL / nonces",
    detail:
      "Send SOL between wallets and create durable nonce accounts for offline or delayed transactions. These write to the chain — confirm the cluster carefully (especially mainnet).",
  },
  stake: {
    title: "Stake",
    blurb: "delegate SOL",
    detail:
      "Native Solana staking: create stake accounts, delegate to validators, deactivate, and withdraw after cooldown. Stake activates and deactivates across epoch boundaries.",
  },
  vote: {
    title: "Validators",
    blurb: "vote set & gossip",
    detail:
      "Inspect vote accounts, the active validator set (stake, performance), and gossip peers. Useful when choosing who to stake to or checking network membership.",
  },
  program: {
    title: "Program",
    blurb: "on-chain programs",
    detail:
      "Show, deploy, and dump BPF/SBF programs. Deploy uploads a .so binary and spends SOL for rent and fees. Dump downloads bytecode for offline inspection.",
  },
  tokens: {
    title: "Tokens",
    blurb: "SPL Token CLI",
    detail:
      "Wraps the spl-token binary: list holdings, check balances and mint supply, transfer tokens, or create a new mint. Distinct from native SOL transfers.",
  },
  cluster: {
    title: "Cluster",
    blurb: "network status",
    detail:
      "Live cluster metrics: epoch progress, slot and block height, software version, SOL supply, inflation, priority fees, and a ping tool for RPC latency.",
  },
};

export function CatalogPage({ page }: { page: PageId }) {
  const meta = TITLES[page] ?? {
    title: page,
    blurb: "",
    detail: "",
  };
  const cmds = commandsForPage(page);

  return (
    <div className="space-y-3">
      <header className="space-y-1">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[13px] font-medium text-fg">{meta.title}</h1>
          {meta.blurb ? (
            <span className="text-[11px] text-fg-dim">{meta.blurb}</span>
          ) : null}
        </div>
        {meta.detail ? (
          <p className="max-w-3xl text-[11px] leading-relaxed text-fg-muted">{meta.detail}</p>
        ) : null}
      </header>
      {cmds.length === 0 ? (
        <p className="text-[12px] text-fg-dim">no forms — use console</p>
      ) : (
        <div className="flex flex-col gap-px border border-border bg-border">
          {cmds.map((cmd) => (
            <CommandForm key={cmd.id} cmd={cmd} />
          ))}
        </div>
      )}
    </div>
  );
}
