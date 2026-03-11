pub mod bridge;
pub mod query;
pub mod transaction;
pub mod wallet;

use serde_json::Value;

pub fn execute(action: &str, params: &serde_json::Map<String, Value>) -> Result<String, String> {
    match action {
        "portkey_create_wallet" => wallet::create_wallet(params),
        "portkey_import_wallet" => wallet::import_wallet(params),
        "portkey_backup_wallet" => wallet::backup_wallet(params),
        "portkey_delete_wallet" => wallet::delete_wallet(params),
        "portkey_get_active_wallet" => wallet::get_active_wallet(),
        "portkey_set_active_wallet" => wallet::set_active_wallet(params),
        "portkey_list_wallets" => wallet::list_wallets(),
        "portkey_get_wallet_info" => wallet::get_wallet_info(params),
        "portkey_get_token_list" => query::get_token_list(params),
        "portkey_get_token_balance" => query::get_token_balance(params),
        "portkey_get_token_prices" => query::get_token_prices(params),
        "portkey_get_nft_collections" => query::get_nft_collections(params),
        "portkey_get_nft_items" => query::get_nft_items(params),
        "portkey_get_transaction_history" => query::get_transaction_history(params),
        "portkey_get_transaction_detail" => query::get_transaction_detail(params),
        "portkey_call_view_method" => query::call_view_method(params),
        "portkey_estimate_fee" => query::estimate_fee(params),
        "portkey_ebridge_info" => bridge::get_ebridge_info(params),
        "portkey_transfer" => transaction::transfer(params),
        "portkey_cross_chain_transfer" => transaction::cross_chain_transfer(params),
        "portkey_approve" => transaction::approve(params),
        "portkey_call_send_method" => transaction::call_send_method(params),
        "portkey_ebridge_transfer" => bridge::ebridge_transfer(params),
        _ => Err(format!(
            "Action '{action}' is declared in the native-wasm surface but is not implemented."
        )),
    }
}
