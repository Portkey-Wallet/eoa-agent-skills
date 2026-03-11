pub const API_BASE: &str = "https://eoa-portkey.portkey.finance";
pub const ACTIVE_WALLET_PATH: &str = "portkey-eoa/active-wallet.json";
pub const WALLETS_PATH: &str = "portkey-eoa/wallets.json";
pub const CHAINS_INFO_PATH: &str = "/api/app/search/chainsinfoindex";
pub const HTTP_TIMEOUT_MS: u32 = 30_000;
pub const QUERY_IMAGE_WIDTH: u32 = 300;
pub const QUERY_IMAGE_HEIGHT: u32 = 300;
pub const ACTIVITY_IMAGE_WIDTH: u32 = 120;
pub const ACTIVITY_IMAGE_HEIGHT: u32 = 120;
pub const WALLET_EXPORT_VERSION: &str = "portkey-eoa-export-v2";
pub const WALLET_EXPORT_FORMAT: &str = "aelf-js-keystore";

pub const ACTIONS: &[&str] = &[
    "portkey_create_wallet",
    "portkey_import_wallet",
    "portkey_get_wallet_info",
    "portkey_list_wallets",
    "portkey_backup_wallet",
    "portkey_delete_wallet",
    "portkey_get_active_wallet",
    "portkey_set_active_wallet",
    "portkey_get_token_list",
    "portkey_get_token_balance",
    "portkey_get_token_prices",
    "portkey_get_nft_collections",
    "portkey_get_nft_items",
    "portkey_get_transaction_history",
    "portkey_get_transaction_detail",
    "portkey_transfer",
    "portkey_cross_chain_transfer",
    "portkey_approve",
    "portkey_call_view_method",
    "portkey_call_send_method",
    "portkey_estimate_fee",
    "portkey_ebridge_transfer",
    "portkey_ebridge_info",
];

pub const SCHEMA: &str = r#"{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": [
        "portkey_create_wallet",
        "portkey_import_wallet",
        "portkey_get_wallet_info",
        "portkey_list_wallets",
        "portkey_backup_wallet",
        "portkey_delete_wallet",
        "portkey_get_active_wallet",
        "portkey_set_active_wallet",
        "portkey_get_token_list",
        "portkey_get_token_balance",
        "portkey_get_token_prices",
        "portkey_get_nft_collections",
        "portkey_get_nft_items",
        "portkey_get_transaction_history",
        "portkey_get_transaction_detail",
        "portkey_transfer",
        "portkey_cross_chain_transfer",
        "portkey_approve",
        "portkey_call_view_method",
        "portkey_call_send_method",
        "portkey_estimate_fee",
        "portkey_ebridge_transfer",
        "portkey_ebridge_info"
      ],
      "description": "EOA action name aligned with the existing portkey_* semantics."
    },
    "address": {
      "type": "string",
      "description": "Aelf address or ELF_<address>_<chainId> formatted address."
    },
    "password": {
      "type": "string",
      "description": "Required password for wallet lifecycle and export/import operations."
    },
    "walletExport": {
      "type": ["object", "string"],
      "description": "Encrypted wallet export payload returned by create_wallet or backup_wallet."
    },
    "privateKey": {
      "type": "string",
      "description": "Hex-encoded private key for explicit import or signing."
    },
    "mnemonic": {
      "type": "string",
      "description": "12-word mnemonic for explicit wallet import."
    },
    "name": {
      "type": "string",
      "description": "Optional wallet name for isolated active-wallet state."
    },
    "symbol": {
      "type": "string",
      "description": "Token or NFT symbol."
    },
    "symbols": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of symbols for token price queries."
    },
    "chainId": {
      "type": "string",
      "description": "Chain ID such as AELF or tDVV."
    },
    "transactionId": {
      "type": "string",
      "description": "Transaction id for detail lookup."
    },
    "blockHash": {
      "type": "string",
      "description": "Block hash paired with transaction detail lookup."
    },
    "skipCount": {
      "type": "integer",
      "minimum": 0,
      "default": 0
    },
    "maxResultCount": {
      "type": "integer",
      "minimum": 1
    },
    "network": {
      "type": "string",
      "enum": ["mainnet"],
      "default": "mainnet"
    }
  },
  "required": ["action"],
  "additionalProperties": true
}"#;
