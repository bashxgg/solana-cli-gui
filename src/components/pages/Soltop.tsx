import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../lib/context";
import { getSoltopStatus, launchSoltop } from "../../lib/tauri";
import type { BinaryInfo } from "../../lib/types";

const REPO = "https://github.com/soltop-app/soltop-oss";
const INSTALL_GIT = "https://github.com/soltop-sh/soltop-oss";

const MONIKER_RPC: Record<string, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
  localhost: "http://127.0.0.1:8899",
  d: "https://api.devnet.solana.com",
  t: "https://api.testnet.solana.com",
  m: "https://api.mainnet-beta.solana.com",
  l: "http://127.0.0.1:8899",
};

function expandRpc(url: string): string {
  const u = url.trim();
  if (!u) return MONIKER_RPC["mainnet-beta"];
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return MONIKER_RPC[u.toLowerCase()] ?? u;
}

export function SoltopPage() {
  const { overrides } = useApp();
  const [info, setInfo] = useState<BinaryInfo | null>(null);
  const [hideSystem, setHideSystem] = useState(true);
  const [verbose, setVerbose] = useState(false);
  const [rpcOverride, setRpcOverride] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLaunch, setLastLaunch] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setInfo(await getSoltopStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const effectiveRpc = useMemo(() => {
    if (rpcOverride.trim()) return expandRpc(rpcOverride);
    if (overrides.url.trim()) return expandRpc(overrides.url);
    return MONIKER_RPC["mainnet-beta"];
  }, [rpcOverride, overrides.url]);

  const preview = useMemo(() => {
    const parts = ["soltop", "--rpc-url", effectiveRpc];
    if (hideSystem) parts.push("--hide-system");
    if (verbose) parts.push("--verbose");
    return parts.join(" ");
  }, [effectiveRpc, hideSystem, verbose]);

  async function onLaunch() {
    setError(null);
    setBusy(true);
    try {
      const result = await launchSoltop({
        rpcUrl: effectiveRpc,
        hideSystem,
        verbose,
      });
      setLastLaunch(result.commandPreview);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function openRepo() {
    try {
      await openUrl(REPO);
    } catch {
      window.open(REPO, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[13px] font-medium text-fg">soltop</h1>
          <span className="text-[11px] text-fg-dim">program monitor TUI</span>
        </div>
        <p className="max-w-3xl text-[11px] leading-relaxed text-fg-muted">
          Launch{" "}
          <button type="button" className="text-accent hover:underline" onClick={() => void openRepo()}>
            soltop
          </button>{" "}
          (htop-style live Solana program stats: TPS, CU/sec, success rates) in your system
          terminal. Full-screen TUI — we open Terminal and pass your RPC. Official prebuilt
          releases are Linux-only; on macOS it works fine built from source (Rust). Source:{" "}
          <span className="mono text-fg-dim">{REPO}</span>
        </p>
      </header>

      <dl className="panel divide-y divide-border text-[12px]">
        <div className="grid grid-cols-[100px_1fr] gap-2 px-2.5 py-1.5">
          <dt className="text-fg-dim">status</dt>
          <dd className={info?.found ? "text-ok" : "text-danger"}>
            {info?.found ? "installed" : "not found"}
          </dd>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2 px-2.5 py-1.5">
          <dt className="text-fg-dim">path</dt>
          <dd className="mono truncate text-fg-muted" title={info?.path ?? undefined}>
            {info?.path ?? "—"}
          </dd>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2 px-2.5 py-1.5">
          <dt className="text-fg-dim">rpc</dt>
          <dd className="mono truncate text-fg" title={effectiveRpc}>
            {effectiveRpc}
          </dd>
        </div>
      </dl>

      {!info?.found ? (
        <section className="panel p-2.5 space-y-2 text-[12px]">
          <div className="font-medium text-fg">Install soltop (macOS / source)</div>
          <p className="text-[11px] text-fg-muted">
            No official macOS binary yet — build from source (works on Mac with Rust 1.75+). Put
            the binary on PATH so this app can find it (usually{" "}
            <span className="mono">~/.cargo/bin</span>).
          </p>
          <pre className="mono overflow-x-auto bg-surface-0 p-2 text-[11px] text-fg-muted">
{`# recommended: install into ~/.cargo/bin
cargo install --git ${INSTALL_GIT}

# or build in-repo:
git clone ${INSTALL_GIT}.git
cd soltop-oss && cargo build --release
# then either:
#   cp target/release/soltop ~/.cargo/bin/
#   # or keep using ./target/release/soltop from a terminal

# verify
which soltop
# if empty: export PATH="$HOME/.cargo/bin:$PATH"`}
          </pre>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => void openRepo()}>
              open github
            </button>
            <button type="button" className="btn-ghost" onClick={() => void refresh()}>
              re-check
            </button>
          </div>
        </section>
      ) : null}

      <form
        className="panel space-y-2.5 p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void onLaunch();
        }}
      >
        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] text-fg-dim">
            RPC URL (empty = top-bar -u, else mainnet public RPC)
          </span>
          <input
            className="field mono"
            placeholder={overrides.url || "mainnet-beta / https://…"}
            value={rpcOverride}
            onChange={(e) => setRpcOverride(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mono text-[11px] text-fg-dim">
          <label
            className="flex cursor-pointer items-center gap-1"
            title="Hide Vote, ComputeBudget, System programs (soltop --hide-system)"
          >
            <input
              type="checkbox"
              checked={hideSystem}
              onChange={(e) => setHideSystem(e.target.checked)}
            />
            hide-system
          </label>
          <label
            className="flex cursor-pointer items-center gap-1"
            title="Extra performance stats (soltop --verbose)"
          >
            <input
              type="checkbox"
              checked={verbose}
              onChange={(e) => setVerbose(e.target.checked)}
            />
            verbose
          </label>
        </div>

        <pre className="mono overflow-x-auto bg-surface-0 px-2 py-1 text-[10px] text-fg-dim">
          {preview}
        </pre>

        {error ? <div className="mono text-[11px] text-danger">{error}</div> : null}
        {lastLaunch ? (
          <div className="mono text-[10px] text-ok">launched: {lastLaunch}</div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || !info?.found}
            title={
              info?.found
                ? "Open system terminal and run soltop"
                : "Install soltop first"
            }
          >
            {busy ? "…" : "launch in terminal"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => void refresh()}>
            refresh status
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-head">keys (inside soltop)</div>
        <ul className="divide-y divide-border mono text-[11px] text-fg-muted">
          <li className="flex gap-3 px-2.5 py-1.5">
            <span className="w-6 text-fg">q</span>
            <span>quit</span>
          </li>
          <li className="flex gap-3 px-2.5 py-1.5">
            <span className="w-6 text-fg">t</span>
            <span>toggle program id truncation</span>
          </li>
          <li className="flex gap-3 px-2.5 py-1.5">
            <span className="w-6 text-fg">u</span>
            <span>toggle system program visibility</span>
          </li>
          <li className="flex gap-3 px-2.5 py-1.5">
            <span className="w-6 text-fg">w</span>
            <span>toggle live vs window aggregate stats</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
