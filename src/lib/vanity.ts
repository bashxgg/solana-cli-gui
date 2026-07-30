/** Base58 alphabet used by Solana pubkeys (Bitcoin-style, no 0/O/I/l). */
export const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export type VanityMode = "starts-with" | "ends-with" | "starts-and-ends-with";

export interface VanityFormState {
  mode: VanityMode;
  prefix: string;
  suffix: string;
  count: number;
  ignoreCase: boolean;
  numThreads: number;
  useMnemonic: boolean;
  noOutfile: boolean;
  noBip39Passphrase: boolean;
  wordCount: "12" | "15" | "18" | "21" | "24";
  language: string;
  timeoutMinutes: number;
}

export const DEFAULT_VANITY: VanityFormState = {
  mode: "starts-with",
  prefix: "SoL",
  suffix: "",
  count: 1,
  ignoreCase: true,
  numThreads:
    typeof navigator !== "undefined"
      ? Math.max(2, Math.min(16, navigator.hardwareConcurrency || 8))
      : 8,
  useMnemonic: false,
  noOutfile: false,
  noBip39Passphrase: true,
  wordCount: "12",
  language: "english",
  timeoutMinutes: 60,
};

export function isBase58(s: string): boolean {
  if (!s) return false;
  for (const ch of s) {
    if (!BASE58_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/** Case-insensitive base58 check: each char must be base58 ignoring case where possible. */
export function isBase58Loose(s: string, ignoreCase: boolean): boolean {
  if (!s) return false;
  if (!ignoreCase) return isBase58(s);
  for (const ch of s) {
    const upper = ch.toUpperCase();
    const lower = ch.toLowerCase();
    if (!BASE58_ALPHABET.includes(ch) && !BASE58_ALPHABET.includes(upper) && !BASE58_ALPHABET.includes(lower)) {
      // Some base58 letters only exist in one case (e.g. no '0')
      if (!BASE58_ALPHABET.toLowerCase().includes(ch.toLowerCase())) {
        return false;
      }
    }
  }
  // Reject ambiguous non-base58 letters even case-insensitively
  const forbidden = /[0OIl]/;
  if (forbidden.test(s)) return false;
  return true;
}

/**
 * Rough expected keypairs to try for a given pattern.
 * Solana addresses are base58 over 32-byte keys; each character is ~log58 space.
 * ignoreCase multiplies match probability for alphabetic chars (approx ×2 per letter).
 */
export function estimateAttempts(
  mode: VanityMode,
  prefix: string,
  suffix: string,
  ignoreCase: boolean
): { attempts: number; patternLen: number; difficulty: "easy" | "medium" | "hard" | "extreme" } {
  const p = mode === "ends-with" ? "" : prefix;
  const s = mode === "starts-with" ? "" : suffix;
  const pattern = p + s;
  const patternLen = pattern.length;

  let space = 1;
  for (const ch of pattern) {
    const isLetter = /[a-zA-Z]/.test(ch);
    const factor = ignoreCase && isLetter ? 58 / 2 : 58;
    space *= factor;
  }

  const attempts = Math.max(1, Math.round(space));
  let difficulty: "easy" | "medium" | "hard" | "extreme" = "easy";
  if (patternLen >= 6 || attempts > 1e9) difficulty = "extreme";
  else if (patternLen >= 5 || attempts > 1e7) difficulty = "hard";
  else if (patternLen >= 4 || attempts > 1e5) difficulty = "medium";

  return { attempts, patternLen, difficulty };
}

export function formatAttempts(n: number): string {
  if (n >= 1e12) return `~${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `~${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `~${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `~${(n / 1e3).toFixed(1)}K`;
  return `~${n}`;
}

export function buildGrindArgs(form: VanityFormState): string[] {
  const args: string[] = ["grind"];
  const count = Math.max(1, Math.floor(form.count) || 1);

  if (form.mode === "starts-with") {
    args.push("--starts-with", `${form.prefix}:${count}`);
  } else if (form.mode === "ends-with") {
    args.push("--ends-with", `${form.suffix}:${count}`);
  } else {
    args.push("--starts-and-ends-with", `${form.prefix}:${form.suffix}:${count}`);
  }

  if (form.ignoreCase) args.push("--ignore-case");
  if (form.numThreads > 0) {
    args.push("--num-threads", String(form.numThreads));
  }
  if (form.useMnemonic) {
    args.push("--use-mnemonic");
    args.push("--word-count", form.wordCount);
    args.push("--language", form.language);
    if (form.noBip39Passphrase) args.push("--no-bip39-passphrase");
  }
  if (form.noOutfile) args.push("--no-outfile");

  return args;
}

export function validateVanity(form: VanityFormState): string | null {
  if (form.mode === "starts-with" || form.mode === "starts-and-ends-with") {
    if (!form.prefix.trim()) return "Prefix is required";
    if (!isBase58Loose(form.prefix, form.ignoreCase)) {
      return "Prefix must be Base58 (no 0, O, I, or l)";
    }
  }
  if (form.mode === "ends-with" || form.mode === "starts-and-ends-with") {
    if (!form.suffix.trim()) return "Suffix is required";
    if (!isBase58Loose(form.suffix, form.ignoreCase)) {
      return "Suffix must be Base58 (no 0, O, I, or l)";
    }
  }
  if (form.count < 1 || form.count > 100) {
    return "Count must be between 1 and 100";
  }
  if (form.numThreads < 1 || form.numThreads > 256) {
    return "Threads must be between 1 and 256";
  }
  return null;
}

/** Parse grind output for found keypair paths / pubkeys. */
export function parseGrindHits(log: string): { pubkey?: string; path?: string; line: string }[] {
  const hits: { pubkey?: string; path?: string; line: string }[] = [];
  for (const line of log.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Common patterns from solana-keygen grind:
    // "Wrote keypair to <path>"
    // "<pubkey>.json"
    // lines containing both a base58-looking token and .json
    const wrote = trimmed.match(/Wrote keypair to\s+(.+)/i);
    if (wrote) {
      hits.push({ path: wrote[1].trim(), line: trimmed });
      continue;
    }
    const jsonFile = trimmed.match(/([1-9A-HJ-NP-Za-km-z]{32,44})\.json/);
    if (jsonFile) {
      hits.push({ pubkey: jsonFile[1], path: `${jsonFile[1]}.json`, line: trimmed });
    }
  }
  return hits;
}
