use aelf_sdk::dto::CalculateTransactionFeeInput;
use serde_json::{json, Value};

use crate::aelf::build_signed_transaction_hex;
use crate::constants::{
    ACTIVITY_IMAGE_HEIGHT, ACTIVITY_IMAGE_WIDTH, API_BASE, QUERY_IMAGE_HEIGHT, QUERY_IMAGE_WIDTH,
};
use crate::contract::{execute_contract_view, prepare_contract_invocation};
use crate::http::{build_address_infos, request_json};
use crate::util::{
    normalize_fee_amount, optional_string, optional_u64, pick_first_string, required_string,
    stringify_result, url_encode,
};
use crate::wallet::resolve_signing_wallet;

pub fn get_token_list(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let address = required_string(params, &["address"])?;
    let chain_id = optional_string(params, &["chainId", "chain_id"]);
    let skip_count = optional_u64(params, &["skipCount", "skip_count"]).unwrap_or(0);
    let max_result_count =
        optional_u64(params, &["maxResultCount", "max_result_count"]).unwrap_or(100);
    let address_infos = build_address_infos(&address, chain_id.as_deref());

    let body = json!({
        "addressInfos": address_infos,
        "skipCount": skip_count,
        "maxResultCount": max_result_count,
    });

    let data = request_json(
        "POST",
        &format!("{API_BASE}/api/app/user/assets/token"),
        Some(body),
    )?;
    stringify_result(normalize_token_list_response(data))
}

pub fn get_token_balance(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let address = required_string(params, &["address"])?;
    let symbol = required_string(params, &["symbol"])?;
    let chain_id = required_string(params, &["chainId", "chain_id"])?;
    let url = format!(
        "{API_BASE}/api/app/user/assets/tokenBalance?symbol={}&chainId={}&address={}",
        url_encode(&symbol),
        url_encode(&chain_id),
        url_encode(&address)
    );
    let data = request_json("GET", &url, None)?;
    stringify_result(normalize_token_prices_response(data))
}

pub fn get_token_prices(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let symbols = params
        .get("symbols")
        .and_then(Value::as_array)
        .ok_or("symbols must be an array".to_string())?;
    let joined = symbols
        .iter()
        .filter_map(Value::as_str)
        .collect::<Vec<_>>()
        .join(",");
    if joined.is_empty() {
        return Err("symbols must not be empty".to_string());
    }

    let url = format!(
        "{API_BASE}/api/app/tokens/prices?symbols={}",
        url_encode(&joined)
    );
    let data = request_json("GET", &url, None)?;
    stringify_result(data)
}

pub fn get_nft_collections(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let address = required_string(params, &["address"])?;
    let skip_count = optional_u64(params, &["skipCount", "skip_count"]).unwrap_or(0);
    let max_result_count =
        optional_u64(params, &["maxResultCount", "max_result_count"]).unwrap_or(50);
    let address_infos = build_address_infos(&address, None);

    let body = json!({
        "addressInfos": address_infos,
        "skipCount": skip_count,
        "maxResultCount": max_result_count,
        "width": QUERY_IMAGE_WIDTH,
        "height": QUERY_IMAGE_HEIGHT,
    });

    let data = request_json(
        "POST",
        &format!("{API_BASE}/api/app/user/assets/nftCollections"),
        Some(body),
    )?;
    stringify_result(normalize_nft_collection_response(data))
}

pub fn get_nft_items(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let address = required_string(params, &["address"])?;
    let symbol = required_string(params, &["symbol"])?;
    let skip_count = optional_u64(params, &["skipCount", "skip_count"]).unwrap_or(0);
    let max_result_count =
        optional_u64(params, &["maxResultCount", "max_result_count"]).unwrap_or(50);
    let address_infos = build_address_infos(&address, None);

    let body = json!({
        "addressInfos": address_infos,
        "symbol": symbol,
        "skipCount": skip_count,
        "maxResultCount": max_result_count,
        "width": QUERY_IMAGE_WIDTH,
        "height": QUERY_IMAGE_HEIGHT,
    });

    let data = request_json(
        "POST",
        &format!("{API_BASE}/api/app/user/assets/nftItems"),
        Some(body),
    )?;
    stringify_result(normalize_nft_item_response(data))
}

