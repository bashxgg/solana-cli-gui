import type { AppStatus } from "../../lib/types";
import type { SolscanCluster } from "../../lib/solscan";
import { isMainnetUrl, shorten } from "../../lib/run";
import { SolscanLink } from "../SolscanLink";

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
  const solana = status?.binaries.find((b) => b.name === "solana");
  const address = status?.address?.stdout?.trim() ?? "";
  const balanceRaw = status?.balance?.stdout?.trim() ?? "";
  let balance = "—";
  try {
    const j = JSON.parse(balanceRaw);
    balance =
      typeof j === "object" && j !== null && "value" in j
        ? `${j.value} SOL`
        : balanceRaw || "—";
  } catch {
    balance = balanceRaw.split("\n")[0] || "—";
  }

  const configText = status?.config?.stdout ?? "";
  const urlMatch = configText.match(/RPC URL:\s*(.+)/i);
  const commitmentMatch = configText.match(/Commitment:\s*(.+)/i);
  const clusterLabel = overrideUrl || urlMatch?.[1]?.trim() || "—";
  const commitment = commitmentMatch?.[1]?.trim() || "—";
  const mainnet = isMainnetUrl(clusterLabel);

  return (
    <footer className="flex h-6 shrink-0 items-center gap-0 border-t border-border bg-surface-1 mono text-[11px] text-fg-dim">
      <span
        className={["px-2", running ? "bg-warn-soft text-warn" : "text-ok"].join(" ")}
      >
        {running ? "RUN" : "OK"}
      </span>
      <Sep />
      <span className="max-w-[200px] truncate px-2" title={solana?.version ?? undefined}>
        {solana?.found ? solana.version ?? "solana" : "cli missing"}
      </span>
      <Sep />
      <span
        className={[
          "max-w-[220px] truncate px-2",
          mainnet ? "bg-danger-soft text-danger" : "",
        ].join(" ")}
        title={clusterLabel}
      >
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
      <span className="px-2">{commitment}</span>
    </footer>
  );
}

function Sep() {
  return <span className="h-full w-px shrink-0 bg-border" aria-hidden />;
}
