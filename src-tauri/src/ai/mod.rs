use async_trait::async_trait;
use futures::stream::Stream;
use std::pin::Pin;

pub mod cerebras;
pub mod gemini;
pub mod openrouter;

pub type StreamResult = Result<Pin<Box<dyn Stream<Item = Result<String, String>> + Send>>, String>;

#[async_trait]
pub trait AIProvider: Send + Sync {
    /// Stream a completion from the AI provider
    async fn stream_completion(
        &self,
        system_prompt: String,
        instruction: String,
        context: String,
    ) -> StreamResult;

    /// Test if the API key is valid
    async fn test_connection(&self) -> Result<bool, String>;

    /// Generate embeddings for the given text
    async fn get_embedding(&self, text: &str) -> Result<Vec<f32>, String>;
}
