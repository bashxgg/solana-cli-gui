import { useEffect, useState } from "react";
import { listAllowedBinaries, overridesToRequest, runSolanaCli } from "../../lib/tauri";
import { useApp } from "../../lib/context";
import { isMainnetUrl } from "../../lib/run";
import { ConfirmDialog } from "../forms/ConfirmDialog";

const DANGEROUS = [
  "transfer",
  "airdrop",
  "deploy",
  "withdraw",
  "delegate",
  "deactivate",
  "create-",
  "mint",
  "close",
  "authorize",
  "upgrade",
];

function looksDangerous(args: string[]): boolean {
  const joined = args.join(" ").toLowerCase();
  return DANGEROUS.some((d) => joined.includes(d));
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return tokens;
}

export function ConsolePage() {
  const { overrides, setRunning, pushHistory, running, history } = useApp();
  const [binaries, setBinaries] = useState<string[]>(["solana", "solana-keygen", "spl-token"]);
  const [binary, setBinary] = useState("solana");
  const [line, setLine] = useState("config get");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingArgs, setPendingArgs] = useState<string[]>([]);

  useEffect(() => {
    void listAllowedBinaries()
      .then(setBinaries)
      .catch(() => undefined);
  }, []);

  async function execute(args: string[]) {
    setError(null);
    setRunning(true);
    try {
      const result = await runSolanaCli(
        overridesToRequest(overrides, {
          binary,
          args,
          timeoutMs: 120_000,
        })
      );
      pushHistory(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      setConfirmOpen(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const args = tokenize(line.trim());
    if (args.length === 0) {
      setError("need args (no binary name)");
      return;
    }
    if (looksDangerous(args)) {
      setPendingArgs(args);
      setConfirmOpen(true);
      return;
    }
    void execute(args);
  }

  const preview = `${binary} ${line}`.trim();
  const mainnet = isMainnetUrl(overrides.url);

  return (
    <div className="space-y-4">
      <header className="flex items-baseline gap-2">
        <h1 className="text-[13px] font-medium text-fg">Console</h1>
        <span className="text-[11px] text-fg-dim">raw CLI · args only</span>
      </header>

      <form onSubmit={onSubmit} className="panel p-2.5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <select
            className="field mono w-auto"
            value={binary}
            onChange={(e) => setBinary(e.target.value)}
          >
            {binaries.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <input
            className="field mono min-w-[240px] flex-1"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="config get"
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" className="btn-primary" disabled={running}>
            {running ? "…" : "run"}
          </button>
        </div>
        <pre className="mono text-[10px] text-fg-dim">{preview}</pre>
        {error ? <div className="mt-2 mono text-[11px] text-danger">{error}</div> : null}
      </form>

      <section className="panel">
        <div className="panel-head">history</div>
        <ul className="max-h-64 divide-y divide-border overflow-auto">
          {history.length === 0 ? (
            <li className="px-2.5 py-3 mono text-[11px] text-fg-dim">// empty</li>
          ) : (
            history.map((h, i) => (
              <li key={`${h.durationMs}-${i}`}>
                <button
                  type="button"
                  className="w-full px-2.5 py-1.5 text-left hover:bg-surface-2"
                  onClick={() => {
                    const parts = h.commandPreview.split(/\s+/);
                    const idx = parts.findIndex((p) =>
                      binaries.some((b) => p.endsWith(b) || p.includes(`/${b}`))
                    );
                    if (idx >= 0) setLine(parts.slice(idx + 1).join(" "));
                  }}
                >
                  <div className="flex items-center gap-2 mono text-[11px]">
                    <span className={h.exitCode === 0 ? "text-ok" : "text-danger"}>
                      {h.exitCode}
                    </span>
                    <span className="text-fg-dim">{h.durationMs}ms</span>
                  </div>
                  <div className="mono truncate text-[11px] text-fg-muted">
                    {h.commandPreview}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="confirm console command"
        mainnet={mainnet}
        cluster={overrides.url || "(from config)"}
        commandPreview={`${binary} ${pendingArgs.join(" ")}`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void execute(pendingArgs)}
        busy={running}
      />
    </div>
  );
}
