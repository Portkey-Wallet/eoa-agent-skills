use aelf_sdk::{UnlockedKeystore, Wallet};
use serde_json::{json, Value};

use crate::constants::ACTIVE_WALLET_PATH;
use crate::util::{optional_bool, optional_string, required_string, stringify_result};
use crate::wallet::{
    build_stored_wallet, find_stored_wallet, keystore_password_is_valid, load_wallet_store,
    parse_wallet_export_from_params, public_wallet_json, rebuild_stored_wallet_from_export,
    save_wallet_store, sync_active_wallet_after_delete, wallet_export_json, write_active_wallet,
};
use crate::workspace::memory_read;

pub fn create_wallet(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let name = optional_string(params, &["name"]);
    let password = required_string(params, &["password"])?;
    let redact_mnemonic =
        optional_bool(params, &["redactMnemonic", "redact_mnemonic"]).unwrap_or(false);
    let network = optional_string(params, &["network"]).unwrap_or_else(|| "mainnet".to_string());
    let wallet = Wallet::create().map_err(|e| format!("Failed to create wallet: {e}"))?;
    let mut wallets = load_wallet_store()?;

    if wallets
        .iter()
        .any(|candidate| candidate.metadata.address == wallet.address())
    {
        return Err(format!("Wallet already exists: {}", wallet.address()));
    }

    let stored = build_stored_wallet(&wallet, name, &network, &password)?;
    wallets.push(stored.clone());
    save_wallet_store(&wallets)?;
    write_active_wallet(&stored)?;

    stringify_result(build_create_wallet_response(
        &wallet,
        &stored,
        redact_mnemonic,
    )?)
}

pub fn import_wallet(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let mnemonic = optional_string(params, &["mnemonic"]);
    let private_key = optional_string(params, &["privateKey", "private_key"]);
    let wallet_export = parse_wallet_export_from_params(params)?;
    let source_count = usize::from(mnemonic.is_some())
        + usize::from(private_key.is_some())
        + usize::from(wallet_export.is_some());
    if source_count != 1 {
        return Err(
            "Provide exactly one import source: mnemonic, privateKey, or walletExport.".to_string(),
        );
    }

    let password = required_string(params, &["password"])?;
    let name = optional_string(params, &["name"]);
    let network = optional_string(params, &["network"]);

    let stored = if let Some(bundle) = wallet_export {
        if !bundle.keystore.check_password(&password) {
            return Err("walletExport password is invalid".to_string());
        }
        rebuild_stored_wallet_from_export(bundle, name, network)?
    } else {
        let wallet = if let Some(phrase) = mnemonic {
            Wallet::from_mnemonic(&phrase).map_err(|e| format!("Invalid mnemonic: {e}"))?
        } else {
            Wallet::from_private_key(&private_key.expect("checked above"))
                .map_err(|e| format!("Invalid private key: {e}"))?
        };
        build_stored_wallet(
            &wallet,
            name,
            &network.unwrap_or_else(|| "mainnet".to_string()),
            &password,
        )?
    };

    let mut wallets = load_wallet_store()?;
    if wallets
        .iter()
        .any(|candidate| candidate.metadata.address == stored.metadata.address)
    {
        return Err(format!(
            "Wallet already exists: {}",
            stored.metadata.address
        ));
    }

    wallets.push(stored.clone());
    save_wallet_store(&wallets)?;
    write_active_wallet(&stored)?;

    stringify_result(build_import_wallet_response(&stored)?)
}

pub fn backup_wallet(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let address = required_string(params, &["address"])?;
    let password = required_string(params, &["password"])?;
    let wallets = load_wallet_store()?;
    let wallet = find_stored_wallet(&wallets, &address)
        .ok_or_else(|| format!("Wallet '{address}' not found in isolated native state."))?;
    if !keystore_password_is_valid(wallet, &password) {
        return Err("Wallet password is invalid".to_string());
    }

    let unlocked = wallet
        .keystore
        .unlock_js(&password)
        .map_err(|e| format!("Failed to unlock wallet keystore: {e}"))?;

    stringify_result(build_backup_wallet_response(&unlocked, wallet)?)
}

