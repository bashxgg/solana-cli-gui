/** Solscan explorer helpers (cluster-aware account / tx links). */

export type SolscanCluster = "mainnet" | "devnet" | "testnet";

const BASE58_RE = /[1-9A-HJ-NP-Za-km-z]{32,90}/g;

export function detectCluster(urlOrMoniker: string): SolscanCluster {
  const u = urlOrMoniker.toLowerCase().trim();
  if (!u) return "mainnet";
  if (
    u === "d" ||
    u === "devnet" ||
    u.includes("devnet") ||
    u.includes("api.devnet")
  ) {
    return "devnet";
  }
  if (
    u === "t" ||
    u === "testnet" ||
    u.includes("testnet") ||
    u.includes("api.testnet")
  ) {
    return "testnet";
  }
  // localhost / custom RPC: Solscan has no local view — default mainnet for link shape
  // but prefer devnet-ish if moniker letter only was ambiguous
  if (u === "l" || u === "localhost" || u.includes("127.0.0.1") || u.includes("localhost")) {
    return "mainnet";
  }
  return "mainnet";
}

/** Pull RPC URL from `solana config get` stdout when override is empty. */
export function clusterFromConfig(configStdout: string | null | undefined): SolscanCluster {
  if (!configStdout) return "mainnet";
  const m = configStdout.match(/RPC URL:\s*(\S+)/i);
  return detectCluster(m?.[1] ?? "");
}

export function resolveCluster(
  urlOverride: string,
  configStdout?: string | null
): SolscanCluster {
  if (urlOverride.trim()) return detectCluster(urlOverride);
  return clusterFromConfig(configStdout);
}

function clusterQuery(cluster: SolscanCluster): string {
  if (cluster === "mainnet") return "";
  return `?cluster=${cluster}`;
}

export function solscanAccountUrl(address: string, cluster: SolscanCluster): string {
  return `https://solscan.io/account/${address}${clusterQuery(cluster)}`;
}

export function solscanTxUrl(signature: string, cluster: SolscanCluster): string {
  return `https://solscan.io/tx/${signature}${clusterQuery(cluster)}`;
}

export function solscanTokenUrl(mint: string, cluster: SolscanCluster): string {
  return `https://solscan.io/token/${mint}${clusterQuery(cluster)}`;
}

export type SolscanKind = "account" | "tx";

/**
 * Classify a base58 blob as account (pubkey) or transaction signature.
 * Tx signatures are ~87–88 chars; pubkeys ~32–44.
 */
export function classifyBase58(token: string): SolscanKind | null {
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(token)) return null;
  const n = token.length;
  if (n >= 80 && n <= 90) return "tx";
  if (n >= 32 && n <= 44) return "account";
  return null;
}

export function solscanUrl(token: string, cluster: SolscanCluster): string | null {
  const kind = classifyBase58(token);
  if (kind === "tx") return solscanTxUrl(token, cluster);
  if (kind === "account") return solscanAccountUrl(token, cluster);
  return null;
}

export type TextPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string; kind: SolscanKind };

/** Split text into plain segments and Solscan-linkable base58 tokens. */
export function linkifySolanaIds(text: string, cluster: SolscanCluster): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  const re = new RegExp(BASE58_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const token = m[0];
    const kind = classifyBase58(token);
    if (!kind) continue;
    // Avoid linking mid-path segments that look wrong (e.g. only digits-heavy noise)
    if (m.index > last) {
      parts.push({ type: "text", value: text.slice(last, m.index) });
    }
    const href =
      kind === "tx" ? solscanTxUrl(token, cluster) : solscanAccountUrl(token, cluster);
    parts.push({ type: "link", value: token, href, kind });
    last = m.index + token.length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  if (parts.length === 0) {
    parts.push({ type: "text", value: text });
  }
  return parts;
}
