import { useState } from "react";
import type { AppStatus, BinaryInfo, PageId } from "../../lib/types";
import type { SolscanCluster } from "../../lib/solscan";
import { formatBalance, shorten, tryFormatJson } from "../../lib/run";
import { useApp } from "../../lib/context";
import { launchInstall } from "../../lib/tauri";
import { LinkifiedText, SolscanLink } from "../SolscanLink";

/** Full version line for overview — keep detail visible, not abbreviated. */
function binaryLabel(b: BinaryInfo | undefined): { text: string; missing: boolean } {
  if (!b?.found) return { text: "not installed", missing: true };
  const v = b.version?.trim() ?? "";
  if (!v || /error|unexpected/i.test(v)) {
    return { text: "installed (no --version)", missing: false };
  }
  if (/^installed/i.test(v)) return { text: v, missing: false };
  return { text: v, missing: false };
}

const TOOLS: { name: string; install: string }[] = [
  { name: "solana", install: "solana" },
  { name: "solana-keygen", install: "solana-keygen" },
  { name: "spl-token", install: "spl-token" },
  { name: "soltop", install: "soltop" },
];

const JUMPS: { id: PageId; label: string }[] = [
  { id: "config", label: "config" },
  { id: "wallet", label: "wallet" },
  { id: "transfer", label: "transfer" },
  { id: "soltop", label: "soltop" },
  { id: "console", label: "console" },
];

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
  const [msg, setMsg] = useState<string | null>(null);

  const addressRaw = status?.address?.stdout?.trim() ?? "";
  const balance = formatBalance(status?.balance?.stdout);

  async function onInstall(tool: string) {
    setMsg(null);
    setInstalling(tool);
    try {
      setMsg(await launchInstall(tool));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[13px] font-medium text-fg">Overview</h1>
        <button
          type="button"
          className="btn-ghost"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "…" : "refresh"}
        </button>
      </header>

      <dl className="panel divide-y divide-border">
        <Row label="address">
          {addressRaw ? (
            <SolscanLink id={addressRaw} cluster={cluster} kind="account">
              {shorten(addressRaw, 8)}
            </SolscanLink>
          ) : (
            "—"
          )}
        </Row>
        <Row label="balance">{balance}</Row>

        {TOOLS.map(({ name, install }) => {
          const info = status?.binaries.find((b) => b.name === name);
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
                title={info?.path ? `${text} · ${info.path}` : text}
              >
                {text}
                {info?.found && info.path ? (
                  <span className="ml-2 text-[10px] text-fg-dim">{info.path}</span>
                ) : null}
              </dd>
              <dd className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className={
                    missing
                      ? "btn-primary py-0.5 text-[11px]"
                      : "btn-install-done py-0.5 text-[11px]"
                  }
                  disabled={!missing || installing !== null}
                  title={info?.path ?? (missing ? "Install" : "Installed")}
                  onClick={() => missing && void onInstall(install)}
                >
                  {installing === install ? "…" : missing ? "install" : "installed"}
                </button>
                {!missing && name === "soltop" ? (
                  <button
                    type="button"
                    className="btn-ghost py-0.5 text-[11px]"
                    onClick={() => setPage("soltop")}
                  >
                    open
                  </button>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>

      {msg ? <p className="mono text-[11px] text-fg-muted">{msg}</p> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="panel min-h-0">
          <div className="panel-head">config get</div>
          <pre className="mono max-h-56 overflow-auto p-2 text-[11px] leading-snug text-fg-muted">
            {status?.config?.stdout?.trim() ? (
              <LinkifiedText text={status.config.stdout.trim()} cluster={cluster} />
            ) : (
              "—"
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
        {JUMPS.map(({ id, label }) => (
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 px-2.5 py-1.5 text-[12px]">
      <dt className="text-fg-dim">{label}</dt>
      <dd className="mono min-w-0 truncate text-fg">{children}</dd>
    </div>
  );
}
