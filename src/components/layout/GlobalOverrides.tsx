import type { GlobalOverrides as Overrides } from "../../lib/types";

export function GlobalOverridesBar({
  value,
  onChange,
}: {
  value: Overrides;
  onChange: (patch: Partial<Overrides>) => void;
}) {
  return (
    <div className="flex w-full items-center gap-x-3">
      <Field label="-u" title="RPC URL (empty = config.yml)">
        <input
          className="field-toolbar mono w-[148px]"
          placeholder="url"
          value={value.url}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </Field>
      <Field label="-k" title="Keypair path (empty = config.yml)">
        <input
          className="field-toolbar mono w-[148px]"
          placeholder="keypair"
          value={value.keypair}
          onChange={(e) => onChange({ keypair: e.target.value })}
        />
      </Field>
      <Field label="commitment" title="processed · confirmed · finalized">
        <select
          className="field-toolbar w-[110px]"
          value={value.commitment || "confirmed"}
          onChange={(e) => onChange({ commitment: e.target.value })}
        >
          <option value="processed">processed</option>
          <option value="confirmed">confirmed</option>
          <option value="finalized">finalized</option>
        </select>
      </Field>
      <div className="ml-auto flex shrink-0 items-center gap-3 text-[11px] text-fg-dim">
        <Toggle
          label="verbose"
          checked={value.verbose}
          onChange={(v) => onChange({ verbose: v })}
          title="-v on next command"
        />
        <Toggle
          label="skip-preflight"
          checked={value.skipPreflight}
          onChange={(v) => onChange({ skipPreflight: v })}
          title="--skip-preflight on next send"
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
    <label className="flex shrink-0 items-center gap-1.5" title={title}>
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
      className="flex cursor-pointer select-none items-center gap-1"
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
