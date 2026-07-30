import { useState } from "react";
import type { CommandResult } from "../../lib/types";
import type { SolscanCluster } from "../../lib/solscan";
import { tryFormatJson } from "../../lib/run";
import { LinkifiedText } from "../SolscanLink";

export function OutputPanel({
  result,
  cluster,
}: {
  result: CommandResult | null;
  cluster: SolscanCluster;
}) {
  const [copied, setCopied] = useState<"out" | "cmd" | null>(null);

  if (!result) {
    return (
      <aside className="flex w-[340px] shrink-0 flex-col border-l border-border bg-surface-0">
        <div className="panel-head">output</div>
        <div className="flex flex-1 items-start p-3 mono text-[11px] text-fg-dim">
          // no command yet
        </div>
      </aside>
    );
  }

  const ok = result.exitCode === 0;
  const body = result.stdout.trim()
    ? tryFormatJson(result.stdout)
    : result.stderr.trim() || "(empty)";

  async function copy(kind: "out" | "cmd") {
    const text = kind === "out" ? body : result!.commandPreview;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1000);
  }

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-border bg-surface-0">
      <div className="panel-head">
        <div className="flex items-center gap-2">
          <span>output</span>
          <span className={["mono text-[11px]", ok ? "text-ok" : "text-danger"].join(" ")}>
            {result.exitCode}
          </span>
          <span className="mono text-[11px] text-fg-dim">{result.durationMs}ms</span>
          <span className="mono text-[10px] text-fg-dim" title="Solscan cluster for links">
            solscan:{cluster}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-[11px] text-fg-dim hover:text-fg"
            onClick={() => void copy("cmd")}
          >
            {copied === "cmd" ? "copied" : "cmd"}
          </button>
          <button
            type="button"
            className="text-[11px] text-fg-dim hover:text-fg"
            onClick={() => void copy("out")}
          >
            {copied === "out" ? "copied" : "copy"}
          </button>
        </div>
      </div>
      <div className="border-b border-border px-2 py-1.5">
        <pre className="mono max-h-14 overflow-auto whitespace-pre-wrap break-all text-[10px] leading-snug text-fg-dim">
          <LinkifiedText text={result.commandPreview} cluster={cluster} />
        </pre>
      </div>
      <pre className="mono flex-1 overflow-auto whitespace-pre-wrap break-words p-2 text-[11px] leading-snug text-fg">
        <LinkifiedText text={body} cluster={cluster} />
        {result.stderr.trim() && result.stdout.trim() ? (
          <>
            {"\n\n"}
            <span className="text-danger">
              stderr:{"\n"}
              <LinkifiedText text={result.stderr} cluster={cluster} />
            </span>
          </>
        ) : null}
      </pre>
    </aside>
  );
}
