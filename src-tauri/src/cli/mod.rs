use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

const ALLOWED_BINARIES: &[&str] = &["solana", "solana-keygen", "spl-token"];

/// Active long-running CLI process (vanity grind, logs, etc.)
pub struct StreamHandle {
    pub child: Mutex<Option<Child>>,
    pub cancel: Mutex<bool>,
}

impl StreamHandle {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            cancel: Mutex::new(false),
        }
    }
}

impl Default for StreamHandle {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunCliRequest {
    pub binary: String,
    pub args: Vec<String>,
    pub config_path: Option<String>,
    pub url: Option<String>,
    pub keypair: Option<String>,
    pub commitment: Option<String>,
    pub ws: Option<String>,
    #[serde(default)]
    pub json: bool,
    pub timeout_ms: Option<u64>,
    #[serde(default)]
    pub verbose: bool,
    #[serde(default)]
    pub skip_preflight: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u64,
    pub command_preview: String,
    pub binary_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BinaryInfo {
    pub name: String,
    pub path: Option<String>,
    pub version: Option<String>,
    pub found: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStatus {
    pub binaries: Vec<BinaryInfo>,
    pub config: Option<CommandResult>,
    pub address: Option<CommandResult>,
    pub balance: Option<CommandResult>,
    pub epoch_info: Option<CommandResult>,
}

fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME").map(PathBuf::from)
}

/// Resolve an allowlisted binary from PATH and known Solana install locations.
pub fn resolve_binary(name: &str) -> Result<PathBuf, String> {
    if !ALLOWED_BINARIES.contains(&name) {
        return Err(format!(
            "Binary '{name}' is not allowed. Allowed: {}",
            ALLOWED_BINARIES.join(", ")
        ));
    }
    find_binary(name).ok_or_else(|| {
        format!("Could not find '{name}'. Install Solana CLI and ensure it is on PATH.")
    })
}

/// Locate a binary on PATH + common install dirs (not allowlist-restricted).
pub fn find_binary(name: &str) -> Option<PathBuf> {
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join(name);
            if is_executable(&candidate) {
                return Some(candidate);
            }
        }
    }

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Some(home) = home_dir() {
        candidates.push(
            home.join(".local/share/solana/install/active_release/bin")
                .join(name),
        );
        candidates.push(home.join(".cargo/bin").join(name));
        candidates.push(home.join(".local/bin").join(name));
    }
    candidates.push(PathBuf::from("/usr/local/bin").join(name));
    candidates.push(PathBuf::from("/opt/homebrew/bin").join(name));

    for candidate in candidates {
        if is_executable(&candidate) {
            return Some(candidate);
        }
    }
    None
}

fn is_executable(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        path.metadata()
            .map(|m| m.permissions().mode() & 0o111 != 0)
            .unwrap_or(false)
    }
    #[cfg(not(unix))]
    {
        true
    }
}

fn build_args(req: &RunCliRequest) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();
    let is_solana = req.binary == "solana";
    let is_keygen = req.binary == "solana-keygen";
    let is_spl = req.binary == "spl-token";

    // -C is shared by solana / keygen / often useful as config root
    if let Some(ref config) = req.config_path {
        if !config.is_empty() {
            args.push("-C".into());
            args.push(config.clone());
        }
    }

    // solana and spl-token support cluster/keypair globals; keygen does not
    if is_solana || is_spl {
        if let Some(ref url) = req.url {
            if !url.is_empty() {
                args.push("-u".into());
                args.push(url.clone());
            }
        }
        if let Some(ref keypair) = req.keypair {
            if !keypair.is_empty() {
                args.push("-k".into());
                args.push(keypair.clone());
            }
        }
    }

    if is_solana {
        if let Some(ref commitment) = req.commitment {
            if !commitment.is_empty() {
                args.push("--commitment".into());
                args.push(commitment.clone());
            }
        }
        if let Some(ref ws) = req.ws {
            if !ws.is_empty() {
                args.push("--ws".into());
                args.push(ws.clone());
            }
        }
        if req.verbose {
            args.push("-v".into());
        }
        if req.skip_preflight {
            args.push("--skip-preflight".into());
        }
        if req.json {
            args.push("--output".into());
            args.push("json".into());
        }
    }

    // silence unused for keygen path clarity
    let _ = is_keygen;

    args.extend(req.args.iter().cloned());
    args
}

