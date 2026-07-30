import { useMemo, useState } from "react";
import type { CatalogCommand } from "../../lib/types";
import { buildArgsFromFields } from "../../lib/commands/catalog";
import { useApp } from "../../lib/context";
import { executeCommand, isMainnetUrl } from "../../lib/run";
import { ConfirmDialog } from "./ConfirmDialog";

export function CommandForm({ cmd }: { cmd: CatalogCommand }) {
  const { overrides, setRunning, pushHistory, running } = useApp();
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const init: Record<string, string | boolean> = {};
    for (const f of cmd.fields) {
      if (f.defaultValue !== undefined) init[f.name] = f.defaultValue;
      else if (f.type === "flag") init[f.name] = false;
      else init[f.name] = "";
    }
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const previewArgs = useMemo(() => buildArgsFromFields(cmd, values), [cmd, values]);
  const preview = `${cmd.binary} ${previewArgs.join(" ")}`;

  function validate(): string | null {
    for (const f of cmd.fields) {
      if (!f.required) continue;
      const v = values[f.name];
      if (v === undefined || v === "" || v === false) {
        return `${f.label} is required`;
      }
    }
    return null;
  }

  async function run() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setRunning(true);
    try {
      const result = await executeCommand(cmd, values, overrides);
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
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    if (cmd.requiresConfirm || cmd.dangerous) {
      setConfirmOpen(true);
      return;
    }
    void run();
  }

  const cluster = overrides.url || "(from config)";
  const mainnet = isMainnetUrl(overrides.url);
  const noArgs = cmd.fields.length === 0;

  return (
    <form onSubmit={onSubmit} className="bg-surface-1">
      <div className="flex items-start gap-2 px-2.5 py-2">
        {noArgs ? null : (
          <button
            type="button"
            className="mono mt-0.5 w-3 shrink-0 text-[10px] text-fg-dim hover:text-fg"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            title={open ? "Collapse" : "Expand fields"}
          >
            {open ? "▾" : "▸"}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[12px] font-medium text-fg">{cmd.label}</span>
            {cmd.dangerous ? (
              <span className="mono text-[10px] text-danger">write</span>
            ) : (
              <span className="mono text-[10px] text-fg-dim">read</span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">{cmd.description}</p>
          <div className="mt-1 mono truncate text-[10px] text-fg-dim" title={preview}>
            {preview}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {noArgs ? (
            <button type="submit" className="btn-primary" disabled={running}>
              {running ? "…" : "run"}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setOpen((o) => !o)}
              >
                {open ? "hide" : "fields"}
              </button>
              {open ? (
                <button type="submit" className="btn-primary" disabled={running}>
                  {running ? "…" : "run"}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      {!noArgs && open ? (
        <div className="border-t border-border px-2.5 py-2">
          <div className="mb-2 grid gap-2.5 sm:grid-cols-2">
            {cmd.fields.map((f) => (
              <label key={f.name} className="flex flex-col gap-0.5">
                <span className="text-[11px] text-fg-dim">
                  {f.label}
                  {f.required ? <span className="text-danger"> *</span> : null}
                </span>
                {f.type === "flag" ? (
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={Boolean(values[f.name])}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [f.name]: e.target.checked }))
                    }
                  />
                ) : f.type === "select" && f.options ? (
                  <select
                    className="field"
                    value={String(values[f.name] ?? "")}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [f.name]: e.target.value }))
                    }
                  >
                    <option value="">—</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    className="field mono min-h-14"
                    placeholder={f.placeholder}
                    value={String(values[f.name] ?? "")}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [f.name]: e.target.value }))
                    }
                  />
                ) : (
                  <input
                    className="field mono"
                    type="text"
                    inputMode={
                      f.type === "number" || f.type === "amount" ? "decimal" : "text"
                    }
                    placeholder={f.placeholder}
                    value={String(values[f.name] ?? "")}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [f.name]: e.target.value }))
                    }
                  />
                )}
                {f.help ? (
                  <span className="text-[10px] leading-snug text-fg-dim">{f.help}</span>
                ) : null}
              </label>
            ))}
          </div>

          {error ? (
            <div className="mb-2 mono text-[11px] text-danger">{error}</div>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title={cmd.label}
        mainnet={mainnet}
        cluster={cluster}
        commandPreview={preview}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void run()}
        busy={running}
      />
    </form>
  );
}
