use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentChunk {
    pub id: String,
    pub file_path: String,
    pub content: String,
    pub vector: Vec<f32>,
}

pub struct VectorStore {
    conn: Connection,
}

impl VectorStore {
    pub fn open(path: &Path) -> Result<Self, String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let conn = Connection::open(path).map_err(|e| e.to_string())?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS chunks (
                id TEXT PRIMARY KEY,
                file_path TEXT NOT NULL,
                content TEXT NOT NULL,
                vector BLOB NOT NULL
            )",
            [],
        )
        .map_err(|e| e.to_string())?;

        Ok(Self { conn })
    }

    pub fn add_batch(&mut self, chunks: Vec<DocumentChunk>) -> Result<(), String> {
        let tx = self.conn.transaction().map_err(|e| e.to_string())?;

        {
            let mut stmt = tx
                .prepare(
                    "INSERT OR REPLACE INTO chunks (id, file_path, content, vector) VALUES (?1, ?2, ?3, ?4)",
                )
                .map_err(|e| e.to_string())?;

            for chunk in chunks {
                // Serialize vector to bytes (f32 is 4 bytes)
                let vector_bytes: Vec<u8> = chunk
                    .vector
                    .iter()
                    .flat_map(|f| f.to_le_bytes().to_vec())
                    .collect();

                stmt.execute(params![
                    chunk.id,
                    chunk.file_path,
                    chunk.content,
                    vector_bytes
                ])
                .map_err(|e| e.to_string())?;
            }
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn search(
        &self,
        query_vector: &[f32],
        limit: usize,
    ) -> Result<Vec<(DocumentChunk, f32)>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, file_path, content, vector FROM chunks")
            .map_err(|e| e.to_string())?;

        let chunk_iter = stmt
            .query_map([], |row| {
                let id: String = row.get(0)?;
                let file_path: String = row.get(1)?;
                let content: String = row.get(2)?;
                let vector_blob: Vec<u8> = row.get(3)?;

                // Deserialize vector
                let vector: Vec<f32> = vector_blob
                    .chunks_exact(4)
                    .map(|chunk| {
                        let bytes: [u8; 4] = chunk.try_into().unwrap();
                        f32::from_le_bytes(bytes)
                    })
                    .collect();

                Ok(DocumentChunk {
                    id,
                    file_path,
                    content,
                    vector,
                })
            })
            .map_err(|e| e.to_string())?;

        // Calculate scores
        let mut scores: Vec<(DocumentChunk, f32)> = Vec::new();
        for chunk_result in chunk_iter {
            let chunk = chunk_result.map_err(|e| e.to_string())?;
            let score = cosine_similarity(query_vector, &chunk.vector);
            scores.push((chunk, score));
        }

        // Sort by score descending
        scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        // Take top K
        Ok(scores.into_iter().take(limit).collect())
    }

    // Helper to clear the store before re-indexing
    pub fn clear(&self) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM chunks", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot_product: f32 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a * norm_b)
    }
}
