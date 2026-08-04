import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../lib/context";
import { overridesToRequest, startCliStream, stopCliStream } from "../../lib/tauri";
import type { StreamEndEvent, StreamLineEvent } from "../../lib/types";
import {
  buildGrindArgs,
  DEFAULT_VANITY,
  estimateAttempts,
  formatAttempts,
  parseGrindHits,
  validateVanity,
  type VanityFormState,
  type VanityMode,
} from "../../lib/vanity";
import { resolveCluster } from "../../lib/solscan";
import { LinkifiedText, SolscanLink } from "../SolscanLink";

export function VanityPage() {
  const { overrides, setRunning, pushHistory, running } = useApp();
  const cluster = resolveCluster(overrides.url);
  const [form, setForm] = useState<VanityFormState>(DEFAULT_VANITY);
  const [log, setLog] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [grinding, setGrinding] = useState(false);
  const [lastEnd, setLastEnd] = useState<StreamEndEvent | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logRef = useRef("");

  const estimate = useMemo(
    () => estimateAttempts(form.mode, form.prefix, form.suffix, form.ignoreCase),
    [form.mode, form.prefix, form.suffix, form.ignoreCase]
  );

  const previewArgs = useMemo(() => buildGrindArgs(form), [form]);
  const preview = `solana-keygen ${previewArgs.join(" ")}`;
  const hits = useMemo(() => parseGrindHits(log), [log]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  useEffect(() => {
    let unLine: UnlistenFn | undefined;
    let unEnd: UnlistenFn | undefined;
    let cancelled = false;

    void (async () => {
      unLine = await listen<StreamLineEvent>("cli-stream-line", (event) => {
        if (cancelled) return;
        const prefix = event.payload.stream === "stderr" ? "[err] " : "";
        const next = logRef.current
          ? `${logRef.current}\n${prefix}${event.payload.line}`
          : `${prefix}${event.payload.line}`;
        logRef.current = next;
        setLog(next);
      });
      unEnd = await listen<StreamEndEvent>("cli-stream-end", (event) => {
        if (cancelled) return;
        setLastEnd(event.payload);
        setGrinding(false);
        setRunning(false);
        pushHistory({
          exitCode: event.payload.exitCode,
          stdout: logRef.current,
          stderr: event.payload.cancelled ? "(cancelled)" : "",
          durationMs: event.payload.durationMs,
          commandPreview: event.payload.commandPreview,
          binaryPath: event.payload.binaryPath,
        });
      });
    })();

    return () => {
      cancelled = true;
      unLine?.();
      unEnd?.();
    };
  }, [pushHistory, setRunning]);

  function patch(p: Partial<VanityFormState>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  async function onStart() {
    const v = validateVanity(form);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setLastEnd(null);
    logRef.current = "";
    setLog("");
    setGrinding(true);
    setRunning(true);

    try {
      const args = buildGrindArgs(form);
      await startCliStream(
        overridesToRequest(overrides, {
          binary: "solana-keygen",
          args,
          json: false,
          timeoutMs: Math.max(60_000, form.timeoutMinutes * 60_000),
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setGrinding(false);
      setRunning(false);
    }
  }

  async function onStop() {
    try {
      await stopCliStream();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const difficultyColor =
    estimate.difficulty === "easy"
      ? "text-ok"
      : estimate.difficulty === "medium"
        ? "text-warn"
        : "text-danger";

  return (
    <div className="space-y-3">
      <header className="flex items-baseline gap-2">
        <h2 className="text-[13px] font-medium text-fg">Vanity</h2>
        <span className="text-[11px] text-fg-dim">
          solana-keygen grind · 3–4 chars practical
        </span>
      </header>

      <div className="grid gap-px border border-border bg-border lg:grid-cols-2">
        <form
          className="space-y-2.5 bg-surface-1 p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!grinding) void onStart();
          }}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-0.5 sm:col-span-2">
              <span className="text-[11px] text-fg-dim">mode</span>
              <select
                className="field"
                value={form.mode}
                disabled={grinding}
                onChange={(e) => patch({ mode: e.target.value as VanityMode })}
              >
                <option value="starts-with">starts-with</option>
                <option value="ends-with">ends-with</option>
                <option value="starts-and-ends-with">starts-and-ends-with</option>
              </select>
            </label>

            {(form.mode === "starts-with" || form.mode === "starts-and-ends-with") && (
              <label className="flex flex-col gap-0.5">
                <span className="text-[11px] text-fg-dim">prefix *</span>
                <input
                  className="field mono"
                  value={form.prefix}
                  disabled={grinding}
                  placeholder="SoL"
                  spellCheck={false}
                  onChange={(e) => patch({ prefix: e.target.value })}
                />
              </label>
            )}

            {(form.mode === "ends-with" || form.mode === "starts-and-ends-with") && (
              <label className="flex flex-col gap-0.5">
                <span className="text-[11px] text-fg-dim">suffix *</span>
                <input
                  className="field mono"
                  value={form.suffix}
                  disabled={grinding}
                  placeholder="ana"
                  spellCheck={false}
                  onChange={(e) => patch({ suffix: e.target.value })}
                />
              </label>
            )}

            <label className="flex flex-col gap-0.5">
              <span className="text-[11px] text-fg-dim">count</span>
              <input
                className="field mono"
                type="number"
                min={1}
                max={100}
                value={form.count}
                disabled={grinding}
                onChange={(e) => patch({ count: Number(e.target.value) })}
              />
            </label>

            <label className="flex flex-col gap-0.5">
              <span className="text-[11px] text-fg-dim">threads</span>
              <input
                className="field mono"
                type="number"
                min={1}
                max={256}
                value={form.numThreads}
                disabled={grinding}
                onChange={(e) => patch({ numThreads: Number(e.target.value) })}
              />
            </label>

            <label className="flex flex-col gap-0.5">
              <span className="text-[11px] text-fg-dim">timeout min</span>
              <input
                className="field mono"
                type="number"
                min={1}
                max={1440}
                value={form.timeoutMinutes}
                disabled={grinding}
                onChange={(e) => patch({ timeoutMinutes: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mono text-[11px] text-fg-dim">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={form.ignoreCase}
                disabled={grinding}
                onChange={(e) => patch({ ignoreCase: e.target.checked })}
              />
              ignore-case
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={form.useMnemonic}
                disabled={grinding}
                onChange={(e) => patch({ useMnemonic: e.target.checked })}
              />
              mnemonic
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={form.noOutfile}
                disabled={grinding}
                onChange={(e) => patch({ noOutfile: e.target.checked })}
              />
              no-outfile
            </label>
            {form.useMnemonic ? (
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={form.noBip39Passphrase}
                  disabled={grinding}
                  onChange={(e) => patch({ noBip39Passphrase: e.target.checked })}
                />
                no-bip39-passphrase
              </label>
            ) : null}
          </div>

          {form.useMnemonic ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-0.5">
                <span className="text-[11px] text-fg-dim">words</span>
                <select
                  className="field"
                  value={form.wordCount}
                  disabled={grinding}
                  onChange={(e) =>
                    patch({
                      wordCount: e.target.value as VanityFormState["wordCount"],
                    })
                  }
                >
                  {["12", "15", "18", "21", "24"].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[11px] text-fg-dim">language</span>
                <select
                  className="field"
                  value={form.language}
                  disabled={grinding}
                  onChange={(e) => patch({ language: e.target.value })}
                >
                  {[
                    "english",
                    "chinese-simplified",
                    "chinese-traditional",
                    "japanese",
                    "spanish",
                    "korean",
                    "french",
                    "italian",
                  ].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mono text-[11px]">
            <span className="text-fg-dim">cost</span>
            <span className={difficultyColor}>{estimate.difficulty}</span>
            <span className="text-fg-dim">~{formatAttempts(estimate.attempts)} tries</span>
          </div>

          <pre className="mono overflow-x-auto bg-surface-0 px-2 py-1 text-[10px] text-fg-dim">
            {preview}
          </pre>

          {error ? <div className="mono text-[11px] text-danger">{error}</div> : null}

          <div className="flex gap-2">
            {!grinding ? (
              <button type="submit" className="btn-primary" disabled={running}>
                grind
              </button>
            ) : (
              <button type="button" className="btn-danger" onClick={() => void onStop()}>
                stop
              </button>
            )}
          </div>
        </form>

        <div className="flex min-h-[280px] flex-col bg-surface-0">
          <div className="panel-head">
            <span>stdout</span>
            <span className={`mono text-[11px] ${grinding ? "text-warn" : "text-fg-dim"}`}>
              {grinding
                ? "running"
                : lastEnd
                  ? lastEnd.cancelled
                    ? `stop ${Math.round(lastEnd.durationMs / 1000)}s`
                    : `exit ${lastEnd.exitCode} ${Math.round(lastEnd.durationMs / 1000)}s`
                  : "idle"}
            </span>
          </div>
          <pre className="mono min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all p-2 text-[11px] leading-snug text-fg-muted">
            {log ? <LinkifiedText text={log} cluster={cluster} /> : "// waiting"}
            <div ref={logEndRef} />
          </pre>
        </div>
      </div>

      {hits.length > 0 ? (
        <section className="panel">
          <div className="panel-head">
            <span>found</span>
            <span className="mono text-ok">{hits.length}</span>
          </div>
          <ul className="divide-y divide-border">
            {hits.map((h, i) => (
              <li key={`${h.line}-${i}`} className="px-2.5 py-1.5">
                {h.pubkey ? (
                  <div className="mono text-[12px] text-fg">
                    <SolscanLink id={h.pubkey} cluster={cluster} kind="account" />
                  </div>
                ) : null}
                {h.path ? (
                  <div className="mono text-[11px] text-fg-muted">{h.path}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
