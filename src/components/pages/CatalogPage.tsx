import { commandsForPage } from "../../lib/commands/catalog";
import type { PageId } from "../../lib/types";
import { CommandForm } from "../forms/CommandForm";

const TITLES: Partial<Record<PageId, { title: string; blurb: string }>> = {
  config: { title: "Config", blurb: "cli defaults" },
  wallet: { title: "Wallet", blurb: "balance · airdrop · keys" },
  accounts: { title: "Accounts", blurb: "inspect · rent · history" },
  transfer: { title: "Transfer", blurb: "send SOL" },
  nonce: { title: "Nonce", blurb: "durable nonces" },
  stake: { title: "Stake", blurb: "delegate · withdraw" },
  vote: { title: "Validators", blurb: "vote · gossip" },
  program: { title: "Program", blurb: "deploy · dump" },
  tokens: { title: "Tokens", blurb: "spl-token" },
  wrap: { title: "Wrap / unwrap", blurb: "SOL ↔ WSOL" },
  reclaim: { title: "Reclaim rent", blurb: "close empty ATAs" },
  alt: { title: "Lookup tables", blurb: "v0 ALTs" },
  cluster: { title: "Cluster", blurb: "epoch · slot · fees" },
};

export function CatalogPage({
  page,
  hideHeader = false,
}: {
  page: PageId;
  hideHeader?: boolean;
}) {
  const meta = TITLES[page] ?? { title: page, blurb: "" };
  const cmds = commandsForPage(page);

  return (
    <div className="space-y-3">
      {!hideHeader ? (
        <header className="flex items-baseline gap-2">
          <h1 className="text-[13px] font-medium text-fg">{meta.title}</h1>
          {meta.blurb ? (
            <span className="text-[11px] text-fg-dim">{meta.blurb}</span>
          ) : null}
        </header>
      ) : (
        <h2 className="text-[12px] font-medium text-fg-muted">Manual commands</h2>
      )}
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
