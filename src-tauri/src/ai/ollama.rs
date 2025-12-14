use async_trait::async_trait;
use futures::stream::{Stream, StreamExt};
use reqwest::Client;
use serde::Deserialize;
use serde_json::json;
use std::future::ready;
use std::pin::Pin;

use super::AIProvider;

pub struct OllamaProvider {
    host: String,
    model: String,
    client: Client,
}

#[derive(Debug, Deserialize)]
struct OllamaResponse {
    message: Option<OllamaMessage>,
    done: bool,
}

#[derive(Debug, Deserialize, Clone)]
struct OllamaMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct OllamaEmbeddingResponse {
    embedding: Vec<f32>,
}

impl OllamaProvider {
    pub fn new(host: String) -> Self {
        let host_url = if host.trim().is_empty() {
            "http://localhost:11434".to_string()
        } else {
            host.trim_end_matches('/').to_string()
        };

        Self {
            host: host_url,
            // Default model, can be overridden
            model: "llama3.2".to_string(),
            client: Client::new(),
        }
    }

    pub fn with_model(mut self, model: String) -> Self {
        self.model = model;
        self
    }
}

#[async_trait]
impl AIProvider for OllamaProvider {
    async fn stream_completion(
        &self,
        system_prompt: String,
        instruction: String,
        context: String,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String, String>> + Send>>, String> {
        let url = format!("{}/api/chat", self.host);

        let body = json!({
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": format!("{}\n\nContext:\n{}", instruction, context)
                }
            ],
            "stream": true,
            "options": {
                "num_ctx": 4096
            }
        });

        let response = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("Ollama API Error: {}", response.status()));
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
                        if let Ok(response) = serde_json::from_str::<OllamaResponse>(&line) {
                            if !response.done {
                                if let Some(msg) = response.message {
                                    return Some(Ok(msg.content));
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
        // Test connection by listing tags (models)
        let url = format!("{}/api/tags", self.host);

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Connection test failed: {}", e))?;

        if response.status().is_success() {
            Ok(true)
        } else {
            Err(format!("Ollama returned error: {}", response.status()))
        }
    }

    async fn get_embedding(&self, text: &str) -> Result<Vec<f32>, String> {
        let url = format!("{}/api/embeddings", self.host);

        // Fallback to self.model if specific embedding model isn't desired,
        // but typically embeddings require specific models.
        // For now let's try to use the current model, many LLMs can generate embeddings too.
        // Or better, let's use the current model so we don't assume nomic-embed-text exists.
        let body = json!({
            "model": self.model,
            "prompt": text
        });

        let response = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("Embedding API Error: {}", response.status()));
        }

        let embedding_response: OllamaEmbeddingResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse embedding response: {}", e))?;

        Ok(embedding_response.embedding)
    }
}
