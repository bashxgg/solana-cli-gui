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

export function parseConfigText(stdout: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of stdout.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (key && val) out[key] = val;
  }
  return out;
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
