use aelf_sdk::{Keystore, Wallet};
use serde_json::{json, Value};

use crate::constants::{
    ACTIVE_WALLET_PATH, WALLETS_PATH, WALLET_EXPORT_FORMAT, WALLET_EXPORT_VERSION,
};
use crate::types::{StoredWallet, WalletExportBundle, WalletMetadata, WalletPublicKey};
use crate::util::{decode_hex, encode_hex, optional_string, required_string};
use crate::workspace::{memory_read, memory_write};

const READONLY_VIEW_PRIVATE_KEY: &str =
    "0000000000000000000000000000000000000000000000000000000000000001";

pub fn build_stored_wallet(
    wallet: &Wallet,
    name: Option<String>,
    network: &str,
    password: &str,
) -> Result<StoredWallet, String> {
    let now = crate::near::agent::host::now_millis().to_string();
    Ok(StoredWallet {
        metadata: build_wallet_metadata(wallet, name, network, &now, &now)?,
        keystore: Keystore::encrypt_js(wallet, password)
            .map_err(|e| format!("Failed to encrypt wallet keystore: {e}"))?,
    })
}

pub fn rebuild_stored_wallet_from_export(
    wallet_export: WalletExportBundle,
    name_override: Option<String>,
    network_override: Option<String>,
) -> Result<StoredWallet, String> {
    validate_wallet_export(&wallet_export)?;
    let mut metadata = wallet_export.metadata;
    if let Some(name) = name_override {
        metadata.name = name;
    }
    if let Some(network) = network_override {
        metadata.network = network;
    }
    metadata.updated_at = crate::near::agent::host::now_millis().to_string();
    Ok(StoredWallet {
        metadata,
        keystore: wallet_export.keystore,
    })
}

pub fn load_wallet_store() -> Result<Vec<StoredWallet>, String> {
    let Some(content) = memory_read(WALLETS_PATH)? else {
        return Ok(Vec::new());
    };
    let parsed: Value =
        serde_json::from_str(&content).map_err(|e| format!("Invalid wallet state JSON: {e}"))?;
    let data = if parsed.is_array() {
        parsed
    } else {
        parsed.get("data").cloned().unwrap_or(parsed)
    };
    if data.is_null() {
        return Ok(Vec::new());
    }
    serde_json::from_value(data).map_err(|e| format!("Invalid stored wallet shape: {e}"))
}

pub fn save_wallet_store(wallets: &[StoredWallet]) -> Result<(), String> {
    let content = serde_json::to_string(wallets)
        .map_err(|e| format!("Failed to serialize wallet state: {e}"))?;
    memory_write(WALLETS_PATH, &content, false)
}

pub fn find_stored_wallet<'a>(
    wallets: &'a [StoredWallet],
    address: &str,
) -> Option<&'a StoredWallet> {
    wallets
        .iter()
        .find(|wallet| wallet.metadata.address == address)
}

pub fn public_wallet_json(wallet: &StoredWallet) -> Value {
    json!({
        "address": wallet.metadata.address,
        "publicKey": {
            "x": wallet.metadata.public_key.x,
            "y": wallet.metadata.public_key.y,
        },
        "name": wallet.metadata.name,
        "network": wallet.metadata.network,
        "createdAt": wallet.metadata.created_at,
    })
}

pub fn write_active_wallet(wallet: &StoredWallet) -> Result<(), String> {
    memory_write(
        ACTIVE_WALLET_PATH,
        &active_wallet_payload(
            wallet.metadata.address.clone(),
            wallet.metadata.network.clone(),
            Some(wallet.metadata.name.clone()),
        )
        .to_string(),
        false,
    )
}

pub fn clear_active_wallet(message: &str) -> Result<(), String> {
    let payload = json!({
        "status": "empty",
        "path": ACTIVE_WALLET_PATH,
        "message": message,
        "updatedAt": crate::near::agent::host::now_millis(),
    });
    memory_write(ACTIVE_WALLET_PATH, &payload.to_string(), false)
}

pub fn sync_active_wallet_after_delete(
    wallets: &[StoredWallet],
    deleted_address: &str,
) -> Result<(), String> {
    let active_address = read_active_wallet_address()?;
    let next_address =
        replacement_active_wallet_address(wallets, deleted_address, active_address.as_deref());

    match (active_address.as_deref(), next_address) {
        (Some(active), Some(next)) if active == deleted_address && next != deleted_address => {
            if let Some(wallet) = find_stored_wallet(wallets, &next) {
                write_active_wallet(wallet)?;
            }
        }
        (Some(active), None) if active == deleted_address => {
            clear_active_wallet(
                "The previously active wallet was deleted from the isolated native-wasm workspace.",
            )?;
        }
        _ => {}
    }

    Ok(())
}

