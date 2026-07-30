import { useState } from "react";
import type { AppStatus, BinaryInfo } from "../../lib/types";
import type { SolscanCluster } from "../../lib/solscan";
import { shorten, tryFormatJson } from "../../lib/run";
import { useApp } from "../../lib/context";
import { launchInstall } from "../../lib/tauri";
import { LinkifiedText, SolscanLink } from "../SolscanLink";

function formatBalance(stdout: string | undefined): string {
  if (!stdout?.trim()) return "—";
  const raw = stdout.trim();
  try {
    const j = JSON.parse(raw);
    if (typeof j === "object" && j !== null) {
      if ("value" in j && typeof (j as { value: unknown }).value === "number") {
        return `${(j as { value: number }).value} SOL`;
      }
      // solana balance --output json sometimes: { "lamports": n }
      if ("lamports" in j && typeof (j as { lamports: unknown }).lamports === "number") {
        const lamports = (j as { lamports: number }).lamports;
        return `${lamports / 1e9} SOL (${lamports} lamports)`;
      }
    }
  } catch {
    /* plain text */
  }
  return raw.split("\n")[0];
}

function binaryLabel(b: BinaryInfo | undefined): {
  text: string;
  missing: boolean;
} {
  if (!b?.found) return { text: "not installed", missing: true };
  const v = b.version?.trim() ?? "";
  if (!v || v.toLowerCase().includes("error") || v.toLowerCase().includes("unexpected")) {
    return { text: "installed", missing: false };
  }
  return { text: v, missing: false };
}

export function Dashboard({
  status,
  onRefresh,
  loading,
  cluster,
}: {
  status: AppStatus | null;
  onRefresh: () => void;
  loading: boolean;
  cluster: SolscanCluster;
}) {
  const { setPage } = useApp();
  const [installing, setInstalling] = useState<string | null>(null);
  const [installMsg, setInstallMsg] = useState<string | null>(null);
  const [installErr, setInstallErr] = useState<string | null>(null);

  const addressRaw = status?.address?.stdout?.trim() ?? "";
  const balance = formatBalance(status?.balance?.stdout);

  const tools: { name: string; info: BinaryInfo | undefined; installTool: string }[] = [
    {
      name: "solana",
      info: status?.binaries.find((b) => b.name === "solana"),
      installTool: "solana",
    },
    {
      name: "solana-keygen",
      info: status?.binaries.find((b) => b.name === "solana-keygen"),
      installTool: "solana-keygen",
    },
    {
      name: "spl-token",
      info: status?.binaries.find((b) => b.name === "spl-token"),
      installTool: "spl-token",
    },
    {
      name: "soltop",
      info: status?.binaries.find((b) => b.name === "soltop"),
      installTool: "soltop",
    },
  ];

  async function onInstall(tool: string) {
    setInstallErr(null);
    setInstallMsg(null);
    setInstalling(tool);
    try {
      const msg = await launchInstall(tool);
      setInstallMsg(msg);
    } catch (e) {
      setInstallErr(e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-[13px] font-medium text-fg">Overview</h1>
          <p className="max-w-2xl text-[11px] leading-relaxed text-fg-muted">
            Snapshot from your installed Solana tools: which binaries are found, your configured
            wallet address and SOL balance, full CLI config, and current epoch. Addresses and
            signatures link to Solscan ({cluster}). Missing tools show an install button (opens
            Terminal).
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost shrink-0"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "…" : "refresh"}
        </button>
      </header>

      <dl className="panel divide-y divide-border">
        <div className="grid grid-cols-[110px_1fr] gap-2 px-2.5 py-1.5 text-[12px]">
          <dt className="text-fg-dim">address</dt>
          <dd className="mono min-w-0 truncate text-fg" title={addressRaw || undefined}>
            {addressRaw ? (
              <SolscanLink id={addressRaw} cluster={cluster} kind="account">
                {shorten(addressRaw, 8)}
              </SolscanLink>
            ) : (
              "—"
            )}
            {addressRaw ? (
              <span className="ml-2 text-[10px] text-fg-dim">solscan</span>
            ) : null}
          </dd>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-2 px-2.5 py-1.5 text-[12px]">
          <dt className="text-fg-dim">balance</dt>
          <dd className="mono min-w-0 truncate text-fg" title={balance}>
            {balance}
          </dd>
        </div>

        {tools.map(({ name, info, installTool }) => {
          const { text, missing } = binaryLabel(info);
          return (
            <div
              key={name}
              className="grid grid-cols-[110px_1fr_auto] items-center gap-2 px-2.5 py-1.5 text-[12px]"
            >
              <dt className="text-fg-dim">{name}</dt>
              <dd
                className={[
                  "mono min-w-0 truncate",
                  missing ? "text-danger" : "text-fg",
                ].join(" ")}
                title={info?.path ?? text}
              >
                {text}
                {info?.found && info.path ? (
                  <span className="ml-2 text-[10px] text-fg-dim">{info.path}</span>
                ) : null}
              </dd>
              <dd className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  className={[
                    "py-0.5 text-[11px]",
                    missing ? "btn-primary" : "btn-install-done",
                  ].join(" ")}
                  disabled={!missing || installing !== null}
                  title={
                    missing
                      ? installTool === "soltop"
                        ? "cargo install soltop from GitHub (opens Terminal)"
                        : "Install Solana CLI via official Agave installer (opens Terminal)"
                      : "Already installed"
                  }
                  onClick={() => {
                    if (missing) void onInstall(installTool);
                  }}
                >
                  {installing === installTool ? "…" : missing ? "install" : "installed"}
                </button>
                {!missing && name === "soltop" ? (
                  <button
                    type="button"
                    className="btn-ghost py-0.5 text-[11px]"
                    onClick={() => setPage("soltop")}
                    title="Open soltop launcher"
                  >
                    open
                  </button>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>

      {installMsg ? (
        <p className="mono text-[11px] text-ok">{installMsg}</p>
      ) : null}
      {installErr ? (
        <p className="mono text-[11px] text-danger">{installErr}</p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="panel min-h-0">
          <div className="panel-head">config get</div>
          <pre className="mono max-h-56 overflow-auto p-2 text-[11px] leading-snug text-fg-muted">
            {status?.config?.stdout?.trim() ? (
              <LinkifiedText text={status.config.stdout.trim()} cluster={cluster} />
            ) : (
              "no output — is solana on PATH?"
            )}
          </pre>
        </section>
        <section className="panel min-h-0">
          <div className="panel-head">epoch-info</div>
          <pre className="mono max-h-56 overflow-auto p-2 text-[11px] leading-snug text-fg-muted">
            {status?.epochInfo?.stdout ? (
              <LinkifiedText
                text={tryFormatJson(status.epochInfo.stdout)}
                cluster={cluster}
              />
            ) : (
              "—"
            )}
          </pre>
        </section>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
        <span className="text-fg-dim">jump</span>
        {(
          [
            ["config", "config"],
            ["wallet", "wallet"],
            ["transfer", "transfer"],
            ["soltop", "soltop"],
            ["console", "console"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="text-accent hover:underline"
            onClick={() => setPage(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
