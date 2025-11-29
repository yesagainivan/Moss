use async_trait::async_trait;
use futures::stream::{Stream, StreamExt};
use reqwest::Client;
// use serde::{Deserialize, Serialize};
use serde::Deserialize;
use serde_json::json;
use std::future::ready;
use std::pin::Pin;

// use super::{AIProvider, StreamResult};
use super::AIProvider;

pub struct GeminiProvider {
    api_key: String,
    model: String,
    client: Client,
}

// #[derive(Debug, Serialize)]
// struct GeminiRequest {
//     contents: Vec<GeminiContent>,
// }

// #[derive(Debug, Serialize)]
// struct GeminiContent {
//     parts: Vec<GeminiPart>,
// }

// #[derive(Debug, Serialize)]
// struct GeminiPart {
//     text: String,
// }

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(Debug, Deserialize, Clone)]
struct GeminiCandidate {
    content: GeminiResponseContent,
}

#[derive(Debug, Deserialize, Clone)]
struct GeminiResponseContent {
    parts: Vec<GeminiResponsePart>,
}

#[derive(Debug, Deserialize, Clone)]
struct GeminiResponsePart {
    text: String,
}

impl GeminiProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            model: "gemini-2.5-flash".to_string(),
            client: Client::new(),
        }
    }

    pub fn with_model(mut self, model: String) -> Self {
        self.model = model;
        self
    }
}

#[async_trait]
impl AIProvider for GeminiProvider {
    async fn stream_completion(
        &self,
        system_prompt: String,
        instruction: String,
        context: String,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String, String>> + Send>>, String> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?key={}&alt=sse",
            self.model, self.api_key
        );

        let prompt = format!(
            "{}\n\n{}:\n\n{}\n\nPlease provide the rewritten text without any explanation or additional commentary.",
            system_prompt, instruction, context
        );

        let body = json!({
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        });

        let response = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("API Error: {}", response.status()));
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
                            if let Ok(response) = serde_json::from_str::<GeminiResponse>(json_str) {
                                if let Some(candidates) = response.candidates {
                                    if let Some(candidate) = candidates.first() {
                                        if let Some(part) = candidate.content.parts.first() {
                                            return Some(Ok(part.text.clone()));
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
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}?key={}",
            self.model, self.api_key
        );

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Connection test failed: {}", e))?;

        Ok(response.status().is_success())
    }

    async fn get_embedding(&self, text: &str) -> Result<Vec<f32>, String> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={}",
            self.api_key
        );

        let body = json!({
            "content": {
                "parts": [{
                    "text": text
                }]
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
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Embedding API Error: {}", error_text));
        }

        let embedding_response: GeminiEmbeddingResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse embedding response: {}", e))?;

        Ok(embedding_response.embedding.values)
    }
}

#[derive(Debug, Deserialize)]
struct GeminiEmbeddingResponse {
    embedding: GeminiEmbeddingValues,
}

#[derive(Debug, Deserialize)]
struct GeminiEmbeddingValues {
    values: Vec<f32>,
}
