use aelf_sdk::{base58_to_chain_id, AElfClient, Wallet};
use prost::Message;
use serde_json::{json, Value};

use crate::constants::{API_BASE, CHAINS_INFO_PATH};
use crate::http::{request_json, HostProvider};
use crate::types::{ChainIndexResult, ChainInfoItem};
use crate::util::encode_hex;

#[derive(Clone, Debug, PartialEq, Eq)]
struct RawBytesMessage(Vec<u8>);

impl RawBytesMessage {
    fn new(bytes: Vec<u8>) -> Self {
        Self(bytes)
    }
}

impl Message for RawBytesMessage {
    fn encode_raw(&self, buf: &mut impl prost::bytes::BufMut) {
        buf.put_slice(&self.0);
    }

    fn merge_field(
        &mut self,
        _tag: u32,
        _wire_type: prost::encoding::WireType,
        _buf: &mut impl prost::bytes::Buf,
        _ctx: prost::encoding::DecodeContext,
    ) -> Result<(), prost::DecodeError> {
        unreachable!("RawBytesMessage is write-only")
    }

    fn encoded_len(&self) -> usize {
        self.0.len()
    }

    fn clear(&mut self) {
        self.0.clear();
    }
}

pub fn get_chain_info(chain_id: &str) -> Result<ChainInfoItem, String> {
    let index: ChainIndexResult = serde_json::from_value(request_json(
        "GET",
        &format!("{API_BASE}{CHAINS_INFO_PATH}"),
        None,
    )?)
    .map_err(|e| format!("Failed to parse chain index: {e}"))?;
    index
        .items
        .into_iter()
        .find(|item| item.chain_id == chain_id)
        .ok_or_else(|| format!("Chain '{chain_id}' not found in Portkey chain index"))
}

pub fn sdk_client_for_chain(chain_id: &str) -> Result<AElfClient, String> {
    let chain = get_chain_info(chain_id)?;
    sdk_client_for_rpc(&chain.end_point)
}

pub fn sdk_client_for_rpc(rpc_url: &str) -> Result<AElfClient, String> {
    AElfClient::with_provider(HostProvider::new(rpc_url))
        .map_err(|e| format!("Failed to create AElf SDK client: {e}"))
}

pub fn chain_id_to_number(chain_id: &str) -> Result<i32, String> {
    base58_to_chain_id(chain_id).map_err(|e| format!("Invalid chain id '{chain_id}': {e}"))
}

pub fn build_signed_transaction_hex(
    client: &AElfClient,
    signer: &Wallet,
    contract_address: &str,
    method_name: &str,
    encoded_params: Vec<u8>,
) -> Result<String, String> {
    let transaction = pollster::block_on(
        client
            .transaction_builder()
            .with_wallet(signer.clone())
            .with_contract(contract_address.to_string())
            .with_method(method_name.to_string())
            .with_message(&RawBytesMessage::new(encoded_params))
            .build_signed(),
    )
    .map_err(|e| format!("Failed to build signed transaction: {e}"))?;
    Ok(encode_hex(&transaction.encode_to_vec()))
}

pub fn send_signed_transaction(
    client: &AElfClient,
    raw_transaction: &str,
) -> Result<Value, String> {
    let broadcast = pollster::block_on(client.tx().send_transaction(raw_transaction))
        .map_err(|e| format!("Failed to send transaction: {e}"))?;
    let transaction_id = broadcast.transaction_id;
    let result = pollster::block_on(client.tx().get_transaction_result(&transaction_id));

    match result {
        Ok(result) => {
            if result.status.eq_ignore_ascii_case("FAILED") {
                return Err(if result.error.is_empty() {
                    format!("Transaction {transaction_id} failed")
                } else {
                    result.error
                });
            }

            let mut payload = json!({
                "transactionId": transaction_id,
                "status": result.status,
            });
            if let Some(object) = payload.as_object_mut() {
                if let Some(block_hash) =
                    (!result.block_hash.is_empty()).then_some(result.block_hash)
                {
                    object.insert("blockHash".to_string(), Value::String(block_hash));
                }
                if result.block_number > 0 {
                    object.insert(
                        "blockNumber".to_string(),
                        Value::Number(result.block_number.into()),
                    );
                }
            }
            Ok(payload)
        }
        Err(_) => Ok(json!({
            "transactionId": transaction_id,
            "status": "PENDING",
        })),
    }
}
