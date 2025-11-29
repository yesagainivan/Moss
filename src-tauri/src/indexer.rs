use crate::ai::gemini::GeminiProvider;
use crate::ai::AIProvider;
use crate::vector_store::{DocumentChunk, VectorStore};
use futures::stream::{self, StreamExt};
use std::path::{Path, PathBuf};
use uuid::Uuid;

const CHUNK_SIZE: usize = 1000; // Characters per chunk
const VECTOR_STORE_PATH: &str = ".moss/vector_store.db";
const CONCURRENCY_LIMIT: usize = 10;

pub async fn index_vault(vault_path: &Path, api_key: &str) -> Result<(), String> {
    // Open SQLite store
    let store_path = vault_path.join(VECTOR_STORE_PATH);
    let mut store = VectorStore::open(&store_path)?;

    // Clear existing data (full re-index strategy for now)
    // In a future optimization, we could do incremental updates by checking file mtimes
    store.clear()?;

    // Create embedding provider
    let provider = GeminiProvider::new(api_key.to_string());

    // Collect all files first (to avoid holding open directory handles)
    let files = collect_files(vault_path).await?;

    // Process files concurrently
    let results = stream::iter(files)
        .map(|path| {
            let provider = &provider;
            let vault_path = vault_path.to_path_buf(); // Clone for closure
            async move { process_file(&path, &vault_path, provider).await }
        })
        .buffer_unordered(CONCURRENCY_LIMIT)
        .collect::<Vec<Result<Vec<DocumentChunk>, String>>>()
        .await;

    // Aggregate results and batch insert
    for result in results {
        match result {
            Ok(chunks) => {
                if !chunks.is_empty() {
                    store.add_batch(chunks)?;
                }
            }
            Err(e) => eprintln!("Failed to index file: {}", e),
        }
    }

    Ok(())
}

// Recursive async file collector
async fn collect_files(dir: &Path) -> Result<Vec<PathBuf>, String> {
    let mut files = Vec::new();
    let mut entries = tokio::fs::read_dir(dir).await.map_err(|e| e.to_string())?;

    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let path = entry.path();

        // Skip hidden files/dirs
        if let Some(name) = path.file_name() {
            if name.to_string_lossy().starts_with('.') {
                continue;
            }
        }

        if path.is_dir() {
            let sub_files = Box::pin(collect_files(&path)).await?;
            files.extend(sub_files);
        } else if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext == "md" {
                    files.push(path);
                }
            }
        }
    }
    Ok(files)
}

async fn process_file(
    file_path: &Path,
    vault_path: &Path,
    provider: &GeminiProvider,
) -> Result<Vec<DocumentChunk>, String> {
    let content = tokio::fs::read_to_string(file_path).await.map_err(|_| {
        format!(
            "Failed to read file: {}",
            file_path.file_name().unwrap_or_default().to_string_lossy()
        )
    })?;

    // Calculate relative path for storage
    let relative_path = file_path
        .strip_prefix(vault_path)
        .map_err(|_| "Failed to calculate relative path".to_string())?
        .to_string_lossy()
        .to_string();

    // Split content into chunks
    let chunks_text = chunk_text(&content, CHUNK_SIZE);
    let mut chunks = Vec::new();

    for chunk_text in chunks_text {
        // Skip very small chunks
        if chunk_text.trim().len() < 50 {
            continue;
        }

        // Generate embedding
        let vector = provider.get_embedding(&chunk_text).await?;

        let chunk = DocumentChunk {
            id: Uuid::new_v4().to_string(),
            file_path: relative_path.clone(), // Store relative path
            content: chunk_text,
            vector,
        };
        chunks.push(chunk);
    }

    Ok(chunks)
}

fn chunk_text(text: &str, max_chunk_size: usize) -> Vec<String> {
    let mut chunks = Vec::new();

    // First, try to split by paragraphs
    let paragraphs: Vec<&str> = text.split("\n\n").collect();
    let mut current_chunk = String::new();

    for paragraph in paragraphs {
        if current_chunk.len() + paragraph.len() > max_chunk_size && !current_chunk.is_empty() {
            // Save current chunk and start a new one
            chunks.push(current_chunk.clone());
            current_chunk.clear();
        }

        if paragraph.len() > max_chunk_size {
            // If a single paragraph is too large, split it by sentences or fixed size
            if !current_chunk.is_empty() {
                chunks.push(current_chunk.clone());
                current_chunk.clear();
            }

            // Split large paragraph into fixed-size chunks
            let mut start = 0;
            while start < paragraph.len() {
                let end = (start + max_chunk_size).min(paragraph.len());
                chunks.push(paragraph[start..end].to_string());
                start = end;
            }
        } else {
            if !current_chunk.is_empty() {
                current_chunk.push_str("\n\n");
            }
            current_chunk.push_str(paragraph);
        }
    }

    if !current_chunk.is_empty() {
        chunks.push(current_chunk);
    }

    chunks
}
