//! Portkey EOA native WASM tool for IronClaw.
//!
//! This sidecar intentionally leaves the existing Bun/MCP runtime untouched.
//! It provides an IronClaw-native execution path with isolated workspace state.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "wit/tool.wit",
});

mod actions;
mod aelf;
mod constants;
mod contract;
mod http;
mod types;
mod util;
mod wallet;
mod workspace;

use constants::{ACTIONS, SCHEMA};
use util::required_string;

struct PortkeyEoaTool;

impl exports::near::agent::tool::Guest for PortkeyEoaTool {
    fn execute(req: exports::near::agent::tool::Request) -> exports::near::agent::tool::Response {
        match execute_inner(&req.params) {
            Ok(output) => exports::near::agent::tool::Response {
                output: Some(output),
                error: None,
            },
            Err(error) => exports::near::agent::tool::Response {
                output: None,
                error: Some(error),
            },
        }
    }

    fn schema() -> String {
        SCHEMA.to_string()
    }

    fn description() -> String {
        "Portkey EOA native IronClaw tool. Provides experimental native-wasm support \
         for EOA wallet routing with isolated workspace state under portkey-eoa/. \
         The full 23-action EOA surface is implemented directly in isolated native state, \
         including wallet lifecycle, asset queries, contract calls, transfers, approvals, \
         fee estimation, and eBridge flows. The native runtime now uses aelf-web3.rust as its \
         shared chain foundation and stores wallets as JS-compatible keystores. Wallet lifecycle \
         actions keep JS/MCP-compatible public response shapes and add keystore-backed \
         walletExport payloads for native recovery. Sensitive wallet fields returned by \
         compatible actions should not be re-broadcast in conversational summaries."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let input: serde_json::Value =
        serde_json::from_str(params).map_err(|e| format!("Invalid parameters: {e}"))?;
    let object = input
        .as_object()
        .ok_or("Parameters must be a JSON object".to_string())?;
    let action = required_string(object, &["action"])?;

    if !ACTIONS.contains(&action.as_str()) {
        return Err(format!("Unsupported EOA native action: {action}"));
    }

    near::agent::host::log(
        near::agent::host::LogLevel::Info,
        &format!("Executing Portkey EOA native action: {action}"),
    );

    actions::execute(&action, object)
}

export!(PortkeyEoaTool);

#[cfg(test)]
mod tests {
    use super::*;
    use crate::exports::near::agent::tool::Guest;

    #[test]
    fn execute_requires_object_input() {
        let error = execute_inner("[]").expect_err("error");
        assert!(error.contains("JSON object"));
    }

    #[test]
    fn schema_contains_wallet_export_contract() {
        let schema = PortkeyEoaTool::schema();
        assert!(schema.contains("walletExport"));
        assert!(schema.contains("password"));
    }

    #[test]
    fn description_mentions_encrypted_exports() {
        let description = PortkeyEoaTool::description();
        let serialized =
            crate::util::stringify_result(serde_json::json!({ "description": description }))
                .expect("json");
        assert!(serialized.contains("walletExport"));
    }
}