pub fn delete_wallet(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let address = required_string(params, &["address"])?;
    let password = required_string(params, &["password"])?;
    let mut wallets = load_wallet_store()?;
    let index = wallets
        .iter()
        .position(|wallet| wallet.metadata.address == address)
        .ok_or_else(|| format!("Wallet '{address}' not found in isolated native state."))?;

    let wallet = wallets[index].clone();
    if !keystore_password_is_valid(&wallet, &password) {
        return Err("Wallet password is invalid".to_string());
    }
    wallets.remove(index);
    save_wallet_store(&wallets)?;
    sync_active_wallet_after_delete(&wallets, &address)?;

    stringify_result(json!({
        "address": address,
        "deleted": true,
    }))
}

pub fn get_active_wallet() -> Result<String, String> {
    match memory_read(ACTIVE_WALLET_PATH)? {
        Some(content) => Ok(content),
        None => stringify_result(json!({
            "status": "empty",
            "path": ACTIVE_WALLET_PATH,
            "message": "No active wallet is currently stored in the isolated native-wasm workspace."
        })),
    }
}

pub fn set_active_wallet(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let address = required_string(params, &["address"])?;
    let network = optional_string(params, &["network"]).unwrap_or_else(|| "mainnet".to_string());
    let requested_name = optional_string(params, &["name"]);
    let wallet = load_wallet_store()?
        .into_iter()
        .find(|candidate| candidate.metadata.address == address);
    let name = wallet
        .as_ref()
        .map(|candidate| candidate.metadata.name.clone())
        .or(requested_name);
    let payload = json!({
        "walletType": optional_string(params, &["walletType", "wallet_type"]).unwrap_or_else(|| "EOA".to_string()),
        "source": optional_string(params, &["source"]).unwrap_or_else(|| "ironclaw-native-wasm".to_string()),
        "network": network,
        "address": address,
        "name": name,
        "walletFile": "workspace:portkey-eoa/wallets.json",
        "updatedAt": crate::near::agent::host::now_millis(),
    });
    crate::workspace::memory_write(ACTIVE_WALLET_PATH, &payload.to_string(), false)?;
    Ok(payload.to_string())
}

pub fn list_wallets() -> Result<String, String> {
    let wallets = load_wallet_store()?;
    let public_wallets: Vec<Value> = wallets.iter().map(public_wallet_json).collect();
    stringify_result(json!(public_wallets))
}

pub fn get_wallet_info(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let address = required_string(params, &["address"])?;
    let wallets = load_wallet_store()?;
    let wallet = find_stored_wallet(&wallets, &address)
        .ok_or_else(|| format!("Wallet '{address}' not found in isolated native state."))?;
    stringify_result(public_wallet_json(wallet))
}

fn build_create_wallet_response(
    wallet: &Wallet,
    stored: &crate::types::StoredWallet,
    redact_mnemonic: bool,
) -> Result<Value, String> {
    let mut response = serde_json::Map::from_iter([
        (
            "address".to_string(),
            Value::String(wallet.address().to_string()),
        ),
        ("walletExport".to_string(), wallet_export_json(stored)?),
    ]);
    if redact_mnemonic {
        response.insert(
            "mnemonicHint".to_string(),
            Value::String(format!(
                "Mnemonic is encrypted and stored in the isolated native wallet state. To recover it, run wallet backup for {} with the same password, or use walletExport for native restore.",
                wallet.address()
            )),
        );
    } else {
        response.insert(
            "mnemonic".to_string(),
            Value::String(wallet.mnemonic().to_string()),
        );
    }
    Ok(Value::Object(response))
}

fn build_import_wallet_response(stored: &crate::types::StoredWallet) -> Result<Value, String> {
    Ok(json!({
        "address": stored.metadata.address,
        "walletExport": wallet_export_json(stored)?,
    }))
}

