mod cli;

use cli::{
    allowed_binaries, get_status, is_stream_running, launch_install, launch_soltop, probe_soltop,
    run_cli, start_cli_stream, stop_cli_stream, AppStatus, BinaryInfo, CommandResult,
    RunCliRequest, SoltopLaunchRequest, SoltopLaunchResult, StreamHandle,
};
use std::sync::Arc;

#[tauri::command]
fn run_solana_cli(request: RunCliRequest) -> Result<CommandResult, String> {
    run_cli(request)
}

#[tauri::command]
fn get_app_status(request: Option<RunCliRequest>) -> AppStatus {
    let overrides = request.unwrap_or(RunCliRequest {
        binary: "solana".into(),
        args: vec![],
        config_path: None,
        url: None,
        keypair: None,
        commitment: None,
        ws: None,
        json: false,
        timeout_ms: None,
        verbose: false,
        skip_preflight: false,
    });
    get_status(overrides)
}

#[tauri::command]
fn list_allowed_binaries() -> Vec<String> {
    allowed_binaries()
}

#[tauri::command]
fn start_cli_stream_cmd(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<StreamHandle>>,
    request: RunCliRequest,
) -> Result<String, String> {
    start_cli_stream(app, state.inner().clone(), request)
}

#[tauri::command]
fn stop_cli_stream_cmd(state: tauri::State<'_, Arc<StreamHandle>>) -> Result<(), String> {
    stop_cli_stream(state.inner().clone())
}

#[tauri::command]
fn is_cli_stream_running(state: tauri::State<'_, Arc<StreamHandle>>) -> bool {
    is_stream_running(state.inner().clone())
}

#[tauri::command]
fn get_soltop_status() -> BinaryInfo {
    probe_soltop()
}

#[tauri::command]
fn launch_soltop_cmd(request: SoltopLaunchRequest) -> Result<SoltopLaunchResult, String> {
    launch_soltop(request)
}

#[tauri::command]
fn launch_install_cmd(tool: String) -> Result<String, String> {
    launch_install(&tool)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let stream_handle = Arc::new(StreamHandle::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(stream_handle)
        .invoke_handler(tauri::generate_handler![
            run_solana_cli,
            get_app_status,
            list_allowed_binaries,
            start_cli_stream_cmd,
            stop_cli_stream_cmd,
            is_cli_stream_running,
            get_soltop_status,
            launch_soltop_cmd,
            launch_install_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
