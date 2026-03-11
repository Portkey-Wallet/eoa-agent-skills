use aelf_sdk::{AElfError, Provider};
use async_trait::async_trait;
use http::Method;
use serde_json::{json, Value};

use crate::constants::HTTP_TIMEOUT_MS;
use crate::util::url_encode;

#[derive(Clone, Debug)]
pub struct HostProvider {
    base_url: String,
}

impl HostProvider {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into().trim_end_matches('/').to_string(),
        }
    }

    fn build_url(&self, path: &str, query: &[(&str, String)]) -> String {
        let mut url = format!("{}/{}", self.base_url, path.trim_start_matches('/'));
        if !query.is_empty() {
            let encoded = query
                .iter()
                .map(|(name, value)| format!("{}={}", url_encode(name), url_encode(value)))
                .collect::<Vec<_>>()
                .join("&");
            url.push('?');
            url.push_str(&encoded);
        }
        url
    }
}

pub fn request_json(method: &str, url: &str, body: Option<Value>) -> Result<Value, String> {
    let parsed = request_json_raw(method, url, body)?;
    if let Some(data) = parsed.get("data").filter(|value| !value.is_null()) {
        return Ok(data.clone());
    }
    Ok(parsed)
}

pub fn request_json_raw(method: &str, url: &str, body: Option<Value>) -> Result<Value, String> {
    let body_text = request_text(method, url, body)?;
    serde_json::from_str(&body_text).map_err(|e| format!("Failed to parse JSON response: {e}"))
}

pub fn request_text(method: &str, url: &str, body: Option<Value>) -> Result<String, String> {
    host_request_text(method, url, body, "application/json")
}

fn host_request_text(
    method: &str,
    url: &str,
    body: Option<Value>,
    accept: &str,
) -> Result<String, String> {
    let headers = json!({
        "Content-Type": "application/json",
        "Accept": accept
    });
    let request_body = if let Some(value) = body {
        Some(
            serde_json::to_vec(&value)
                .map_err(|e| format!("Failed to encode request body: {e}"))?,
        )
    } else {
        None
    };

    let response = crate::near::agent::host::http_request(
        method,
        url,
        &headers.to_string(),
        request_body.as_deref(),
        Some(HTTP_TIMEOUT_MS),
    )
    .map_err(|e| format!("HTTP request failed: {e}"))?;

    let body_text =
        String::from_utf8(response.body).map_err(|e| format!("Invalid UTF-8 response: {e}"))?;
    if response.status < 200 || response.status >= 300 {
        return Err(format!(
            "Upstream API error (HTTP {}): {}",
            response.status, body_text
        ));
    }
    Ok(body_text)
}

#[async_trait]
impl Provider for HostProvider {
    async fn request_json(
        &self,
        method: Method,
        path: &str,
        query: &[(&str, String)],
        body: Option<Value>,
    ) -> Result<Value, AElfError> {
        let url = self.build_url(path, query);
        request_json_raw(method.as_str(), &url, body)
            .map_err(|message| AElfError::request(message, Some(url)))
    }

    async fn request_text(
        &self,
        method: Method,
        path: &str,
        query: &[(&str, String)],
        body: Option<Value>,
    ) -> Result<String, AElfError> {
        let url = self.build_url(path, query);
        host_request_text(method.as_str(), &url, body, "application/json")
            .map_err(|message| AElfError::request(message, Some(url)))
    }
}

pub fn build_address_infos(address: &str, chain_id: Option<&str>) -> Value {
    let raw_address = get_aelf_address(address);
    if let Some(chain_id) = chain_id
        .map(ToString::to_string)
        .or_else(|| get_chain_id_from_address(address))
    {
        json!([{ "chainId": chain_id, "address": raw_address }])
    } else {
        json!([
            { "chainId": "AELF", "address": raw_address },
            { "chainId": "tDVV", "address": raw_address },
            { "chainId": "tDVW", "address": raw_address }
        ])
    }
}

pub fn get_aelf_address(value: &str) -> String {
    let trimmed = value.strip_prefix("ELF_").unwrap_or(value);
    trimmed.split('_').next().unwrap_or(trimmed).to_string()
}

pub fn get_chain_id_from_address(value: &str) -> Option<String> {
    let parts: Vec<&str> = value.split('_').collect();
    if parts.len() == 3 {
        Some(parts[2].to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_aelf_address_and_embedded_chain_id() {
        assert_eq!(get_aelf_address("ELF_abc123_AELF"), "abc123");
        assert_eq!(get_aelf_address("abc123"), "abc123");
        assert_eq!(
            get_chain_id_from_address("ELF_abc123_AELF"),
            Some("AELF".to_string())
        );
        assert_eq!(get_chain_id_from_address("abc123"), None);
    }

    #[test]
    fn provider_builds_query_string_urls() {
        let provider = HostProvider::new("https://example.com");
        let url = provider.build_url(
            "/api/blockChain/chainStatus",
            &[
                ("chainId", "AELF".to_string()),
                ("owner", "ELF_abc_AELF".to_string()),
            ],
        );
        assert_eq!(
            url,
            "https://example.com/api/blockChain/chainStatus?chainId=AELF&owner=ELF_abc_AELF"
        );
    }

    #[test]
    fn url_encoding_matches_expected_contract() {
        assert_eq!(crate::util::url_encode("ELF,USDT"), "ELF%2CUSDT");
        assert_eq!(crate::util::url_encode("hello world"), "hello%20world");
    }
}