pub fn replacement_active_wallet_address(
    wallets: &[StoredWallet],
    deleted_address: &str,
    active_address: Option<&str>,
) -> Option<String> {
    if active_address != Some(deleted_address) {
        return active_address.map(ToString::to_string);
    }

    wallets
        .iter()
        .find(|wallet| wallet.metadata.address != deleted_address)
        .map(|wallet| wallet.metadata.address.clone())
}

pub fn stale_active_wallet_error(address: &str) -> String {
    format!(
        "The active wallet '{address}' no longer exists in isolated native state. Set a new active wallet or provide address/privateKey explicitly."
    )
}

pub fn read_active_wallet_address() -> Result<Option<String>, String> {
    let Some(content) = memory_read(ACTIVE_WALLET_PATH)? else {
        return Ok(None);
    };
    let parsed: Value =
        serde_json::from_str(&content).map_err(|e| format!("Invalid active wallet JSON: {e}"))?;
    Ok(parsed
        .get("address")
        .and_then(Value::as_str)
        .map(ToString::to_string))
}

pub fn load_wallet_from_store(address: &str, password: &str) -> Result<Wallet, String> {
    let wallets = load_wallet_store()?;
    let wallet = find_stored_wallet(&wallets, address)
        .ok_or_else(|| format!("Wallet '{address}' not found in isolated native state."))?;
    wallet_from_keystore(&wallet.keystore, password)
}

pub fn resolve_signing_wallet(params: &serde_json::Map<String, Value>) -> Result<Wallet, String> {
    if let Some(private_key) = optional_string(params, &["privateKey", "private_key"]) {
        let wallet = Wallet::from_private_key(&private_key)
            .map_err(|e| format!("Invalid signing private key: {e}"))?;
        if wallet.private_key() == READONLY_VIEW_PRIVATE_KEY {
            return Err(
                "The reserved readonly signer key can only be used for native view calls."
                    .to_string(),
            );
        }
        return Ok(wallet);
    }

    let password = required_string(params, &["password"])?;
    if let Some(address) = optional_string(params, &["address"]) {
        return load_wallet_from_store(&address, &password);
    }

    if let Some(address) = read_active_wallet_address()? {
        return match load_wallet_from_store(&address, &password) {
            Ok(wallet) => Ok(wallet),
            Err(error) if error.contains("not found in isolated native state") => {
                clear_active_wallet(&format!(
                    "The active wallet '{address}' is no longer available in the isolated native-wasm workspace."
                ))?;
                Err(stale_active_wallet_error(&address))
            }
            Err(error) => Err(error),
        };
    }

    Err(
        "A signing wallet is required. Provide privateKey, or provide password plus address/an active wallet stored in the isolated native workspace."
            .to_string(),
    )
}

pub fn build_wallet_export(wallet: &StoredWallet) -> WalletExportBundle {
    WalletExportBundle {
        version: WALLET_EXPORT_VERSION.to_string(),
        format: WALLET_EXPORT_FORMAT.to_string(),
        keystore: wallet.keystore.clone(),
        metadata: wallet.metadata.clone(),
    }
}

pub fn wallet_export_json(wallet: &StoredWallet) -> Result<Value, String> {
    serde_json::to_value(build_wallet_export(wallet))
        .map_err(|e| format!("Failed to serialize wallet export: {e}"))
}

pub fn parse_wallet_export(value: &Value) -> Result<WalletExportBundle, String> {
    let export = match value {
        Value::String(text) => serde_json::from_str(text)
            .map_err(|e| format!("Invalid walletExport JSON string: {e}"))?,
        other => serde_json::from_value(other.clone())
            .map_err(|e| format!("Invalid walletExport payload: {e}"))?,
    };
    validate_wallet_export(&export)?;
    Ok(export)
}

pub fn parse_wallet_export_from_params(
    params: &serde_json::Map<String, Value>,
) -> Result<Option<WalletExportBundle>, String> {
    params
        .get("walletExport")
        .map(parse_wallet_export)
        .transpose()
}

