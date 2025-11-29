use async_trait::async_trait;
// use futures::stream::{Stream, StreamExt, TryStreamExt};
use futures::stream::{Stream, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::future::ready;
use std::pin::Pin;

// use super::{AIProvider, StreamResult};
use super::AIProvider;

pub struct CerebrasProvider {
    api_key: String,
    model: String,
    client: Client,
}

#[derive(Debug, Serialize)]
struct CerebrasRequest {
    model: String,
    messages: Vec<CerebrasMessage>,
    stream: bool,
}

#[derive(Debug, Serialize)]
struct CerebrasMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct CerebrasStreamResponse {
    choices: Option<Vec<Choice>>,
}

#[derive(Debug, Deserialize, Clone)]
struct Choice {
    delta: Delta,
}

#[derive(Debug, Deserialize, Clone)]
struct Delta {
    content: Option<String>,
}

impl CerebrasProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            model: "llama3.1-8b".to_string(),
            client: Client::new(),
        }
    }

    pub fn with_model(mut self, model: String) -> Self {
        self.model = model;
        self
    }

    fn _build_system_prompt(&self, instruction: &str) -> String {
        format!(
            "You are a helpful writing assistant. {}. Provide only the rewritten text without explanations.",
            instruction
        )
    }
}

#[async_trait]
impl AIProvider for CerebrasProvider {
    async fn stream_completion(
        &self,
        system_prompt: String,
        instruction: String,
        context: String,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String, String>> + Send>>, String> {
        let url = "https://api.cerebras.ai/v1/chat/completions";

        let request_body = CerebrasRequest {
            model: self.model.clone(),
            messages: vec![
                CerebrasMessage {
                    role: "system".to_string(),
                    content: system_prompt,
                },
                CerebrasMessage {
                    role: "user".to_string(),
                    content: format!("{}:\n\n{}", instruction, context),
                },
            ],
            stream: true,
        };

        let response = self
            .client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Failed to send request: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("API error {}: {}", status, error_text));
        }

        let stream = response
            .bytes_stream()
            .map(|res| res.map_err(|e| e.to_string()))
            .scan(Vec::new(), move |buffer, chunk_result| {
                let chunk = match chunk_result {
                    Ok(c) => c,
                    Err(e) => return ready(Some(Err(e))),
                };
                buffer.extend_from_slice(&chunk);

                let mut lines = Vec::new();
                while let Some(pos) = buffer.iter().position(|&b| b == b'\n') {
                    let line = buffer.drain(..=pos).collect::<Vec<u8>>();
                    let line_str = String::from_utf8_lossy(&line).trim().to_string();
                    if !line_str.is_empty() {
                        lines.push(line_str);
                    }
                }

                ready(Some(Ok(lines)))
            })
            .flat_map(|result| {
                let items = match result {
                    Ok(lines) => lines.into_iter().map(Ok).collect::<Vec<_>>(),
                    Err(e) => vec![Err(e)],
                };
                futures::stream::iter(items)
            })
            .filter_map(|result| async move {
                match result {
                    Ok(line) => {
                        if line.starts_with("data: ") {
                            let json_str = line.trim_start_matches("data: ").trim();
                            if json_str == "[DONE]" {
                                return None;
                            }
                            if let Ok(response) =
                                serde_json::from_str::<CerebrasStreamResponse>(json_str)
                            {
                                if let Some(choices) = response.choices {
                                    if let Some(choice) = choices.first() {
                                        if let Some(content) = &choice.delta.content {
                                            return Some(Ok(content.clone()));
                                        }
                                    }
                                }
                            }
                        }
                        None
                    }
                    Err(e) => Some(Err(e)),
                }
            });

        Ok(Box::pin(stream))
    }

    async fn test_connection(&self) -> Result<bool, String> {
        // Send a minimal request to test the connection
        let url = "https://api.cerebras.ai/v1/chat/completions";

        let request_body = CerebrasRequest {
            model: self.model.clone(),
            messages: vec![CerebrasMessage {
                role: "user".to_string(),
                content: "Hi".to_string(),
            }],
            stream: false,
        };

        let response = self
            .client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Connection test failed: {}", e))?;

        Ok(response.status().is_success())
    }

    async fn get_embedding(&self, _text: &str) -> Result<Vec<f32>, String> {
        Err("Embeddings are not supported by Cerebras provider yet.".to_string())
    }
}
