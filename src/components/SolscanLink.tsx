import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, type ReactNode } from "react";
import {
  classifyBase58,
  linkifySolanaIds,
  solscanAccountUrl,
  solscanTxUrl,
  type SolscanCluster,
  type SolscanKind,
} from "../lib/solscan";

async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    // Fallback when not in Tauri shell (vite-only preview)
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Single address or tx signature as a Solscan link. */
export function SolscanLink({
  id,
  cluster,
  kind: kindHint,
  children,
  className = "",
  title,
}: {
  id: string;
  cluster: SolscanCluster;
  kind?: SolscanKind;
  children?: ReactNode;
  className?: string;
  title?: string;
}) {
  const kind = kindHint ?? classifyBase58(id);
  if (!kind || !id) {
    return <span className={className}>{children ?? id}</span>;
  }
  const href = kind === "tx" ? solscanTxUrl(id, cluster) : solscanAccountUrl(id, cluster);
  const label = children ?? id;

  return (
    <a
      href={href}
      className={[
        "text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent",
        className,
      ].join(" ")}
      title={title ?? `Open on Solscan (${cluster})`}
      onClick={(e) => {
        e.preventDefault();
        void openExternal(href);
      }}
    >
      {label}
    </a>
  );
}

/** Render text with embedded base58 addresses / tx sigs linked to Solscan. */
export function LinkifiedText({
  text,
  cluster,
  className = "",
}: {
  text: string;
  cluster: SolscanCluster;
  className?: string;
}) {
  const parts = linkifySolanaIds(text, cluster);

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      void openExternal(href);
    },
    []
  );

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.type === "text" ? (
          <span key={i}>{p.value}</span>
        ) : (
          <a
            key={i}
            href={p.href}
            className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
            title={`Solscan ${p.kind} (${cluster})`}
            onClick={(e) => onClick(e, p.href)}
          >
            {p.value}
          </a>
        )
      )}
    </span>
  );
}