fn command_preview(binary_path: &Path, args: &[String]) -> String {
    format!(
        "{} {}",
        binary_path.display(),
        args.iter()
            .map(|a| {
                if a.contains(' ') {
                    format!("\"{a}\"")
                } else {
                    a.clone()
                }
            })
            .collect::<Vec<_>>()
            .join(" ")
    )
}

pub fn run_cli(req: RunCliRequest) -> Result<CommandResult, String> {
    let binary_path = resolve_binary(&req.binary)?;
    let args = build_args(&req);
    let timeout = Duration::from_millis(req.timeout_ms.unwrap_or(60_000));
    let preview = command_preview(&binary_path, &args);

    let start = Instant::now();
    let mut child = Command::new(&binary_path)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to spawn {}: {e}", binary_path.display()))?;

    // Poll until exit or timeout
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if start.elapsed() > timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(format!(
                        "Command timed out after {}ms: {preview}",
                        timeout.as_millis()
                    ));
                }
                std::thread::sleep(Duration::from_millis(25));
            }
            Err(e) => return Err(format!("Failed waiting on process: {e}")),
        }
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to read process output: {e}"))?;

    let duration_ms = start.elapsed().as_millis() as u64;

    Ok(CommandResult {
        exit_code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        duration_ms,
        command_preview: preview,
        binary_path: binary_path.display().to_string(),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamLineEvent {
    pub stream: String,
    pub line: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamEndEvent {
    pub exit_code: i32,
    pub duration_ms: u64,
    pub command_preview: String,
    pub cancelled: bool,
    pub binary_path: String,
}

/// Start a long-running CLI process and stream stdout/stderr lines to the frontend.
/// Cancels any previously running stream first.
pub fn start_cli_stream(
    app: AppHandle,
    handle: Arc<StreamHandle>,
    req: RunCliRequest,
) -> Result<String, String> {
    // Cancel any existing stream
    stop_cli_stream(handle.clone())?;

    let binary_path = resolve_binary(&req.binary)?;
    let args = build_args(&req);
    let preview = command_preview(&binary_path, &args);
    let binary_path_str = binary_path.display().to_string();

    {
        let mut cancel = handle
            .cancel
            .lock()
            .map_err(|_| "stream cancel lock poisoned".to_string())?;
        *cancel = false;
    }

    let mut child = Command::new(&binary_path)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to spawn {}: {e}", binary_path.display()))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture stderr".to_string())?;

    {
        let mut slot = handle
            .child
            .lock()
            .map_err(|_| "stream child lock poisoned".to_string())?;
        *slot = Some(child);
    }

    let app_out = app.clone();
    let out_thread = std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let _ = app_out.emit(
                "cli-stream-line",
                StreamLineEvent {
                    stream: "stdout".into(),
                    line,
                },
            );
        }
    });

    let app_err = app.clone();
    let err_thread = std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let _ = app_err.emit(
                "cli-stream-line",
                StreamLineEvent {
                    stream: "stderr".into(),
                    line,
                },
            );
        }
    });

    let handle_wait = handle.clone();
    let app_wait = app.clone();
    let timeout = req
        .timeout_ms
        .map(Duration::from_millis)
        .unwrap_or(Duration::from_secs(3600)); // 1h default for grind

    std::thread::spawn(move || {
        let start = Instant::now();
        let mut cancelled = false;
        let mut exit_code: i32 = -1;

        loop {
            let status = {
                let mut slot = match handle_wait.child.lock() {
                    Ok(g) => g,
                    Err(_) => break,
                };
                match slot.as_mut() {
                    Some(child) => child.try_wait().ok().flatten(),
                    None => {
                        exit_code = -1;
                        break;
                    }
                }
            };

            if let Some(status) = status {
                exit_code = status
                    .code()
                    .unwrap_or(if cancelled { -2 } else { -1 });
                break;
            }

            let cancel_requested = handle_wait
                .cancel
                .lock()
                .map(|g| *g)
                .unwrap_or(false);

            if cancel_requested || start.elapsed() > timeout {
                cancelled = true;
                if let Ok(mut slot) = handle_wait.child.lock() {
                    if let Some(ref mut child) = *slot {
                        let _ = child.kill();
                        if let Ok(status) = child.wait() {
                            exit_code = status.code().unwrap_or(-2);
                        } else {
                            exit_code = -2;
                        }
                    }
                }
                break;
            }

            std::thread::sleep(Duration::from_millis(50));
        }

        // Ensure reader threads finish after pipes close
        let _ = out_thread.join();
        let _ = err_thread.join();

        if let Ok(mut slot) = handle_wait.child.lock() {
            *slot = None;
        }
        if let Ok(mut c) = handle_wait.cancel.lock() {
            *c = false;
        }

        let _ = app_wait.emit(
            "cli-stream-end",
            StreamEndEvent {
                exit_code,
                duration_ms: start.elapsed().as_millis() as u64,
                command_preview: preview,
                cancelled,
                binary_path: binary_path_str,
            },
        );
    });

    Ok("started".into())
}

