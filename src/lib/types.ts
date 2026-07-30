export type CliBinary = "solana" | "solana-keygen" | "spl-token";

export interface RunCliRequest {
  binary: CliBinary | string;
  args: string[];
  configPath?: string | null;
  url?: string | null;
  keypair?: string | null;
  commitment?: string | null;
  ws?: string | null;
  json?: boolean;
  timeoutMs?: number | null;
  verbose?: boolean;
  skipPreflight?: boolean;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  commandPreview: string;
  binaryPath: string;
}

export interface BinaryInfo {
  name: string;
  path: string | null;
  version: string | null;
  found: boolean;
}

export interface AppStatus {
  binaries: BinaryInfo[];
  config: CommandResult | null;
  address: CommandResult | null;
  balance: CommandResult | null;
  epochInfo: CommandResult | null;
}

export interface GlobalOverrides {
  configPath: string;
  url: string;
  keypair: string;
  commitment: string;
  ws: string;
  verbose: boolean;
  skipPreflight: boolean;
  json: boolean;
}

export type PageId =
  | "dashboard"
  | "config"
  | "wallet"
  | "accounts"
  | "transfer"
  | "stake"
  | "vote"
  | "program"
  | "tokens"
  | "cluster"
  | "soltop"
  | "console";

export interface SoltopLaunchRequest {
  rpcUrl?: string | null;
  hideSystem?: boolean;
  verbose?: boolean;
}

export interface SoltopLaunchResult {
  commandPreview: string;
  binaryPath: string;
  rpcUrl: string;
}

export interface StreamLineEvent {
  stream: "stdout" | "stderr" | string;
  line: string;
}

export interface StreamEndEvent {
  exitCode: number;
  durationMs: number;
  commandPreview: string;
  cancelled: boolean;
  binaryPath: string;
}

export interface CatalogCommand {
  id: string;
  binary: CliBinary;
  label: string;
  description: string;
  /** Subcommand path e.g. ["config", "get"] or ["transfer"] */
  subcommand: string[];
  /** Extra fixed args */
  fixedArgs?: string[];
  fields: CatalogField[];
  dangerous?: boolean;
  requiresConfirm?: boolean;
  preferJson?: boolean;
  page: PageId;
}

export type FieldType =
  | "text"
  | "pubkey"
  | "amount"
  | "path"
  | "select"
  | "number"
  | "flag"
  | "textarea";

export interface CatalogField {
  name: string;
  label: string;
  type: FieldType;
  /** If true, value is positional arg; else flag like --name value or --flag */
  positional?: boolean;
  /** Position among positionals (0-based) */
  position?: number;
  flag?: string;
  /** For flag type: bare boolean flag */
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string | boolean;
  help?: string;
}