fn build_backup_wallet_response(
    unlocked: &UnlockedKeystore,
    wallet: &crate::types::StoredWallet,
) -> Result<Value, String> {
    let mut response = serde_json::Map::from_iter([
        (
            "privateKey".to_string(),
            Value::String(unlocked.private_key.clone()),
        ),
        ("walletExport".to_string(), wallet_export_json(wallet)?),
    ]);
    if !unlocked.mnemonic.is_empty() {
        response.insert(
            "mnemonic".to_string(),
            Value::String(unlocked.mnemonic.clone()),
        );
    }
    Ok(Value::Object(response))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::{WALLET_EXPORT_FORMAT, WALLET_EXPORT_VERSION};
    use crate::types::{StoredWallet, WalletMetadata, WalletPublicKey};
    use crate::wallet::build_wallet_export;
    use aelf_sdk::{Keystore, Wallet, DEFAULT_BIP44_PATH};

    #[test]
    fn import_requires_exactly_one_source() {
        let params = serde_json::from_value::<serde_json::Map<String, Value>>(json!({
            "password": "secret",
            "mnemonic": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
            "privateKey": "01"
        }))
        .expect("params");
        let error = import_wallet(&params).expect_err("error");
        assert!(error.contains("exactly one import source"));
    }

    #[test]
    fn wallet_export_uses_stable_version() {
        let wallet = Wallet::from_private_key(
            "03bd0cea9730bcfc8045248fd7f4841ea19315995c44801a3dfede0ca872f808",
        )
        .expect("wallet");
        let stored = StoredWallet {
            metadata: WalletMetadata {
                name: "fixture".to_string(),
                address: wallet.address().to_string(),
                public_key: WalletPublicKey {
                    x: "x".to_string(),
                    y: "y".to_string(),
                },
                bip44_path: DEFAULT_BIP44_PATH.to_string(),
                created_at: "1".to_string(),
                updated_at: "1".to_string(),
                network: "mainnet".to_string(),
            },
            keystore: Keystore::encrypt_js(&wallet, "secret").expect("keystore"),
        };
        let export = build_wallet_export(&stored);
        assert_eq!(export.version, WALLET_EXPORT_VERSION);
        assert_eq!(export.format, WALLET_EXPORT_FORMAT);
    }

    #[test]
    fn readonly_private_key_is_rejected_for_send_paths() {
        let params = serde_json::from_value::<serde_json::Map<String, Value>>(json!({
            "privateKey": "0000000000000000000000000000000000000000000000000000000000000001"
        }))
        .expect("params");
        let error = crate::wallet::resolve_signing_wallet(&params).expect_err("error");
        assert!(error.contains("readonly signer key"));
    }

    #[test]
    fn create_wallet_response_preserves_mnemonic_contract_when_not_redacted() {
        let wallet = Wallet::create().expect("wallet");
        let stored = fixture_stored_wallet(&wallet);
        let response = build_create_wallet_response(&wallet, &stored, false).expect("response");

        assert_eq!(response["address"], json!(wallet.address()));
        assert_eq!(response["mnemonic"], json!(wallet.mnemonic()));
        assert!(response.get("walletExport").is_some());
        assert!(response.get("mnemonicHint").is_none());
    }

    #[test]
    fn create_wallet_response_uses_hint_when_mnemonic_is_redacted() {
        let wallet = Wallet::create().expect("wallet");
        let stored = fixture_stored_wallet(&wallet);
        let response = build_create_wallet_response(&wallet, &stored, true).expect("response");

        assert!(response.get("mnemonic").is_none());
        assert!(response["mnemonicHint"]
            .as_str()
            .expect("hint")
            .contains("wallet backup"));
        assert!(response.get("walletExport").is_some());
    }

    #[test]
    fn backup_wallet_response_keeps_legacy_secret_fields_and_adds_wallet_export() {
        let wallet = Wallet::create().expect("wallet");
        let stored = fixture_stored_wallet(&wallet);
        let unlocked = stored.keystore.unlock_js("secret").expect("unlock");
        let response = build_backup_wallet_response(&unlocked, &stored).expect("response");

        assert_eq!(response["privateKey"], json!(wallet.private_key()));
        assert_eq!(response["mnemonic"], json!(wallet.mnemonic()));
        assert!(response.get("walletExport").is_some());
    }

    #[test]
    fn import_wallet_response_keeps_address_and_adds_wallet_export() {
        let wallet = Wallet::create().expect("wallet");
        let stored = fixture_stored_wallet(&wallet);
        let response = build_import_wallet_response(&stored).expect("response");

        assert_eq!(response["address"], json!(wallet.address()));
        assert!(response.get("walletExport").is_some());
    }

    fn fixture_stored_wallet(wallet: &Wallet) -> StoredWallet {
        StoredWallet {
            metadata: WalletMetadata {
                name: format!("Wallet-{}", &wallet.address()[..8]),
                address: wallet.address().to_string(),
                public_key: WalletPublicKey {
                    x: "x".to_string(),
                    y: "y".to_string(),
                },
                bip44_path: wallet.bip44_path().to_string(),
                created_at: "1".to_string(),
                updated_at: "1".to_string(),
                network: "mainnet".to_string(),
            },
            keystore: Keystore::encrypt_js(wallet, "secret").expect("keystore"),
        }
    }
}