pub fn validate_wallet_export(export: &WalletExportBundle) -> Result<(), String> {
    if export.version != WALLET_EXPORT_VERSION {
        return Err(format!(
            "Unsupported walletExport version '{}'",
            export.version
        ));
    }
    if export.format != WALLET_EXPORT_FORMAT {
        return Err(format!(
            "Unsupported walletExport format '{}'",
            export.format
        ));
    }
    if export.metadata.address.is_empty() {
        return Err("walletExport.metadata.address must not be empty".to_string());
    }
    if export.keystore.address.is_empty() {
        return Err("walletExport.keystore.address must not be empty".to_string());
    }
    if export.metadata.address != export.keystore.address {
        return Err("walletExport address metadata does not match keystore address".to_string());
    }
    Ok(())
}

pub fn keystore_password_is_valid(wallet: &StoredWallet, password: &str) -> bool {
    wallet.keystore.check_password(password)
}

pub fn wallet_from_keystore(keystore: &Keystore, password: &str) -> Result<Wallet, String> {
    let unlocked = keystore
        .unlock_js(password)
        .map_err(|e| format!("Failed to unlock wallet keystore: {e}"))?;
    Wallet::from_private_key(&unlocked.private_key)
        .map_err(|e| format!("Failed to derive wallet from unlocked keystore: {e}"))
}

fn build_wallet_metadata(
    wallet: &Wallet,
    name: Option<String>,
    network: &str,
    created_at: &str,
    updated_at: &str,
) -> Result<WalletMetadata, String> {
    Ok(WalletMetadata {
        name: name.unwrap_or_else(|| {
            format!(
                "Wallet-{}",
                &wallet.address().chars().take(8).collect::<String>()
            )
        }),
        address: wallet.address().to_string(),
        public_key: split_public_key_xy(wallet.public_key())?,
        bip44_path: wallet.bip44_path().to_string(),
        created_at: created_at.to_string(),
        updated_at: updated_at.to_string(),
        network: network.to_string(),
    })
}

fn split_public_key_xy(public_key_hex: &str) -> Result<WalletPublicKey, String> {
    let bytes = decode_hex(public_key_hex)?;
    if bytes.len() != 65 || bytes[0] != 0x04 {
        return Err("AElf SDK public key must be uncompressed secp256k1 bytes".to_string());
    }
    Ok(WalletPublicKey {
        x: encode_hex(&bytes[1..33]),
        y: encode_hex(&bytes[33..65]),
    })
}

fn active_wallet_payload(address: String, network: String, name: Option<String>) -> Value {
    json!({
        "walletType": "EOA",
        "source": "ironclaw-native-wasm",
        "network": network,
        "address": address,
        "name": name,
        "walletFile": format!("workspace:{WALLETS_PATH}"),
        "updatedAt": crate::near::agent::host::now_millis(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replacement_active_wallet_promotes_first_remaining_wallet() {
        let next = replacement_active_wallet_address(
            &[
                fixture_stored_wallet("ELF_next_AELF"),
                fixture_stored_wallet("ELF_other_AELF"),
            ],
            "ELF_deleted_AELF",
            Some("ELF_deleted_AELF"),
        );
        assert_eq!(next, Some("ELF_next_AELF".to_string()));
    }

    #[test]
    fn replacement_active_wallet_clears_when_deleted_wallet_was_last_active_wallet() {
        let next =
            replacement_active_wallet_address(&[], "ELF_deleted_AELF", Some("ELF_deleted_AELF"));
        assert_eq!(next, None);
    }

    #[test]
    fn stale_active_wallet_error_is_actionable() {
        let error = stale_active_wallet_error("ELF_dead_AELF");
        assert!(error.contains("Set a new active wallet"));
        assert!(error.contains("ELF_dead_AELF"));
    }

    fn fixture_stored_wallet(address: &str) -> StoredWallet {
        let wallet = Wallet::create().expect("wallet");
        StoredWallet {
            metadata: WalletMetadata {
                name: format!("Wallet-{}", &address[..address.len().min(8)]),
                address: address.to_string(),
                public_key: WalletPublicKey {
                    x: "x".to_string(),
                    y: "y".to_string(),
                },
                bip44_path: wallet.bip44_path().to_string(),
                created_at: "1".to_string(),
                updated_at: "1".to_string(),
                network: "mainnet".to_string(),
            },
            keystore: {
                let mut keystore = Keystore::encrypt_js(&wallet, "secret").expect("keystore");
                keystore.address = address.to_string();
                keystore
            },
        }
    }
}