pub fn get_transaction_history(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let address = required_string(params, &["address"])?;
    let chain_id = optional_string(params, &["chainId", "chain_id"]);
    let symbol = optional_string(params, &["symbol"]);
    let skip_count = optional_u64(params, &["skipCount", "skip_count"]).unwrap_or(0);
    let max_result_count =
        optional_u64(params, &["maxResultCount", "max_result_count"]).unwrap_or(20);
    let address_infos = build_address_infos(&address, chain_id.as_deref());

    let body = json!({
        "addressInfos": address_infos,
        "chainId": chain_id.unwrap_or_default(),
        "symbol": symbol.unwrap_or_default(),
        "skipCount": skip_count,
        "maxResultCount": max_result_count,
        "width": ACTIVITY_IMAGE_WIDTH,
        "height": ACTIVITY_IMAGE_HEIGHT,
    });

    let data = request_json(
        "POST",
        &format!("{API_BASE}/api/app/user/activities/activities"),
        Some(body),
    )?;
    stringify_result(normalize_transaction_history_response(data))
}

pub fn get_transaction_detail(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let transaction_id = required_string(params, &["transactionId", "transaction_id"])?;
    let block_hash = required_string(params, &["blockHash", "block_hash"])?;
    let chain_id = required_string(params, &["chainId", "chain_id"])?;
    let address = required_string(params, &["address"])?;
    let address_infos = build_address_infos(&address, Some(&chain_id));

    let body = json!({
        "transactionId": transaction_id,
        "blockHash": block_hash,
        "addressInfos": address_infos,
        "chainId": chain_id,
        "width": ACTIVITY_IMAGE_WIDTH,
        "height": ACTIVITY_IMAGE_HEIGHT,
    });

    let data = request_json(
        "POST",
        &format!("{API_BASE}/api/app/user/activities/activity"),
        Some(body),
    )?;
    stringify_result(normalize_transaction_detail_response(data)?)
}

pub fn call_view_method(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let chain_id = required_string(params, &["chainId", "chain_id"])?;
    let contract_address = required_string(params, &["contractAddress", "contract_address"])?;
    let method_name = required_string(params, &["methodName", "method_name"])?;
    let method_params = params.get("params").cloned().unwrap_or_else(|| json!({}));
    let data = execute_contract_view(&chain_id, &contract_address, &method_name, method_params)?;
    stringify_result(data)
}

pub fn estimate_fee(params: &serde_json::Map<String, Value>) -> Result<String, String> {
    let chain_id = required_string(params, &["chainId", "chain_id"])?;
    let contract_address = required_string(params, &["contractAddress", "contract_address"])?;
    let method_name = required_string(params, &["methodName", "method_name"])?;
    let method_params = params.get("params").cloned().unwrap_or_else(|| json!({}));
    let signer = resolve_signing_wallet(params)?;
    let prepared =
        prepare_contract_invocation(&chain_id, &contract_address, &method_name, method_params)?;
    let raw_transaction = build_signed_transaction_hex(
        &prepared.client,
        &signer,
        &prepared.contract_address,
        &prepared.method_name,
        prepared.encoded_params,
    )?;
    let fee_response = pollster::block_on(
        prepared
            .client
            .tx()
            .calculate_transaction_fee(&CalculateTransactionFeeInput { raw_transaction }),
    )
    .map_err(|e| format!("Failed to calculate transaction fee: {e}"))?;
    if !fee_response.success {
        return Err("Failed to calculate transaction fee".to_string());
    }

    let mut fee = serde_json::Map::new();
    for (symbol, amount) in fee_response.transaction_fee {
        fee.insert(symbol, normalize_fee_amount(&json!(amount)));
    }

    stringify_result(json!({ "fee": fee }))
}

