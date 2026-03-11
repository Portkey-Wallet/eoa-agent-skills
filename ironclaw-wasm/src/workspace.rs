use serde_json::{json, Value};

pub fn memory_read(path: &str) -> Result<Option<String>, String> {
    let params = json!({ "path": path });
    let raw = crate::near::agent::host::tool_invoke("memory_read", &params.to_string())
        .map_err(|e| format!("memory_read failed: {e}"))?;
    let parsed: Value =
        serde_json::from_str(&raw).map_err(|e| format!("Invalid memory_read response: {e}"))?;
    Ok(parsed
        .get("content")
        .and_then(Value::as_str)
        .map(ToString::to_string))
}

pub fn memory_write(path: &str, content: &str, append: bool) -> Result<(), String> {
    let params = json!({
        "content": content,
        "target": path,
        "append": append
    });
    crate::near::agent::host::tool_invoke("memory_write", &params.to_string())
        .map_err(|e| format!("memory_write failed: {e}"))?;
    Ok(())
}
