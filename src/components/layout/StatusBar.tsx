import type { AppStatus } from "../../lib/types";
import type { SolscanCluster } from "../../lib/solscan";
import { formatBalance, isMainnetUrl, shortCliVersion, shorten } from "../../lib/run";
import { SolscanLink } from "../SolscanLink";
import { useApp } from "../../lib/context";

export function StatusBar({
  status,
  running,
  overrideUrl,
  cluster,
}: {
  status: AppStatus | null;
  running: boolean;
  overrideUrl: string;
  cluster: SolscanCluster;
}) {
  const { overrides } = useApp();
  const solana = status?.binaries.find((b) => b.name === "solana");
  const address = status?.address?.stdout?.trim() ?? "";
  const balance = formatBalance(status?.balance?.stdout);

  const configText = status?.config?.stdout ?? "";
  const urlMatch = configText.match(/RPC URL:\s*(.+)/i);
  const clusterLabel = overrideUrl.trim() || urlMatch?.[1]?.trim() || "—";
  const commitment =
    overrides.commitment?.trim() ||
    configText.match(/Commitment:\s*(.+)/i)?.[1]?.trim() ||
    "confirmed";

  const hasCustomRpc = overrideUrl.trim().length > 0;
  const mainnetDefault = !hasCustomRpc && isMainnetUrl(clusterLabel);
  const rpcClass = hasCustomRpc
    ? "text-ok"
    : mainnetDefault
      ? "text-danger"
      : "text-fg-muted";

  return (
    <footer className="flex h-6 shrink-0 items-center gap-0 border-t border-border bg-surface-1 mono text-[11px] text-fg-dim">
      <span
        className={["px-2", running ? "text-warn" : ""].join(" ")}
        title={solana?.version ?? undefined}
      >
        {solana?.found ? shortCliVersion(solana.version) : "no cli"}
      </span>
      <Sep />
      <span className={["max-w-[200px] truncate px-2", rpcClass].join(" ")} title={clusterLabel}>
        {clusterLabel}
      </span>
      <Sep />
      <span className="px-2 text-fg-muted" title={address || undefined}>
        {address ? (
          <SolscanLink id={address} cluster={cluster} kind="account">
            {shorten(address, 4)}
          </SolscanLink>
        ) : (
          "—"
        )}
      </span>
      <Sep />
      <span className="px-2 text-fg-muted">{balance}</span>
      <Sep />
      <span className="px-2 text-ok">{commitment}</span>
    </footer>
  );
}

function Sep() {
  return <span className="h-full w-px shrink-0 bg-border" aria-hidden />;
}
