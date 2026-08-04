import { useState } from "react";
import {
  convertBase58ToJson,
  convertJsonToBase58,
  overridesToRequest,
  runSolanaCli,
  type KeyConvertResult,
} from "../../lib/tauri";
import { SolscanLink } from "../SolscanLink";
import { useApp } from "../../lib/context";
import { resolveCluster } from "../../lib/solscan";
import { formatBalance, parseBalanceLamports } from "../../lib/run";

type Mode = "b58-to-json" | "json-to-b58";

type BalanceCheck =
  | { status: "checking" }
  | { status: "ok"; lamports: number; display: string }
  | { status: "empty"; lamports: number; display: string }
  | { status: "error"; message: string };

export function KeyConvertPage() {
  const { overrides } = useApp();
  const cluster = resolveCluster(overrides.url);
  const [mode, setMode] = useState<Mode>("b58-to-json");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<KeyConvertResult | null>(null);
  const [balance, setBalance] = useState<BalanceCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function checkBalance(pubkey: string): Promise<BalanceCheck> {
    try {
      const res = await runSolanaCli(
        overridesToRequest(overrides, {
          binary: "solana",
          args: ["balance", pubkey, "--output", "json"],
          json: true,
          timeoutMs: 30_000,
        })
      );
      if (res.exitCode !== 0) {
        const err = (res.stderr || res.stdout || "balance check failed").trim();
        // Account may not exist on-chain
        if (/could not find|account not found|AccountNotFound/i.test(err)) {
          return { status: "empty", lamports: 0, display: "0 SOL" };
        }
        return { status: "error", message: err.split("\n")[0] };
      }
      const lamports = parseBalanceLamports(res.stdout);
      if (lamports == null) {
        return {
          status: "error",
          message: `could not parse balance: ${res.stdout.trim().slice(0, 80) || "(empty)"}`,
        };
      }
      const display = formatBalance(res.stdout);
      if (lamports >= 1) {
        return { status: "ok", lamports, display };
      }
      return { status: "empty", lamports, display };
    } catch (e) {
      return {
        status: "error",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async function convert() {
    setError(null);
    setResult(null);
    setBalance(null);
    setBusy(true);
    try {
      const out =
        mode === "b58-to-json"
          ? await convertBase58ToJson(input)
          : await convertJsonToBase58(input);
      setResult(out);
      setBalance({ status: "checking" });
      const check = await checkBalance(out.publicKey);
      setBalance(check);
      if (check.status === "empty") {
        setError(
          "Key decodes, but on-chain balance is 0 — need at least 1 lamport to treat as funded."
        );
      } else if (check.status === "error") {
        setError(`Balance check failed: ${check.message}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1200);
  }

  function reset() {
    setInput("");
    setResult(null);
    setBalance(null);
    setError(null);
  }

  return (
    <section className="space-y-3">
      <header className="flex items-baseline gap-2">
        <h2 className="text-[13px] font-medium text-fg">Key convert</h2>
        <span className="text-[11px] text-fg-dim">base58 ↔ JSON · clear after use</span>
      </header>

      <div className="panel space-y-3 p-3">
        <div className="flex flex-wrap gap-3 text-[12px] text-fg-muted">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="keymode"
              checked={mode === "b58-to-json"}
              onChange={() => {
                setMode("b58-to-json");
                setResult(null);
                setBalance(null);
                setError(null);
              }}
            />
            base58 → JSON array
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="keymode"
              checked={mode === "json-to-b58"}
              onChange={() => {
                setMode("json-to-b58");
                setResult(null);
                setBalance(null);
                setError(null);
              }}
            />
            JSON array → base58
          </label>
        </div>

        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] text-fg-dim">
            {mode === "b58-to-json" ? "base58 private key" : "JSON array [n, n, …]"}
          </span>
          <textarea
            className="field mono min-h-24"
            spellCheck={false}
            autoComplete="off"
            placeholder={
              mode === "b58-to-json"
                ? "e.g. 5K… or 4N… (base58)"
                : "[1,2,3,…,64 numbers]  or  1,2,3,…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !input.trim()}
            onClick={() => void convert()}
          >
            {busy ? "…" : "convert"}
          </button>
          <button type="button" className="btn-ghost" onClick={reset}>
            clear
          </button>
        </div>

        {error ? (
          <div className="mono text-[11px] text-danger whitespace-pre-wrap">{error}</div>
        ) : null}

        {result ? (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-[11px] text-fg-dim">{result.note}</p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
              <span className="text-[10px] text-fg-dim">on-chain</span>
              {balance?.status === "checking" ? (
                <span className="mono text-fg-dim">checking balance…</span>
              ) : null}
              {balance?.status === "ok" ? (
                <span className="mono text-ok" title={`${balance.lamports} lamports`}>
                  funded · {balance.display} (≥1 lamport)
                </span>
              ) : null}
              {balance?.status === "empty" ? (
                <span className="mono text-danger" title={`${balance.lamports} lamports`}>
                  empty · {balance.display} — not funded
                </span>
              ) : null}
              {balance?.status === "error" ? (
                <span className="mono text-warn">check failed · {balance.message}</span>
              ) : null}
            </div>

            <div className="grid gap-2 text-[12px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] text-fg-dim">public key</div>
                  <div className="mono break-all text-fg">
                    <SolscanLink id={result.publicKey} cluster={cluster} kind="account" />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-ghost shrink-0 py-0.5 text-[11px]"
                  onClick={() => void copy("pk", result.publicKey)}
                >
                  {copied === "pk" ? "copied" : "copy"}
                </button>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-fg-dim">base58 (64-byte secret)</div>
                  <pre className="mono max-h-20 overflow-auto break-all whitespace-pre-wrap text-[11px] text-fg">
                    {result.base58}
                  </pre>
                </div>
                <button
                  type="button"
                  className="btn-ghost shrink-0 py-0.5 text-[11px]"
                  onClick={() => void copy("b58", result.base58)}
                >
                  {copied === "b58" ? "copied" : "copy"}
                </button>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-fg-dim">
                    JSON array (Solana CLI id.json)
                  </div>
                  <pre className="mono max-h-28 overflow-auto break-all whitespace-pre-wrap text-[11px] text-fg">
                    {result.jsonArray}
                  </pre>
                </div>
                <button
                  type="button"
                  className="btn-ghost shrink-0 py-0.5 text-[11px]"
                  onClick={() => void copy("json", result.jsonArray)}
                >
                  {copied === "json" ? "copied" : "copy"}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-fg-dim">
              Save JSON as <span className="mono">id.json</span> → top-bar{" "}
              <span className="mono">-k</span>. {result.byteLength} bytes. Uses toolbar RPC (
              <span className="mono">-u</span>).
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
