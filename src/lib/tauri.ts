import { invoke } from "@tauri-apps/api/core";
import type {
  AppStatus,
  BinaryInfo,
  CommandResult,
  GlobalOverrides,
  RunCliRequest,
  SoltopLaunchRequest,
  SoltopLaunchResult,
} from "./types";

export function overridesToRequest(
  overrides: GlobalOverrides,
  partial: Partial<RunCliRequest> & Pick<RunCliRequest, "binary" | "args">
): RunCliRequest {
  return {
    binary: partial.binary,
    args: partial.args,
    configPath: overrides.configPath || null,
    url: overrides.url || null,
    keypair: overrides.keypair || null,
    commitment: overrides.commitment || null,
    ws: overrides.ws || null,
    json: partial.json ?? overrides.json,
    timeoutMs: partial.timeoutMs ?? 60_000,
    verbose: partial.verbose ?? overrides.verbose,
    skipPreflight: partial.skipPreflight ?? overrides.skipPreflight,
  };
}

export async function runSolanaCli(request: RunCliRequest): Promise<CommandResult> {
  return invoke<CommandResult>("run_solana_cli", { request });
}

export async function getAppStatus(request?: RunCliRequest): Promise<AppStatus> {
  return invoke<AppStatus>("get_app_status", { request: request ?? null });
}

export async function listAllowedBinaries(): Promise<string[]> {
  return invoke<string[]>("list_allowed_binaries");
}

export async function startCliStream(request: RunCliRequest): Promise<string> {
  return invoke<string>("start_cli_stream_cmd", { request });
}

export async function stopCliStream(): Promise<void> {
  return invoke("stop_cli_stream_cmd");
}

export async function isCliStreamRunning(): Promise<boolean> {
  return invoke<boolean>("is_cli_stream_running");
}

export async function getSoltopStatus(): Promise<BinaryInfo> {
  return invoke<BinaryInfo>("get_soltop_status");
}

export async function launchSoltop(
  request: SoltopLaunchRequest
): Promise<SoltopLaunchResult> {
  return invoke<SoltopLaunchResult>("launch_soltop_cmd", { request });
}

export async function launchInstall(tool: string): Promise<string> {
  return invoke<string>("launch_install_cmd", { tool });
}
