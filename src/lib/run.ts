import { buildArgsFromFields } from "./commands/catalog";
import { overridesToRequest, runSolanaCli } from "./tauri";
import type { CatalogCommand, CommandResult, GlobalOverrides } from "./types";

export function isMainnetUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("mainnet") ||
    u.includes("api.mainnet-beta.solana.com") ||
    u === "m" ||
    u === "mainnet-beta"
  );
}

export async function executeCommand(
  cmd: CatalogCommand,
  values: Record<string, string | boolean>,
  overrides: GlobalOverrides
): Promise<CommandResult> {
  const args = buildArgsFromFields(cmd, values);
  const request = overridesToRequest(overrides, {
    binary: cmd.binary,
    args,
    json: cmd.preferJson ?? overrides.json,
    timeoutMs: cmd.id.includes("deploy") || cmd.id === "ping" ? 300_000 : 60_000,
  });
  return runSolanaCli(request);
}

export function shorten(addr: string, n = 4): string {
  if (!addr || addr.length < n * 2 + 3) return addr;
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

export function tryFormatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** Parse solana balance stdout (json or text) to lamports, or null if unreadable. */
export function parseBalanceLamports(stdout: string | undefined | null): number | null {
  const raw = (stdout ?? "").trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    if (typeof j.lamports === "number" && Number.isFinite(j.lamports)) {
      return Math.floor(j.lamports);
    }
    if (typeof j.value === "number" && Number.isFinite(j.value)) {
      return Math.round(j.value * 1e9);
    }
  } catch {
    /* plain text */
  }
  // "1.5 SOL" or "1500000000 lamports"
  const lamportsMatch = raw.match(/([\d_]+)\s*lamports?/i);
  if (lamportsMatch) {
    const n = Number(lamportsMatch[1].replace(/_/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  const solMatch = raw.match(/^([\d.]+)\s*SOL/i);
  if (solMatch) {
    const sol = Number(solMatch[1]);
    return Number.isFinite(sol) ? Math.round(sol * 1e9) : null;
  }
  const bare = Number(raw.split(/\s+/)[0]);
  if (Number.isFinite(bare) && bare >= 0) {
    // bare number from --lamports is integer lamports; from plain balance is SOL
    if (Number.isInteger(bare) && bare > 1e6) return bare;
    return Math.round(bare * 1e9);
  }
  return null;
}

/** Format solana balance CLI stdout (json or text) as "X SOL". */
export function formatBalance(stdout: string | undefined | null): string {
  const raw = (stdout ?? "").trim();
  if (!raw) return "—";
  const lamports = parseBalanceLamports(raw);
  if (lamports != null) {
    const sol = lamports / 1e9;
    const s = sol.toFixed(9).replace(/\.?0+$/, "");
    return `${s} SOL`;
  }
  return raw.split("\n")[0];
}

/** "solana-cli 3.1.15 (src:…)" → "3.1.15" */
export function shortCliVersion(version: string | null | undefined): string {
  if (!version) return "—";
  const m = version.match(/(\d+\.\d+\.\d+)/);
  if (m) return m[1];
  if (version.toLowerCase().includes("installed")) return "ok";
  if (version.length > 28) return `${version.slice(0, 24)}…`;
  return version;
}
