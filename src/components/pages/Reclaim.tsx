import { useMemo, useState } from "react";
import { useApp } from "../../lib/context";
import { overridesToRequest, runSolanaCli } from "../../lib/tauri";
import type { CommandResult } from "../../lib/types";
import { ConfirmDialog } from "../forms/ConfirmDialog";
import { CatalogPage } from "./CatalogPage";
import { isMainnetUrl } from "../../lib/run";
import { SolscanLink } from "../SolscanLink";
import { resolveCluster } from "../../lib/solscan";

export interface TokenAccountRow {
  address: string;
  mint: string;
  amount: string;
  uiAmount: number | null;
  isEmpty: boolean;
}

function parseAccountsJson(stdout: string): TokenAccountRow[] {
  try {
    const data = JSON.parse(stdout) as unknown;
    // shapes: { accounts: [...] } | [...]
    const list: unknown[] = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as { accounts?: unknown }).accounts)
        ? ((data as { accounts: unknown[] }).accounts)
        : [];

    return list
      .map((raw): TokenAccountRow | null => {
        if (!raw || typeof raw !== "object") return null;
        const o = raw as Record<string, unknown>;
        const address = String(o.address ?? o.pubkey ?? o.account ?? "");
        const mint = String(o.mint ?? "");
        // amount can be string/number or nested tokenAmount
        let amount = "0";
        let uiAmount: number | null = null;
        if (typeof o.amount === "string" || typeof o.amount === "number") {
          amount = String(o.amount);
        }
        if (o.tokenAmount && typeof o.tokenAmount === "object") {
          const ta = o.tokenAmount as Record<string, unknown>;
          if (ta.amount != null) amount = String(ta.amount);
          if (typeof ta.uiAmount === "number") uiAmount = ta.uiAmount;
          else if (typeof ta.uiAmountString === "string") {
            const n = Number(ta.uiAmountString);
            uiAmount = Number.isFinite(n) ? n : null;
          }
        }
        if (typeof o.uiAmount === "number") uiAmount = o.uiAmount;
        if (uiAmount == null) {
          const n = Number(amount);
          uiAmount = Number.isFinite(n) ? n : null;
        }
        if (!address) return null;
        const isEmpty = uiAmount === 0 || amount === "0" || amount === "0.0";
        return { address, mint, amount, uiAmount, isEmpty };
      })
      .filter((r): r is TokenAccountRow => r !== null);
  } catch {
    return [];
  }
}

