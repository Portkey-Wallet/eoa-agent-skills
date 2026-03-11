use aelf_sdk::Wallet;
use serde_json::{json, Value};

use crate::aelf::{
    build_signed_transaction_hex, chain_id_to_number, get_chain_info, send_signed_transaction,
};
use crate::contract::{execute_contract_view, prepare_contract_invocation};
use crate::http::get_chain_id_from_address;
use crate::util::{pick_first_i32, required_string, stringify_result};
use crate::wallet::resolve_signing_wallet;

pub fn transfer(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let chain_id = required_string(params, &["chainId", "chain_id"])?;
    let to = required_string(params, &["to"])?;
    let symbol = required_string(params, &["symbol"])?;
    let amount = required_string(params, &["amount"])?;
    let memo = crate::util::optional_string(params, &["memo"]).unwrap_or_default();
    let signer = resolve_signing_wallet(params)?;
    let token_contract = get_chain_info(&chain_id)?.default_token.address;
    let result = send_transaction(
        &chain_id,
        &token_contract,
        "Transfer",
        json!({
            "symbol": symbol,
            "to": to,
            "amount": amount,
            "memo": memo,
        }),
        &signer,
    )?;
    stringify_result(result)
}

pub fn cross_chain_transfer(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let from_chain_id = required_string(params, &["fromChainId", "from_chain_id"])?;
    let to = required_string(params, &["to"])?;
    let symbol = required_string(params, &["symbol"])?;
    let amount = required_string(params, &["amount"])?;
    let memo = crate::util::optional_string(params, &["memo"]).unwrap_or_default();
    let signer = resolve_signing_wallet(params)?;
    let token_contract = get_chain_info(&from_chain_id)?.default_token.address;
    let token_info = execute_contract_view(
        &from_chain_id,
        &token_contract,
        "GetTokenInfo",
        json!({ "symbol": symbol }),
    )?;
    let issue_chain_id = pick_first_i32(&token_info, &["issueChainId", "IssueChainId"])
        .unwrap_or_else(|| chain_id_to_number(&from_chain_id).unwrap_or_default());
    let to_chain_id = get_chain_id_from_address(&to).unwrap_or_else(|| from_chain_id.clone());
    let result = send_transaction(
        &from_chain_id,
        &token_contract,
        "CrossChainTransfer",
        json!({
            "issueChainId": issue_chain_id,
            "toChainId": chain_id_to_number(&to_chain_id)?,
            "symbol": symbol,
            "to": to,
            "amount": amount,
            "memo": memo,
        }),
        &signer,
    )?;
    stringify_result(result)
}

pub fn approve(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let chain_id = required_string(params, &["chainId", "chain_id"])?;
    let spender = required_string(params, &["spender"])?;
    let symbol = required_string(params, &["symbol"])?;
    let amount = required_string(params, &["amount"])?;
    let signer = resolve_signing_wallet(params)?;
    let token_contract = get_chain_info(&chain_id)?.default_token.address;
    let result = send_transaction(
        &chain_id,
        &token_contract,
        "Approve",
        json!({
            "spender": spender,
            "symbol": symbol,
            "amount": amount,
        }),
        &signer,
    )?;
    stringify_result(result)
}

pub fn call_send_method(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let chain_id = required_string(params, &["chainId", "chain_id"])?;
    let contract_address = required_string(params, &["contractAddress", "contract_address"])?;
    let method_name = required_string(params, &["methodName", "method_name"])?;
    let signer = resolve_signing_wallet(params)?;
    let method_params = params.get("params").cloned().unwrap_or_else(|| json!({}));
    let result = send_transaction(
        &chain_id,
        &contract_address,
        &method_name,
        method_params,
        &signer,
    )?;
    stringify_result(result)
}

pub fn send_transaction(
    chain_id: &str,
    contract_address: &str,
    method_name: &str,
    method_params: Value,
    signer: &Wallet,
) -> Result<Value, String> {
    let prepared =
        prepare_contract_invocation(chain_id, contract_address, method_name, method_params)?;
    let raw_transaction = build_signed_transaction_hex(
        &prepared.client,
        signer,
        &prepared.contract_address,
        &prepared.method_name,
        prepared.encoded_params,
    )?;
    send_signed_transaction(&prepared.client, &raw_transaction)
}
