import type { CommandResult, GlobalOverrides as Overrides } from "../../lib/types";
import type { SolscanCluster } from "../../lib/solscan";
import { GlobalOverridesBar } from "./GlobalOverrides";
import { OutputToolbar } from "./OutputPanel";

/** Full-width chrome strip with a single continuous bottom border. */
export function TopBar({
  overrides,
  onOverridesChange,
  result,
  cluster,
}: {
  overrides: Overrides;
  onOverridesChange: (patch: Partial<Overrides>) => void;
  result: CommandResult | null;
  cluster: SolscanCluster;
}) {
  return (
    <header className="flex h-10 shrink-0 items-stretch border-b border-border bg-surface-1">
      <div className="flex w-[152px] shrink-0 items-center border-r border-border px-3">
        <span className="mono text-[12px] font-medium tracking-tight text-fg">
          solana cli
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center overflow-x-auto px-3">
        <GlobalOverridesBar value={overrides} onChange={onOverridesChange} />
      </div>
      <div className="flex w-[340px] shrink-0 items-center border-l border-border px-3">
        <OutputToolbar result={result} cluster={cluster} />
      </div>
    </header>
  );
}
