//! App-level settings stored as TOML (`~/.config/solana-cli-gui/config.toml`).
//! Separate from Solana CLI's own `config.yml`.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "snake_case")]
pub struct AppConfig {
    /// RPC URL or moniker override (-u)
    pub url: String,
    /// Keypair path override (-k)
    pub keypair: String,
    /// Commitment: processed | confirmed | finalized
    pub commitment: String,
    /// Solana CLI config.yml path (-C), optional
    pub solana_config: String,
    /// WebSocket URL override
    pub ws: String,
    pub json: bool,
    pub verbose: bool,
    pub skip_preflight: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            url: String::new(),
            keypair: String::new(),
            commitment: "confirmed".into(),
            solana_config: String::new(),
            ws: String::new(),
            json: false,
            verbose: false,
            skip_preflight: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfigResult {
    pub path: String,
    pub config: AppConfigDto,
}

/// Wire format for the frontend (camelCase).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfigDto {
    pub config_path: String,
    pub url: String,
    pub keypair: String,
    pub commitment: String,
    pub ws: String,
    pub json: bool,
    pub verbose: bool,
    pub skip_preflight: bool,
}

impl From<AppConfig> for AppConfigDto {
    fn from(c: AppConfig) -> Self {
        Self {
            config_path: c.solana_config,
            url: c.url,
            keypair: c.keypair,
            commitment: if c.commitment.is_empty() {
                "confirmed".into()
            } else {
                c.commitment
            },
            ws: c.ws,
            json: c.json,
            verbose: c.verbose,
            skip_preflight: c.skip_preflight,
        }
    }
}

impl From<AppConfigDto> for AppConfig {
    fn from(d: AppConfigDto) -> Self {
        Self {
            url: d.url,
            keypair: d.keypair,
            commitment: if d.commitment.is_empty() {
                "confirmed".into()
            } else {
                d.commitment
            },
            solana_config: d.config_path,
            ws: d.ws,
            json: d.json,
            verbose: d.verbose,
            skip_preflight: d.skip_preflight,
        }
    }
}

fn config_dir() -> Result<PathBuf, String> {
    let home = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .ok_or_else(|| "HOME / USERPROFILE not set".to_string())?;
    Ok(PathBuf::from(home).join(".config").join("solana-cli-gui"))
}

pub fn config_path() -> Result<PathBuf, String> {
    Ok(config_dir()?.join("config.toml"))
}

pub fn load_app_config() -> Result<AppConfigResult, String> {
    let path = config_path()?;
    let path_str = path.display().to_string();

    if !path.is_file() {
        return Ok(AppConfigResult {
            path: path_str,
            config: AppConfig::default().into(),
        });
    }

    let raw = fs::read_to_string(&path).map_err(|e| format!("read config.toml: {e}"))?;
    let parsed: AppConfig =
        toml::from_str(&raw).map_err(|e| format!("parse config.toml: {e}"))?;

    Ok(AppConfigResult {
        path: path_str,
        config: parsed.into(),
    })
}

pub fn save_app_config(dto: AppConfigDto) -> Result<AppConfigResult, String> {
    let dir = config_dir()?;
    fs::create_dir_all(&dir).map_err(|e| format!("create config dir: {e}"))?;

    let path = dir.join("config.toml");
    let cfg: AppConfig = dto.into();
    let body = toml::to_string_pretty(&cfg).map_err(|e| format!("serialize config.toml: {e}"))?;

    // Header comment for humans
    let mut file = String::from(
        "# solana-cli-gui settings (TOML)\n\
         # Path: ~/.config/solana-cli-gui/config.toml\n\
         # Note: solana_config is the Solana CLI config.yml path (-C), not this file.\n\n",
    );
    file.push_str(&body);

    fs::write(&path, file).map_err(|e| format!("write config.toml: {e}"))?;

    Ok(AppConfigResult {
        path: path.display().to_string(),
        config: cfg.into(),
    })
}

/// Expand leading `~/` using HOME / USERPROFILE.
fn expand_user_path(raw: &str) -> PathBuf {
    let t = raw.trim();
    if t == "~" {
        if let Some(home) = std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE")) {
            return PathBuf::from(home);
        }
    }
    if let Some(rest) = t.strip_prefix("~/") {
        if let Some(home) = std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE")) {
            return PathBuf::from(home).join(rest);
        }
    }
    // Windows-style %USERPROFILE%\... not handled; absolute / relative as-is
    PathBuf::from(t)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathValidation {
    pub valid: bool,
    pub message: String,
    pub resolved_path: String,
}

/// Empty path = valid (use Solana CLI default). Non-empty must be an existing readable file.
pub fn validate_cli_config_path(path: &str) -> PathValidation {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return PathValidation {
            valid: true,
            message: "using Solana CLI default config.yml".into(),
            resolved_path: String::new(),
        };
    }

    let resolved = expand_user_path(trimmed);
    let resolved_str = resolved.display().to_string();

    if !resolved.exists() {
        return PathValidation {
            valid: false,
            message: format!("path does not exist: {resolved_str}"),
            resolved_path: resolved_str,
        };
    }
    if resolved.is_dir() {
        return PathValidation {
            valid: false,
            message: format!("path is a directory, need a config file: {resolved_str}"),
            resolved_path: resolved_str,
        };
    }
    if !resolved.is_file() {
        return PathValidation {
            valid: false,
            message: format!("not a regular file: {resolved_str}"),
            resolved_path: resolved_str,
        };
    }

    match fs::read_to_string(&resolved) {
        Ok(contents) => {
            if contents.trim().is_empty() {
                return PathValidation {
                    valid: false,
                    message: format!("file is empty: {resolved_str}"),
                    resolved_path: resolved_str,
                };
            }
            // Light sanity: Solana config.yml usually has "json_rpc_url" or "keypair_path"
            let lower = contents.to_lowercase();
            let looks_like_config = lower.contains("json_rpc_url")
                || lower.contains("keypair_path")
                || lower.contains("commitment")
                || lower.contains("rpc");
            if !looks_like_config {
                return PathValidation {
                    valid: false,
                    message: format!(
                        "file exists but does not look like a Solana CLI config.yml: {resolved_str}"
                    ),
                    resolved_path: resolved_str,
                };
            }
            PathValidation {
                valid: true,
                message: format!("ok · {resolved_str}"),
                resolved_path: resolved_str,
            }
        }
        Err(e) => PathValidation {
            valid: false,
            message: format!("cannot read file: {e}"),
            resolved_path: resolved_str,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_path_is_valid_default() {
        let v = validate_cli_config_path("");
        assert!(v.valid);
        assert!(v.resolved_path.is_empty());
    }

    #[test]
    fn missing_path_invalid() {
        let v = validate_cli_config_path("/tmp/solana-cli-gui-no-such-config-xyz.yml");
        assert!(!v.valid);
    }
}
