use aelf_sdk::Keystore;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct WalletPublicKey {
    pub x: String,
    pub y: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct WalletMetadata {
    pub name: String,
    pub address: String,
    #[serde(rename = "publicKey")]
    pub public_key: WalletPublicKey,
    #[serde(rename = "bip44Path")]
    pub bip44_path: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub network: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct StoredWallet {
    #[serde(flatten)]
    pub metadata: WalletMetadata,
    pub keystore: Keystore,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct WalletExportBundle {
    pub version: String,
    pub format: String,
    pub keystore: Keystore,
    pub metadata: WalletMetadata,
}

#[derive(Clone, Debug, Deserialize)]
pub struct ChainIndexResult {
    pub items: Vec<ChainInfoItem>,
}

#[allow(dead_code)]
#[derive(Clone, Debug, Deserialize)]
pub struct ChainInfoItem {
    #[serde(rename = "chainId")]
    pub chain_id: String,
    #[serde(rename = "endPoint")]
    pub end_point: String,
    #[serde(rename = "defaultToken")]
    pub default_token: ChainDefaultToken,
}

#[allow(dead_code)]
#[derive(Clone, Debug, Deserialize)]
pub struct ChainDefaultToken {
    pub address: String,
}