/** Sol-incinerator-style scan + close empty token accounts. */
export function ReclaimPage() {
  const { overrides, setRunning, pushHistory, running } = useApp();
  const [rows, setRows] = useState<TokenAccountRow[]>([]);
  const [scanRaw, setScanRaw] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmOne, setConfirmOne] = useState<string | null>(null);
  const [filter, setFilter] = useState<"empty" | "all">("empty");

  const cluster = resolveCluster(overrides.url);
  const mainnet = isMainnetUrl(overrides.url);

  const visible = useMemo(
    () => (filter === "empty" ? rows.filter((r) => r.isEmpty) : rows),
    [rows, filter]
  );

  const emptyCount = useMemo(() => rows.filter((r) => r.isEmpty).length, [rows]);
  // ~0.00203928 SOL classic ATA rent — rough estimate for UI only
  const estSol = (emptyCount * 0.00203928).toFixed(4);

  async function runCli(
    args: string[],
    opts?: { json?: boolean; timeoutMs?: number }
  ): Promise<CommandResult> {
    return runSolanaCli(
      overridesToRequest(overrides, {
        binary: "spl-token",
        args,
        json: opts?.json ?? false,
        timeoutMs: opts?.timeoutMs ?? 120_000,
      })
    );
  }

  async function scan() {
    setError(null);
    setRunning(true);
    try {
      const result = await runCli(["accounts", "--output", "json"], {
        json: false,
        timeoutMs: 90_000,
      });
      pushHistory(result);
      setScanRaw(result.stdout || result.stderr);
      if (result.exitCode !== 0) {
        setError(result.stderr || result.stdout || "scan failed");
        setRows([]);
        return;
      }
      const parsed = parseAccountsJson(result.stdout);
      setRows(parsed);
      setSelected(new Set(parsed.filter((r) => r.isEmpty).map((r) => r.address)));
      if (parsed.length === 0 && !result.stdout.includes("accounts")) {
        // plain-text fallback message
        setError(
          "No accounts parsed. Try Console: spl-token accounts --output json"
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  async function closeAllEmpty() {
    setError(null);
    setRunning(true);
    setConfirmBulk(false);
    try {
      const result = await runCli(
        ["gc", "--close-empty-associated-accounts"],
        { timeoutMs: 300_000 }
      );
      pushHistory(result);
      if (result.exitCode !== 0) {
        setError(result.stderr || result.stdout || "gc failed");
      }
      await scan();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRunning(false);
    }
  }

  async function closeOne(address: string) {
    setError(null);
    setRunning(true);
    setConfirmOne(null);
    try {
      const result = await runCli(["close", "--address", address], {
        timeoutMs: 90_000,
      });
      pushHistory(result);
      if (result.exitCode !== 0) {
        setError(result.stderr || result.stdout || "close failed");
      }
      await scan();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRunning(false);
    }
  }

  function toggle(addr: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(addr)) next.delete(addr);
      else next.add(addr);
      return next;
    });
  }

  function selectAllEmpty() {
    setSelected(new Set(rows.filter((r) => r.isEmpty).map((r) => r.address)));
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline gap-2">
        <h1 className="text-[13px] font-medium text-fg">Reclaim rent</h1>
        <span className="text-[11px] text-fg-dim">
          close empty ATAs · ~0.002 SOL each
        </span>
      </header>

      <section className="panel space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={running}
            onClick={() => void scan()}
          >
            {running ? "…" : "scan token accounts"}
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={running || emptyCount === 0}
            title="spl-token gc --close-empty-associated-accounts"
            onClick={() => setConfirmBulk(true)}
          >
            close all empty ({emptyCount})
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={emptyCount === 0}
            onClick={selectAllEmpty}
          >
            select empties
          </button>
          <div className="ml-auto flex items-center gap-3 text-[11px] text-fg-dim">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="filter"
                checked={filter === "empty"}
                onChange={() => setFilter("empty")}
              />
              empty only
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="filter"
                checked={filter === "all"}
                onChange={() => setFilter("all")}
              />
              all
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mono text-[11px] text-fg-muted">
          <span>
            accounts: <span className="text-fg">{rows.length}</span>
          </span>
          <span>
            empty: <span className="text-ok">{emptyCount}</span>
          </span>
          <span title="Rough estimate; actual rent depends on account size">
            ~reclaimable: <span className="text-fg">{estSol} SOL</span>
          </span>
        </div>

        {error ? (
          <div className="mono text-[11px] text-danger whitespace-pre-wrap">{error}</div>
        ) : null}

        {visible.length === 0 ? (
          <p className="text-[12px] text-fg-dim">
            {rows.length === 0
              ? "Scan to list token accounts for the configured keypair."
              : "No empty accounts — switch to “all” to see balances, or burn residual tokens first."}
          </p>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead className="bg-surface-2 text-[10px] text-fg-dim">
                <tr>
                  <th className="px-2 py-1.5 font-medium"> </th>
                  <th className="px-2 py-1.5 font-medium">account</th>
                  <th className="px-2 py-1.5 font-medium">mint</th>
                  <th className="px-2 py-1.5 font-medium">amount</th>
                  <th className="px-2 py-1.5 font-medium"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((r) => (
                  <tr key={r.address} className="bg-surface-1">
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={selected.has(r.address)}
                        disabled={!r.isEmpty}
                        onChange={() => toggle(r.address)}
                        title={r.isEmpty ? "Selected for bulk awareness" : "Not empty"}
                      />
                    </td>
                    <td className="mono max-w-[160px] truncate px-2 py-1.5 text-fg">
                      <SolscanLink id={r.address} cluster={cluster} kind="account">
                        {r.address.slice(0, 4)}…{r.address.slice(-4)}
                      </SolscanLink>
                    </td>
                    <td className="mono max-w-[140px] truncate px-2 py-1.5 text-fg-muted">
                      {r.mint ? (
                        <SolscanLink id={r.mint} cluster={cluster} kind="account">
                          {r.mint.slice(0, 4)}…{r.mint.slice(-4)}
                        </SolscanLink>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="mono px-2 py-1.5">
                      {r.isEmpty ? (
                        <span className="text-ok">0</span>
                      ) : (
                        <span className="text-warn">
                          {r.uiAmount ?? r.amount}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {r.isEmpty ? (
                        <button
                          type="button"
                          className="btn-ghost py-0.5 text-[11px]"
                          disabled={running}
                          onClick={() => setConfirmOne(r.address)}
                        >
                          close
                        </button>
                      ) : (
                        <span className="text-[10px] text-fg-dim">burn first</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {scanRaw && rows.length === 0 ? (
          <pre className="mono max-h-32 overflow-auto bg-surface-0 p-2 text-[10px] text-fg-dim">
            {scanRaw.slice(0, 2000)}
          </pre>
        ) : null}
      </section>

      <CatalogPage page="reclaim" hideHeader />

      <ConfirmDialog
        open={confirmBulk}
        title="Close all empty ATAs"
        mainnet={mainnet}
        cluster={overrides.url || "(from config)"}
        commandPreview={`spl-token gc --close-empty-associated-accounts  # ~${emptyCount} empty · ~${estSol} SOL`}
        onCancel={() => setConfirmBulk(false)}
        onConfirm={() => void closeAllEmpty()}
        busy={running}
      />
      <ConfirmDialog
        open={confirmOne !== null}
        title="Close token account"
        mainnet={mainnet}
        cluster={overrides.url || "(from config)"}
        commandPreview={
          confirmOne
            ? `spl-token close --address ${confirmOne}`
            : ""
        }
        onCancel={() => setConfirmOne(null)}
        onConfirm={() => confirmOne && void closeOne(confirmOne)}
        busy={running}
      />
    </div>
  );
}
