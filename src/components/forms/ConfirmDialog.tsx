export function ConfirmDialog({
  open,
  title,
  mainnet,
  cluster,
  commandPreview,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  title: string;
  mainnet: boolean;
  cluster: string;
  commandPreview: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="w-full max-w-md border border-border bg-surface-1 shadow-none">
        <div className="panel-head" id="confirm-title">
          {title}
        </div>
        <div className="space-y-3 px-3 py-3 text-[12px]">
          {mainnet ? (
            <p className="border-l-2 border-danger bg-danger-soft px-2 py-1.5 text-danger">
              mainnet — real funds / state changes
            </p>
          ) : (
            <p className="border-l-2 border-warn bg-warn-soft px-2 py-1.5 text-warn">
              may write chain or change local config
            </p>
          )}
          <div>
            <div className="section-label mb-0.5">cluster</div>
            <div className="mono text-fg">{cluster || "(from config)"}</div>
          </div>
          <div>
            <div className="section-label mb-0.5">command</div>
            <pre className="mono overflow-x-auto bg-surface-0 p-2 text-[11px] text-fg-muted">
              {commandPreview}
            </pre>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-3 py-2">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
            cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? "…" : "confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
