import type { GlobalOverrides as Overrides } from "../../lib/types";

export function GlobalOverridesBar({
  value,
  onChange,
}: {
  value: Overrides;
  onChange: (patch: Partial<Overrides>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-surface-1 px-3 py-1.5">
      <Field
        label="-u"
        title="RPC URL override (devnet, mainnet-beta, or full https://… URL). Empty = use config.yml"
      >
        <input
          className="field mono w-[168px]"
          placeholder="url"
          value={value.url}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </Field>
      <Field
        label="-k"
        title="Keypair file path override for signing. Empty = use config.yml keypair"
      >
        <input
          className="field mono w-[168px]"
          placeholder="keypair"
          value={value.keypair}
          onChange={(e) => onChange({ keypair: e.target.value })}
        />
      </Field>
      <Field
        label="commitment"
        title="Commitment level: processed (fast) → confirmed (default) → finalized (safest)"
      >
        <select
          className="field w-[120px]"
          value={value.commitment || "confirmed"}
          onChange={(e) => onChange({ commitment: e.target.value })}
        >
          <option value="processed">processed</option>
          <option value="confirmed">confirmed</option>
          <option value="finalized">finalized</option>
        </select>
      </Field>
      <Field
        label="-C"
        title="Path to a Solana CLI config.yml. Empty = ~/.config/solana/cli/config.yml"
      >
        <input
          className="field mono w-[140px]"
          placeholder="config"
          value={value.configPath}
          onChange={(e) => onChange({ configPath: e.target.value })}
        />
      </Field>
      <div className="ml-auto flex items-center gap-3 text-[11px] text-fg-dim">
        <Toggle
          label="json"
          checked={value.json}
          onChange={(v) => onChange({ json: v })}
          title="Add --output json on the next command so the CLI returns structured JSON when supported. Does not re-fetch the overview."
        />
        <Toggle
          label="verbose"
          checked={value.verbose}
          onChange={(v) => onChange({ verbose: v })}
          title="Add -v for extra diagnostic logs on the next command. Does not re-fetch the overview."
        />
        <Toggle
          label="skip-preflight"
          checked={value.skipPreflight}
          onChange={(v) => onChange({ skipPreflight: v })}
          title="Add --skip-preflight on the next send: skip simulation before broadcast. Faster but riskier. Does not re-fetch the overview."
        />
      </div>
    </div>
  );
}

function Field({
  label,
  title,
  children,
}: {
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5" title={title}>
      <span className="mono shrink-0 text-[10px] text-fg-dim">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  title,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-1 select-none"
      title={title}
    >
      <input
        type="checkbox"
        className="m-0 cursor-pointer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="mono">{label}</span>
    </label>
  );
}