pub fn stop_cli_stream(handle: Arc<StreamHandle>) -> Result<(), String> {
    if let Ok(mut cancel) = handle.cancel.lock() {
        *cancel = true;
    }
    if let Ok(mut slot) = handle.child.lock() {
        if let Some(ref mut child) = *slot {
            let _ = child.kill();
            let _ = child.wait();
        }
        *slot = None;
    }
    Ok(())
}

pub fn is_stream_running(handle: Arc<StreamHandle>) -> bool {
    handle
        .child
        .lock()
        .map(|g| g.is_some())
        .unwrap_or(false)
}

fn probe_binary(name: &str) -> BinaryInfo {
    match find_binary(name) {
        Some(path) => {
            let version = read_binary_version(name, &path);
            BinaryInfo {
                name: name.to_string(),
                path: Some(path.display().to_string()),
                version: Some(version),
                found: true,
            }
        }
        None => BinaryInfo {
            name: name.to_string(),
            path: None,
            version: None,
            found: false,
        },
    }
}

/// Read a friendly version string. Never surface CLI error text as "version".
fn read_binary_version(name: &str, path: &Path) -> String {
    // soltop has no --version flag
    if name == "soltop" {
        return "installed (no --version)".into();
    }

    let output = Command::new(path)
        .arg("--version")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();

    if let Ok(o) = output {
        if o.status.success() {
            let s = String::from_utf8_lossy(&o.stdout);
            let line = s.lines().next().unwrap_or("").trim();
            if !line.is_empty() && !line.to_lowercase().contains("error") {
                return line.to_string();
            }
            // some tools print version on stderr
            let e = String::from_utf8_lossy(&o.stderr);
            let line = e.lines().next().unwrap_or("").trim();
            if !line.is_empty()
                && !line.to_lowercase().contains("error")
                && !line.to_lowercase().contains("unexpected")
            {
                return line.to_string();
            }
        }
    }
    "installed".into()
}

/// Known tools we can offer one-click install help for.
const INSTALLABLE: &[&str] = &["solana", "solana-keygen", "spl-token", "soltop"];

/// Shell command to install a tool (run in system terminal).
pub fn install_command_for(tool: &str) -> Result<String, String> {
    if !INSTALLABLE.contains(&tool) {
        return Err(format!("No install recipe for '{tool}'"));
    }
    match tool {
        "solana" | "solana-keygen" | "spl-token" => Ok(
            r#"echo "Installing Solana CLI (Agave)…"
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
# ensure active_release bin is on PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo ""
echo "Installed versions:"
solana --version 2>/dev/null || true
solana-keygen --version 2>/dev/null || true
spl-token --version 2>/dev/null || true
echo ""
echo "Done. Re-open Solana or hit refresh."
exec $SHELL"#
                .into(),
        ),
        "soltop" => Ok(
            r#"echo "Installing soltop from source (macOS/Linux)…"
if ! command -v cargo >/dev/null 2>&1; then
  echo "Rust/cargo not found. Install from https://rustup.rs first."
  exec $SHELL
fi
cargo install --git https://github.com/soltop-sh/soltop-oss
export PATH="$HOME/.cargo/bin:$PATH"
which soltop && echo "soltop ready."
echo ""
echo "Done. Re-open Solana or hit refresh."
exec $SHELL"#
                .into(),
        ),
        _ => Err(format!("No install recipe for '{tool}'")),
    }
}

