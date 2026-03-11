use aelf_sdk::Wallet;
use serde_json::{json, Value};

use crate::contract::execute_contract_view;
use crate::util::{pick_first_string, pick_first_u128, required_string, stringify_result};
use crate::wallet::resolve_signing_wallet;

use super::transaction::send_transaction;

pub fn get_ebridge_info(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let from_chain_id = required_string(params, &["fromChainId", "from_chain_id"])?;
    let to_chain_id = required_string(params, &["toChainId", "to_chain_id"])?;
    let symbol = required_string(params, &["symbol"])?;
    let bridge_contract_address = required_string(
        params,
        &["bridgeContractAddress", "bridge_contract_address"],
    )?;

    let limit = execute_contract_view(
        &from_chain_id,
        &bridge_contract_address,
        "GetReceiptLimit",
        json!({
            "symbol": symbol,
            "targetChainId": to_chain_id,
        }),
    )?;
    let fee = execute_contract_view(
        &from_chain_id,
        &bridge_contract_address,
        "GetFeeByChainId",
        json!({
            "value": to_chain_id,
        }),
    )?;

    stringify_result(json!({
        "dailyLimit": pick_first_string(&limit, &["dailyLimit", "DailyLimit"]).unwrap_or_else(|| "0".to_string()),
        "currentLimit": pick_first_string(&limit, &["currentLimit", "CurrentLimit"]).unwrap_or_else(|| "0".to_string()),
        "fee": pick_first_string(&fee, &["value", "Value"]).unwrap_or_else(|| "0".to_string()),
    }))
}

pub fn ebridge_transfer(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let from_chain_id = required_string(params, &["fromChainId", "from_chain_id"])?;
    let to_chain_id = required_string(params, &["toChainId", "to_chain_id"])?;
    let target_address = required_string(params, &["targetAddress", "target_address"])?;
    let symbol = required_string(params, &["symbol"])?;
    let amount = required_string(params, &["amount"])?;
    let bridge_contract_address = required_string(
        params,
        &["bridgeContractAddress", "bridge_contract_address"],
    )?;
    let signer = resolve_signing_wallet(params)?;
    let result = execute_ebridge_transfer(
        &from_chain_id,
        &to_chain_id,
        &target_address,
        &symbol,
        &amount,
        &bridge_contract_address,
        &signer,
    )?;
    stringify_result(result)
}

fn execute_ebridge_transfer(
    from_chain_id: &str,
    to_chain_id: &str,
    target_address: &str,
    symbol: &str,
    amount: &str,
    bridge_contract_address: &str,
    signer: &Wallet,
) -> Result<Value, String> {
    let token_contract = crate::aelf::get_chain_info(from_chain_id)?
        .default_token
        .address;

    let allowance = execute_contract_view(
        from_chain_id,
        &token_contract,
        "GetAllowance",
        json!({
            "symbol": symbol,
            "owner": signer.address(),
            "spender": bridge_contract_address,
        }),
    )?;
    let current_allowance = pick_first_u128(&allowance, &["allowance", "Allowance"]).unwrap_or(0);
    let transfer_amount = amount
        .parse::<u128>()
        .map_err(|e| format!("Invalid eBridge amount '{amount}': {e}"))?;
    if current_allowance < transfer_amount {
        // This is a fixed approval safety buffer, not a token-decimal-aware allowance policy.
        let approve_amount = transfer_amount - current_allowance + 1_000_000u128;
        send_transaction(
            from_chain_id,
            &token_contract,
            "Approve",
            json!({
                "spender": bridge_contract_address,
                "symbol": symbol,
                "amount": approve_amount.to_string(),
            }),
            signer,
        )?;
    }

    send_transaction(
        from_chain_id,
        bridge_contract_address,
        "CreateReceipt",
        json!({
            "symbol": symbol,
            "owner": signer.address(),
            "targetAddress": target_address,
            "amount": amount,
            "targetChainId": to_chain_id,
        }),
        signer,
    )
}
