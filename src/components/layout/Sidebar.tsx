import type { PageId } from "../../lib/types";

const NAV: { id: PageId; label: string; group?: string }[] = [
  { id: "dashboard", label: "Overview" },
  { id: "config", label: "Config", group: "setup" },
  { id: "wallet", label: "Wallet", group: "setup" },
  { id: "accounts", label: "Accounts", group: "ops" },
  { id: "transfer", label: "Transfer", group: "ops" },
  { id: "nonce", label: "Nonce", group: "ops" },
  { id: "stake", label: "Stake", group: "ops" },
  { id: "vote", label: "Validators", group: "ops" },
  { id: "program", label: "Program", group: "ops" },
  { id: "tokens", label: "Tokens", group: "ops" },
  { id: "wrap", label: "Wrap / unwrap", group: "ops" },
  { id: "reclaim", label: "Reclaim rent", group: "ops" },
  { id: "alt", label: "Lookup tables", group: "ops" },
  { id: "cluster", label: "Cluster", group: "ops" },
  { id: "soltop", label: "Soltop", group: "others" },
  { id: "console", label: "Console", group: "others" },
];

export function Sidebar({
  page,
  onNavigate,
}: {
  page: PageId;
  onNavigate: (p: PageId) => void;
}) {
  let lastGroup: string | undefined;

  return (
    <aside className="flex w-[152px] shrink-0 flex-col border-r border-border bg-surface-0">
      <nav className="flex-1 overflow-y-auto py-1">
        <ul className="flex flex-col">
          {NAV.map((item) => {
            const showGroup = item.group && item.group !== lastGroup;
            if (item.group) lastGroup = item.group;
            const active = page === item.id;
            return (
              <li key={item.id}>
                {showGroup ? (
                  <div className="section-label px-3 pb-0.5 pt-3">{item.group}</div>
                ) : null}
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={[
                    "relative flex w-full items-center px-3 py-[5px] text-left text-[12px]",
                    active
                      ? "bg-surface-2 text-fg before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-accent"
                      : "text-fg-muted hover:bg-surface-1 hover:text-fg",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