/// Open a system terminal and run the install recipe for `tool`.
pub fn launch_install(tool: &str) -> Result<String, String> {
    let script = install_command_for(tool)?;
    // Write a temp shell script so quoting stays reliable
    let dir = std::env::temp_dir();
    let path = dir.join(format!("solana-cli-gui-install-{tool}.sh"));
    let body = format!("#!/bin/zsh\nset -e\n{script}\n");
    std::fs::write(&path, body).map_err(|e| format!("Failed to write install script: {e}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&path)
            .map_err(|e| format!("stat install script: {e}"))?
            .permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&path, perms)
            .map_err(|e| format!("chmod install script: {e}"))?;
    }
    let cmd = format!("exec {}", shell_single_quote(&path.display().to_string()));
    launch_command_in_terminal(&cmd)?;
    Ok(format!("Started install for {tool} in system terminal"))
}

pub fn get_status(overrides: RunCliRequest) -> AppStatus {
    let mut binaries: Vec<BinaryInfo> = ALLOWED_BINARIES.iter().map(|n| probe_binary(n)).collect();
    binaries.push(probe_binary("soltop"));

    let solana_found = binaries.iter().any(|b| b.name == "solana" && b.found);

    if !solana_found {
        return AppStatus {
            binaries,
            config: None,
            address: None,
            balance: None,
            epoch_info: None,
        };
    }

    let run = |args: Vec<&str>, json: bool| {
        let mut req = overrides.clone();
        req.binary = "solana".into();
        req.args = args.into_iter().map(String::from).collect();
        req.json = json;
        req.timeout_ms = Some(30_000);
        run_cli(req).ok()
    };

    AppStatus {
        binaries,
        config: run(vec!["config", "get"], false),
        address: run(vec!["address"], false),
        balance: run(vec!["balance"], true),
        epoch_info: run(vec!["epoch-info"], true),
    }
}

pub fn allowed_binaries() -> Vec<String> {
    ALLOWED_BINARIES.iter().map(|s| s.to_string()).collect()
}

// ── soltop (external TUI) ─────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SoltopLaunchRequest {
    /// Full RPC URL or moniker (devnet / mainnet-beta / …)
    pub rpc_url: Option<String>,
    #[serde(default)]
    pub hide_system: bool,
    #[serde(default)]
    pub verbose: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SoltopLaunchResult {
    pub command_preview: String,
    pub binary_path: String,
    pub rpc_url: String,
}

/// Map Solana monikers to public RPC URLs (soltop needs a full URL).
pub fn expand_rpc_url(url_or_moniker: &str) -> String {
    let u = url_or_moniker.trim();
    if u.is_empty() {
        return "https://api.mainnet-beta.solana.com".into();
    }
    if u.starts_with("http://") || u.starts_with("https://") {
        return u.to_string();
    }
    match u.to_lowercase().as_str() {
        "d" | "devnet" => "https://api.devnet.solana.com".into(),
        "t" | "testnet" => "https://api.testnet.solana.com".into(),
        "m" | "mainnet" | "mainnet-beta" => "https://api.mainnet-beta.solana.com".into(),
        "l" | "localhost" => "http://127.0.0.1:8899".into(),
        other => other.to_string(),
    }
}

pub fn probe_soltop() -> BinaryInfo {
    probe_binary("soltop")
}

fn shell_single_quote(s: &str) -> String {
    // Safe for bash/zsh single-quoted strings
    format!("'{}'", s.replace('\'', "'\\''"))
}

/// Open soltop's interactive TUI in the system terminal.
pub fn launch_soltop(req: SoltopLaunchRequest) -> Result<SoltopLaunchResult, String> {
    let binary = find_binary("soltop").ok_or_else(|| {
        "soltop not found on PATH. Install from https://github.com/soltop-app/soltop-oss \
         (cargo install --git https://github.com/soltop-sh/soltop-oss)"
            .to_string()
    })?;

    let rpc = expand_rpc_url(req.rpc_url.as_deref().unwrap_or(""));
    let mut args: Vec<String> = vec!["--rpc-url".into(), rpc.clone()];
    if req.hide_system {
        args.push("--hide-system".into());
    }
    if req.verbose {
        args.push("--verbose".into());
    }

    let preview = command_preview(&binary, &args);
    let bin_q = shell_single_quote(&binary.display().to_string());
    let mut cmd_line = format!("exec {bin_q}");
    for a in &args {
        cmd_line.push(' ');
        cmd_line.push_str(&shell_single_quote(a));
    }

    launch_command_in_terminal(&cmd_line)?;

    Ok(SoltopLaunchResult {
        command_preview: preview,
        binary_path: binary.display().to_string(),
        rpc_url: rpc,
    })
}

