use serde_json::Value;

pub fn normalize_fee_amount(value: &Value) -> Value {
    if let Some(number) = value.as_u64() {
        return Value::Number(number.into());
    }
    if let Some(text) = value.as_str() {
        if let Ok(number) = text.parse::<u64>() {
            return Value::Number(number.into());
        }
        if let Ok(number) = text.parse::<f64>() {
            if let Some(number) = serde_json::Number::from_f64(number) {
                return Value::Number(number);
            }
        }
    }
    value.clone()
}

pub fn pick_first_i32(value: &Value, keys: &[&str]) -> Option<i32> {
    keys.iter().find_map(|key| {
        value.get(*key).and_then(|field| match field {
            Value::Number(number) => number.as_i64().and_then(|value| i32::try_from(value).ok()),
            Value::String(text) => text.parse::<i32>().ok(),
            _ => None,
        })
    })
}

pub fn pick_first_u128(value: &Value, keys: &[&str]) -> Option<u128> {
    keys.iter().find_map(|key| {
        value.get(*key).and_then(|field| match field {
            Value::Number(number) => number.as_u64().map(u128::from),
            Value::String(text) => text.parse::<u128>().ok(),
            _ => None,
        })
    })
}

pub fn pick_first_string(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        value.get(*key).and_then(|field| match field {
            Value::String(text) => Some(text.clone()),
            Value::Number(number) => Some(number.to_string()),
            _ => None,
        })
    })
}

pub fn required_string(
    params: &serde_json::Map<String, Value>,
    names: &[&str],
) -> Result<String, String> {
    optional_string(params, names).ok_or_else(|| format!("Missing required field: {}", names[0]))
}

pub fn optional_string(params: &serde_json::Map<String, Value>, names: &[&str]) -> Option<String> {
    for name in names {
        if let Some(value) = params.get(*name).and_then(Value::as_str) {
            return Some(value.to_string());
        }
    }
    None
}

pub fn optional_u64(params: &serde_json::Map<String, Value>, names: &[&str]) -> Option<u64> {
    for name in names {
        if let Some(value) = params.get(*name).and_then(Value::as_u64) {
            return Some(value);
        }
    }
    None
}

pub fn optional_bool(params: &serde_json::Map<String, Value>, names: &[&str]) -> Option<bool> {
    for name in names {
        if let Some(value) = params.get(*name).and_then(Value::as_bool) {
            return Some(value);
        }
    }
    None
}

pub fn stringify_result(value: Value) -> Result<String, String> {
    serde_json::to_string(&value).map_err(|e| format!("Failed to serialize output: {e}"))
}

pub fn decode_hex(value: &str) -> Result<Vec<u8>, String> {
    if value.len() % 2 != 0 {
        return Err("Hex string must have even length".to_string());
    }

    let mut bytes = Vec::with_capacity(value.len() / 2);
    for pair in value.as_bytes().chunks_exact(2) {
        let high = hex_nibble(pair[0]).ok_or_else(|| "Invalid hex string".to_string())?;
        let low = hex_nibble(pair[1]).ok_or_else(|| "Invalid hex string".to_string())?;
        bytes.push((high << 4) | low);
    }
    Ok(bytes)
}

pub fn encode_hex(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push(char::from(b"0123456789abcdef"[(byte >> 4) as usize]));
        output.push(char::from(b"0123456789abcdef"[(byte & 0x0f) as usize]));
    }
    output
}

fn hex_nibble(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

pub fn url_encode(value: &str) -> String {
    let mut out = String::with_capacity(value.len() * 2);
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char);
            }
            b' ' => out.push_str("%20"),
            _ => {
                out.push('%');
                out.push(char::from(b"0123456789ABCDEF"[(byte >> 4) as usize]));
                out.push(char::from(b"0123456789ABCDEF"[(byte & 0xf) as usize]));
            }
        }
    }
    out
}
