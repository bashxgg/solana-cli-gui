//! Convert between base58 secret keys and Solana CLI JSON-array keypair files.
//!
//! - JSON: `[u8; 64]` as decimal array (secret 32 + public 32) — Solana CLI format
//! - base58: usually 64-byte secret key (Phantom-style); 32-byte seeds are expanded via ed25519

use ed25519_dalek::{SigningKey, SECRET_KEY_LENGTH};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyConvertResult {
    pub base58: String,
    pub json_array: String,
    pub public_key: String,
    pub byte_length: usize,
    pub note: String,
}

fn secret_to_keypair_bytes(secret: &[u8]) -> Result<([u8; 64], String), String> {
    match secret.len() {
        64 => {
            let mut out = [0u8; 64];
            out.copy_from_slice(secret);
            // Prefer embedded pubkey (last 32); re-derive if seed-style
            let seed: [u8; 32] = out[..32]
                .try_into()
                .map_err(|_| "invalid 64-byte key".to_string())?;
            let signing = SigningKey::from_bytes(&seed);
            let derived_pub = signing.verifying_key().to_bytes();
            // If trailing 32 match derived pubkey, keep as-is; else treat first 32 as seed
            if out[32..] != derived_pub {
                // Still accept if user provided full 64-byte secret with matching structure
                // Overwrite pubkey half with derived for Solana CLI compatibility when seed-based
                let mut rebuilt = [0u8; 64];
                rebuilt[..32].copy_from_slice(&seed);
                rebuilt[32..].copy_from_slice(&derived_pub);
                let pk = bs58::encode(derived_pub).into_string();
                return Ok((rebuilt, pk));
            }
            let pk = bs58::encode(&out[32..]).into_string();
            Ok((out, pk))
        }
        SECRET_KEY_LENGTH => {
            let seed: [u8; 32] = secret
                .try_into()
                .map_err(|_| "invalid 32-byte seed".to_string())?;
            let signing = SigningKey::from_bytes(&seed);
            let pubkey = signing.verifying_key().to_bytes();
            let mut out = [0u8; 64];
            out[..32].copy_from_slice(&seed);
            out[32..].copy_from_slice(&pubkey);
            let pk = bs58::encode(pubkey).into_string();
            Ok((out, pk))
        }
        n => Err(format!(
            "Expected 32-byte seed or 64-byte secret key after decode, got {n} bytes"
        )),
    }
}

fn keypair_bytes_to_json(bytes: &[u8; 64]) -> String {
    let parts: Vec<String> = bytes.iter().map(|b| b.to_string()).collect();
    format!("[{}]", parts.join(","))
}

fn parse_json_array(input: &str) -> Result<Vec<u8>, String> {
    let trimmed = input.trim();
    // Accept raw JSON array or pretty-printed
    let parsed: Vec<u8> = serde_json::from_str(trimmed)
        .or_else(|_| {
            // Try wrapping if user pasted without brackets
            if !trimmed.starts_with('[') {
                serde_json::from_str(&format!("[{trimmed}]"))
            } else {
                Err(serde_json::Error::io(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "invalid",
                )))
            }
        })
        .map_err(|e| format!("Invalid JSON array: {e}"))?;

    if parsed.len() != 32 && parsed.len() != 64 {
        return Err(format!(
            "JSON array must have 32 or 64 numbers (got {})",
            parsed.len()
        ));
    }
    // Validate each is a u8 (serde already enforces 0-255 for u8)
    Ok(parsed)
}

/// base58 secret → JSON array + pubkey
pub fn base58_to_json(base58_key: &str) -> Result<KeyConvertResult, String> {
    let raw = base58_key.trim();
    if raw.is_empty() {
        return Err("base58 key is empty".into());
    }
    let decoded = bs58::decode(raw)
        .into_vec()
        .map_err(|e| format!("base58 decode failed: {e}"))?;

    let (kp, public_key) = secret_to_keypair_bytes(&decoded)?;
    let note = if decoded.len() == 32 {
        "Expanded 32-byte seed to full 64-byte Solana keypair (seed + pubkey)".into()
    } else {
        "Decoded 64-byte secret key to Solana CLI JSON array".into()
    };

    Ok(KeyConvertResult {
        base58: bs58::encode(kp).into_string(),
        json_array: keypair_bytes_to_json(&kp),
        public_key,
        byte_length: decoded.len(),
        note,
    })
}

/// JSON array → base58 secret + pubkey
pub fn json_to_base58(json_array: &str) -> Result<KeyConvertResult, String> {
    let bytes = parse_json_array(json_array)?;
    let (kp, public_key) = secret_to_keypair_bytes(&bytes)?;
    let note = if bytes.len() == 32 {
        "Expanded 32-byte seed array to full keypair; base58 is 64-byte secret".into()
    } else {
        "Encoded 64-byte JSON keypair to base58".into()
    };

    Ok(KeyConvertResult {
        base58: bs58::encode(kp).into_string(),
        json_array: keypair_bytes_to_json(&kp),
        public_key,
        byte_length: bytes.len(),
        note,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_random_seed() {
        let seed = [7u8; 32];
        let b58 = bs58::encode(seed).into_string();
        let a = base58_to_json(&b58).expect("b58->json");
        let b = json_to_base58(&a.json_array).expect("json->b58");
        assert_eq!(a.public_key, b.public_key);
        assert_eq!(a.json_array, b.json_array);
        // base58 of full 64-byte key
        let dec = bs58::decode(&b.base58).into_vec().unwrap();
        assert_eq!(dec.len(), 64);
    }
}