fn normalize_token_list_response(data: Value) -> Value {
    json!({
        "data": extract_data_array(&data),
        "totalRecordCount": extract_u64(&data, "totalRecordCount"),
        "totalBalanceInUsd": pick_first_string(&data, &["totalBalanceInUsd"]).unwrap_or_else(|| "0".to_string()),
    })
}

fn normalize_token_prices_response(data: Value) -> Value {
    if let Some(items) = data.get("items").and_then(Value::as_array) {
        return Value::Array(items.clone());
    }
    if let Some(items) = data.as_array() {
        return Value::Array(items.clone());
    }
    Value::Array(Vec::new())
}

fn normalize_nft_collection_response(data: Value) -> Value {
    json!({
        "data": extract_data_array(&data),
        "totalRecordCount": extract_u64(&data, "totalRecordCount"),
    })
}

fn normalize_nft_item_response(data: Value) -> Value {
    json!({
        "data": extract_data_array(&data),
        "totalRecordCount": extract_u64(&data, "totalRecordCount"),
    })
}

fn normalize_transaction_history_response(data: Value) -> Value {
    let mut response = serde_json::Map::from_iter([
        ("data".to_string(), Value::Array(extract_data_array(&data))),
        (
            "totalRecordCount".to_string(),
            Value::Number(extract_u64(&data, "totalRecordCount").into()),
        ),
    ]);
    if let Some(has_next_page) = data.get("hasNextPage").cloned() {
        response.insert("hasNextPage".to_string(), has_next_page);
    }
    Value::Object(response)
}

fn normalize_transaction_detail_response(data: Value) -> Result<Value, String> {
    if data.is_null() {
        return Err("Transaction not found".to_string());
    }

    if data.get("transactionId").is_some() || data.get("blockHash").is_some() {
        return Ok(data);
    }

    if let Some(item) = data.get("data").filter(|value| value.is_object()) {
        return Ok(item.clone());
    }

    Ok(data)
}

fn extract_data_array(data: &Value) -> Vec<Value> {
    if let Some(items) = data.get("data").and_then(Value::as_array) {
        return items.clone();
    }
    if let Some(items) = data.as_array() {
        return items.clone();
    }
    Vec::new()
}

fn extract_u64(data: &Value, key: &str) -> u64 {
    data.get(key)
        .and_then(|value| match value {
            Value::Number(number) => number.as_u64(),
            Value::String(text) => text.parse::<u64>().ok(),
            _ => None,
        })
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_token_list_shape_to_match_js_contract() {
        let normalized = normalize_token_list_response(json!({
            "data": [{ "symbol": "ELF" }],
            "totalRecordCount": 2,
            "totalBalanceInUsd": "12.3",
        }));
        assert_eq!(
            normalized,
            json!({
                "data": [{ "symbol": "ELF" }],
                "totalRecordCount": 2,
                "totalBalanceInUsd": "12.3",
            })
        );
    }

    #[test]
    fn normalizes_prices_to_plain_array() {
        let normalized = normalize_token_prices_response(json!({
            "items": [{ "symbol": "ELF", "priceInUsd": 0.2 }]
        }));
        assert_eq!(normalized, json!([{ "symbol": "ELF", "priceInUsd": 0.2 }]));
    }

    #[test]
    fn normalizes_transaction_history_shape() {
        let normalized = normalize_transaction_history_response(json!({
            "data": [{ "transactionId": "0x1" }],
            "totalRecordCount": "1",
            "hasNextPage": true,
        }));
        assert_eq!(
            normalized,
            json!({
                "data": [{ "transactionId": "0x1" }],
                "totalRecordCount": 1,
                "hasNextPage": true,
            })
        );
    }

    #[test]
    fn transaction_detail_requires_non_null_payload() {
        let error = normalize_transaction_detail_response(Value::Null).expect_err("error");
        assert!(error.contains("Transaction not found"));
    }
}
