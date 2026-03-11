use aelf_sdk::{address_to_pb, hash_to_pb, pb_to_address, Wallet};
use prost::Message;
use prost_reflect::{
    DeserializeOptions, DynamicMessage, FieldDescriptor, Kind, MessageDescriptor, MethodDescriptor,
};
use serde::de::IntoDeserializer;
use serde_json::{json, Value};

use crate::aelf::sdk_client_for_chain;
use crate::util::{decode_hex, encode_hex};

const READONLY_VIEW_PRIVATE_KEY: &str =
    "0000000000000000000000000000000000000000000000000000000000000001";

pub struct PreparedContractInvocation {
    pub client: aelf_sdk::AElfClient,
    pub encoded_params: Vec<u8>,
    pub contract_address: String,
    pub method_name: String,
}

pub fn execute_contract_view(
    chain_id: &str,
    contract_address: &str,
    method_name: &str,
    method_params: Value,
) -> Result<Value, String> {
    let client = sdk_client_for_chain(chain_id)?;
    let wallet = readonly_wallet()?;
    let contract = pollster::block_on(client.contract_at(contract_address.to_string(), wallet))
        .map_err(|e| format!("Failed to load dynamic contract: {e}"))?;
    pollster::block_on(contract.call_json(method_name, method_params))
        .map_err(|e| format!("Failed to execute contract view: {e}"))
}

pub fn prepare_contract_invocation(
    chain_id: &str,
    contract_address: &str,
    method_name: &str,
    method_params: Value,
) -> Result<PreparedContractInvocation, String> {
    let client = sdk_client_for_chain(chain_id)?;
    let contract =
        pollster::block_on(client.contract_at(contract_address.to_string(), readonly_wallet()?))
            .map_err(|e| format!("Failed to load dynamic contract: {e}"))?;
    let method = contract
        .method(method_name)
        .map_err(|e| format!("Failed to resolve dynamic contract method: {e}"))?;
    let encoded_params = encode_contract_input(method.descriptor(), method_params)?;

    Ok(PreparedContractInvocation {
        client,
        encoded_params,
        contract_address: contract_address.to_string(),
        method_name: method_name.to_string(),
    })
}

pub fn readonly_wallet() -> Result<Wallet, String> {
    Wallet::from_private_key(READONLY_VIEW_PRIVATE_KEY)
        .map_err(|e| format!("Failed to construct readonly wallet: {e}"))
}

fn encode_contract_input(method: &MethodDescriptor, params: Value) -> Result<Vec<u8>, String> {
    let input_descriptor = method.input();
    let normalized = normalize_message_json_input(
        if params.is_null() { json!({}) } else { params },
        &input_descriptor,
    )?;
    let dynamic = DynamicMessage::deserialize_with_options(
        input_descriptor,
        normalized.into_deserializer(),
        &DeserializeOptions::new().deny_unknown_fields(false),
    )
    .map_err(|e| {
        format!(
            "Failed to encode protobuf params for {}: {e}",
            method.name()
        )
    })?;
    Ok(dynamic.encode_to_vec())
}

fn normalize_message_json_input(
    value: Value,
    descriptor: &MessageDescriptor,
) -> Result<Value, String> {
    match descriptor.full_name() {
        "aelf.Address" => encode_address_wrapper(value),
        "aelf.Hash" => encode_hash_wrapper(value),
        _ => match value {
            Value::Object(mut object) => {
                for field in descriptor.fields() {
                    let json_name = field.json_name().to_string();
                    let existing = object
                        .remove(&json_name)
                        .or_else(|| object.remove(field.name()));
                    if let Some(field_value) = existing {
                        object.insert(json_name, normalize_field_json_input(field_value, &field)?);
                    }
                }
                Ok(Value::Object(object))
            }
            other => Ok(other),
        },
    }
}

fn normalize_field_json_input(value: Value, field: &FieldDescriptor) -> Result<Value, String> {
    if field.is_list() {
        let items = value
            .as_array()
            .ok_or_else(|| format!("Field '{}' must be an array", field.name()))?;
        return items
            .iter()
            .cloned()
            .map(|item| normalize_kind_json_input(item, &field.kind()))
            .collect::<Result<Vec<_>, _>>()
            .map(Value::Array);
    }

    if field.is_map() {
        let object = value
            .as_object()
            .ok_or_else(|| format!("Field '{}' must be an object map", field.name()))?;
        let value_kind = match field.kind() {
            Kind::Message(entry) if entry.is_map_entry() => entry.map_entry_value_field().kind(),
            _ => return Ok(value),
        };
        let mut normalized = serde_json::Map::new();
        for (key, item) in object {
            normalized.insert(
                key.clone(),
                normalize_kind_json_input(item.clone(), &value_kind)?,
            );
        }
        return Ok(Value::Object(normalized));
    }

    normalize_kind_json_input(value, &field.kind())
}

fn normalize_kind_json_input(value: Value, kind: &Kind) -> Result<Value, String> {
    match kind {
        Kind::Message(message) => normalize_message_json_input(value, message),
        _ => Ok(value),
    }
}

fn encode_address_wrapper(value: Value) -> Result<Value, String> {
    match value {
        Value::String(address) => {
            let encoded = address_to_pb(&address)
                .map_err(|e| format!("Failed to encode address wrapper: {e}"))?;
            serde_json::to_value(encoded)
                .map_err(|e| format!("Failed to encode address wrapper: {e}"))
        }
        other => Ok(other),
    }
}

fn encode_hash_wrapper(value: Value) -> Result<Value, String> {
    match value {
        Value::String(hash) => {
            let bytes = decode_hex(hash.trim().trim_start_matches("0x"))?;
            serde_json::to_value(hash_to_pb(bytes))
                .map_err(|e| format!("Failed to encode hash wrapper: {e}"))
        }
        other => Ok(other),
    }
}

#[allow(dead_code)]
fn decode_address_wrapper(value: Value) -> Result<Value, String> {
    match value {
        Value::Object(_) => {
            let address: aelf_sdk::proto::aelf::Address = serde_json::from_value(value)
                .map_err(|e| format!("Failed to decode address: {e}"))?;
            Ok(Value::String(pb_to_address(&address)))
        }
        other => Ok(other),
    }
}

#[allow(dead_code)]
fn decode_hash_wrapper(value: Value) -> Result<Value, String> {
    match value {
        Value::Object(_) => {
            let hash: aelf_sdk::proto::aelf::Hash =
                serde_json::from_value(value).map_err(|e| format!("Failed to decode hash: {e}"))?;
            Ok(Value::String(encode_hex(&hash.value)))
        }
        other => Ok(other),
    }
}