fn launch_command_in_terminal(shell_command: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        // Escape for AppleScript double-quoted string
        let escaped = shell_command
            .replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('\n', " ");
        let script = format!(
            "tell application \"Terminal\"\n  activate\n  do script \"{escaped}\"\nend tell"
        );
        let status = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .status()
            .map_err(|e| format!("Failed to open Terminal.app: {e}"))?;
        if !status.success() {
            return Err(format!(
                "osascript exited with {:?}",
                status.code()
            ));
        }
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let candidates: &[&[&str]] = &[
            &["x-terminal-emulator", "-e", "bash", "-lc"],
            &["gnome-terminal", "--", "bash", "-lc"],
            &["konsole", "-e", "bash", "-lc"],
            &["xfce4-terminal", "-e", "bash", "-lc"],
            &["xterm", "-e", "bash", "-lc"],
        ];
        for parts in candidates {
            let term = parts[0];
            if find_binary(term).is_none() && which_exists(term).is_none() {
                continue;
            }
            // Reconstruct: binary + flags + "bash -lc 'cmd'"
            let mut cmd = Command::new(parts[0]);
            for p in &parts[1..] {
                if *p == "bash" {
                    // remaining must be -lc and the command
                    break;
                }
                cmd.arg(p);
            }
            // Find bash -lc position
            let mut saw_bash = false;
            for p in &parts[1..] {
                if *p == "bash" {
                    saw_bash = true;
                    cmd.arg("bash");
                    continue;
                }
                if saw_bash {
                    cmd.arg(p);
                }
            }
            if !saw_bash {
                cmd.arg("bash").arg("-lc");
            }
            cmd.arg(shell_command);
            match cmd.spawn() {
                Ok(_) => return Ok(()),
                Err(_) => continue,
            }
        }
        return Err(
            "No terminal emulator found. Install gnome-terminal/xterm or run soltop manually."
                .into(),
        );
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        let _ = shell_command;
        Err("Launching soltop in a terminal is only supported on macOS and Linux.".into())
    }
}

#[cfg(target_os = "linux")]
fn which_exists(name: &str) -> Option<PathBuf> {
    find_binary(name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_unknown_binary() {
        let err = resolve_binary("rm").unwrap_err();
        assert!(err.contains("not allowed"));
    }

    #[test]
    fn expands_rpc_monikers() {
        assert!(expand_rpc_url("devnet").contains("devnet"));
        assert!(expand_rpc_url("mainnet-beta").contains("mainnet"));
        assert_eq!(
            expand_rpc_url("https://example.com/rpc"),
            "https://example.com/rpc"
        );
    }

    #[test]
    fn finds_solana_if_installed() {
        // Skip soft-fail when CLI is missing in CI
        match resolve_binary("solana") {
            Ok(p) => assert!(p.ends_with("solana")),
            Err(_) => eprintln!("solana not installed; skip path assert"),
        }
    }

    #[test]
    fn run_config_get() {
        if resolve_binary("solana").is_err() {
            return;
        }
        let result = run_cli(RunCliRequest {
            binary: "solana".into(),
            args: vec!["config".into(), "get".into()],
            config_path: None,
            url: None,
            keypair: None,
            commitment: None,
            ws: None,
            json: false,
            timeout_ms: Some(30_000),
            verbose: false,
            skip_preflight: false,
        })
        .expect("run config get");
        assert_eq!(result.exit_code, 0, "stderr={}", result.stderr);
        assert!(
            result.stdout.to_lowercase().contains("rpc")
                || result.stdout.to_lowercase().contains("config"),
            "stdout={}",
            result.stdout
        );
    }
}
