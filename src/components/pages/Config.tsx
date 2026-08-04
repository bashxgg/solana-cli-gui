import { useEffect, useState } from "react";
import { useApp } from "../../lib/context";
import { validateCliConfigPath } from "../../lib/tauri";
import { CatalogPage } from "./CatalogPage";

const DEFAULT_HINT = "~/.config/solana/cli/config.yml";

/** Config page: choose which CLI config.yml to use (-C), then catalog set/get forms. */
export function ConfigPage() {
  const { overrides, setOverrides } = useApp();
  const [draft, setDraft] = useState(overrides.configPath);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(overrides.configPath);
    setError(null);
    setOkMsg(null);
  }, [overrides.configPath]);

  const active = overrides.configPath.trim();
  const draftTrim = draft.trim();
  const dirty = draftTrim !== active;

  async function apply() {
    setError(null);
    setOkMsg(null);
    setBusy(true);
    try {
      const check = await validateCliConfigPath(draftTrim);
      if (!check.valid) {
        setError(check.message);
        return;
      }
      setOverrides({ configPath: draftTrim });
      setOkMsg(check.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function useDefault() {
    setDraft("");
    setError(null);
    setOkMsg(null);
    setOverrides({ configPath: "" });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-baseline gap-2">
        <h1 className="text-[13px] font-medium text-fg">Config</h1>
        <span className="text-[11px] text-fg-dim">cli defaults · config.yml path</span>
      </header>

      <section className="panel space-y-2.5 p-3">
        <h2 className="text-[12px] font-medium text-fg">CLI config path</h2>
        <p className="text-[11px] text-fg-muted">
          Which Solana CLI <span className="mono">config.yml</span> all commands use. Empty =
          default ({DEFAULT_HINT}). Path must exist and look like a Solana config file.
        </p>
        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] text-fg-dim">path</span>
          <input
            className="field mono"
            spellCheck={false}
            autoComplete="off"
            placeholder={DEFAULT_HINT}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
              setOkMsg(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void apply();
              }
            }}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={!dirty || busy}
            onClick={() => void apply()}
          >
            {busy ? "…" : "apply"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy || (!active && !draftTrim)}
            onClick={useDefault}
          >
            use default
          </button>
          {active ? (
            <span className="mono max-w-full truncate text-[10px] text-ok" title={active}>
              active: {active}
            </span>
          ) : (
            <span className="mono text-[10px] text-fg-dim">active: default</span>
          )}
        </div>
        {error ? (
          <p className="mono text-[11px] text-danger whitespace-pre-wrap">{error}</p>
        ) : null}
        {okMsg && !error ? (
          <p className="mono text-[11px] text-ok whitespace-pre-wrap">{okMsg}</p>
        ) : null}
      </section>

      <CatalogPage page="config" hideHeader />
    </div>
  );
}
