use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::command;

// ============================================================================
// Types for Agent Tools
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteToCreate {
    pub filename: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchCreateResult {
    pub success: Vec<String>,
    pub failed: Vec<BatchCreateError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchCreateError {
    pub filename: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteContent {
    pub path: String,    // Relative path for display
    pub content: String, // Full markdown content
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchReadResult {
    pub success: Vec<NoteContent>,
    pub failed: Vec<BatchReadError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchReadError {
    pub path: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteToUpdate {
    pub filename: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchUpdateResult {
    pub success: Vec<String>,
    pub failed: Vec<BatchUpdateError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchUpdateError {
    pub filename: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteMetadata {
    pub id: String,
    pub title: String,
    pub path: String,
    pub modified: u64, // Unix timestamp
    pub size: u64,
}

// ============================================================================
// Agent Tool Commands
// ============================================================================

/// Get the full content of a note by its file path
#[command]
pub async fn agent_get_note(vault_path: String, note_path: String) -> Result<String, String> {
    let path = Path::new(&note_path);
    let full_path = if path.is_absolute() {
        path.to_path_buf()
    } else {
        Path::new(&vault_path).join(path)
    };

    // Try adding .md if file not found and extension missing
    if !full_path.exists() && full_path.extension().is_none() {
        let with_ext = full_path.with_extension("md");
        if with_ext.exists() {
            return fs::read_to_string(&with_ext).map_err(|e| {
                format!(
                    "Failed to read note '{}': {}",
                    sanitize_path(&with_ext, &vault_path),
                    e
                )
            });
        }
    }

    // Read file content
    fs::read_to_string(&full_path).map_err(|e| {
        format!(
            "Failed to read note '{}': {}",
            sanitize_path(&full_path, &vault_path),
            e
        )
    })
}

/// Read multiple notes in a single batch operation
#[command]
pub async fn agent_batch_read(
    vault_path: String,
    note_paths: Vec<String>,
) -> Result<BatchReadResult, String> {
    let vault = Path::new(&vault_path);

    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path '{}' does not exist or is not a directory",
            vault_path
        ));
    }

    let mut success = Vec::new();
    let mut failed = Vec::new();

    for note_path in note_paths {
        let path = Path::new(&note_path);
        let full_path = if path.is_absolute() {
            path.to_path_buf()
        } else {
            vault.join(path)
        };

        // Try adding .md if file not found and extension missing
        let resolved_path = if !full_path.exists() && full_path.extension().is_none() {
            let with_ext = full_path.with_extension("md");
            if with_ext.exists() {
                with_ext
            } else {
                full_path
            }
        } else {
            full_path
        };

        // Read file content
        match fs::read_to_string(&resolved_path) {
            Ok(content) => {
                success.push(NoteContent {
                    path: sanitize_path(&resolved_path, &vault_path),
                    content,
                });
            }
            Err(e) => {
                failed.push(BatchReadError {
                    path: note_path.clone(),
                    error: format!("Failed to read: {}", e),
                });
            }
        }
    }

    Ok(BatchReadResult { success, failed })
}

/// Search for notes containing the query string
#[command]
pub async fn agent_search_notes(
    vault_path: String,
    query: String,
) -> Result<Vec<NoteMetadata>, String> {
    let vault = Path::new(&vault_path);

    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path '{}' does not exist or is not a directory",
            vault_path
        ));
    }

    let mut results = Vec::new();
    let query_lower = query.to_lowercase();

    // Recursively search through vault
    search_directory(vault, &query_lower, &mut results, vault)?;

    Ok(results)
}

/// List recent notes based on modification time
#[command]
pub async fn agent_list_recent_notes(
    vault_path: String,
    count: usize,
    days: Option<u64>,
) -> Result<Vec<NoteMetadata>, String> {
    let vault = Path::new(&vault_path);

    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path '{}' does not exist or is not a directory",
            vault_path
        ));
    }

    let mut notes = Vec::new();

    // Collect all notes
    collect_notes(vault, &mut notes, vault)?;

    // Filter by time if days is specified
    if let Some(days_ago) = days {
        let cutoff_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Time error: {}", e))?
            .as_secs()
            - (days_ago * 24 * 60 * 60);

        notes.retain(|note| note.modified >= cutoff_time);
    }

    // Sort by modification time (newest first)
    notes.sort_by(|a, b| b.modified.cmp(&a.modified));

    // Take the requested count
    notes.truncate(count);

    Ok(notes)
}

/// List all notes in the vault
#[command]
pub async fn agent_list_all_notes(vault_path: String) -> Result<Vec<NoteMetadata>, String> {
    let vault = Path::new(&vault_path);

    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path '{}' does not exist or is not a directory",
            vault_path
        ));
    }

    let mut notes = Vec::new();
    collect_notes(vault, &mut notes, vault)?;

    // Sort alphabetically by title
    notes.sort_by(|a, b| a.title.cmp(&b.title));

    Ok(notes)
}

/// Create a new note
#[command]
pub async fn agent_create_note(
    vault_path: String,
    filename: String,
    content: String,
) -> Result<String, String> {
    let vault = Path::new(&vault_path);

    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path '{}' does not exist or is not a directory",
            vault_path
        ));
    }

    // Ensure filename ends with .md
    let filename = if filename.ends_with(".md") {
        filename
    } else {
        format!("{}.md", filename)
    };

    let note_path = vault.join(&filename);

    // Check if file already exists
    if note_path.exists() {
        return Err(format!("Note '{}' already exists", filename));
    }

    // Create parent directories if needed
    if let Some(parent) = note_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directories: {}", e))?;
    }

    // Create file
    fs::write(&note_path, content)
        .map_err(|e| format!("Failed to create note '{}': {}", filename, e))?;

    let result_path = sanitize_path(&note_path, &vault_path);

    // Auto-commit if Git repository
    if let Some(repo) = crate::git_manager::open_repository(vault) {
        let _ = crate::git_manager::auto_commit_mosaic_changes(
            &repo,
            &format!("Created {}", filename),
            &[&note_path],
        ); // Silently fail if commit fails
    }

    Ok(result_path)
}

/// Create multiple notes in a single batch operation
#[command]
pub async fn agent_batch_create_notes(
    vault_path: String,
    notes: Vec<NoteToCreate>,
) -> Result<BatchCreateResult, String> {
    let vault = Path::new(&vault_path);

    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path '{}' does not exist or is not a directory",
            vault_path
        ));
    }

    let mut success = Vec::new();
    let mut failed = Vec::new();

    for note_to_create in notes {
        // Ensure filename ends with .md
        let filename = if note_to_create.filename.ends_with(".md") {
            note_to_create.filename.clone()
        } else {
            format!("{}.md", note_to_create.filename)
        };

        let note_path = vault.join(&filename);

        // Check if file already exists
        if note_path.exists() {
            failed.push(BatchCreateError {
                filename: note_to_create.filename.clone(),
                error: format!("Note '{}' already exists", filename),
            });
            continue;
        }

        // Create parent directories if needed
        if let Some(parent) = note_path.parent() {
            if let Err(e) = fs::create_dir_all(parent) {
                failed.push(BatchCreateError {
                    filename: note_to_create.filename.clone(),
                    error: format!("Failed to create parent directories: {}", e),
                });
                continue;
            }
        }

        // Create file
        match fs::write(&note_path, &note_to_create.content) {
            Ok(_) => {
                success.push(sanitize_path(&note_path, &vault_path));
            }
            Err(e) => {
                failed.push(BatchCreateError {
                    filename: note_to_create.filename.clone(),
                    error: format!("Failed to create note: {}", e),
                });
            }
        }
    }

    // Auto-commit if Git repository and there were successes
    if !success.is_empty() {
        if let Some(repo) = crate::git_manager::open_repository(vault) {
            // Collect all created file paths
            let file_paths: Vec<_> = success
                .iter()
                .map(|s| vault.join(s).into_boxed_path())
                .collect();
            let file_refs: Vec<&std::path::Path> = file_paths.iter().map(|p| p.as_ref()).collect();

            let _ = crate::git_manager::auto_commit_mosaic_changes(
                &repo,
                &format!(
                    "Created {} note{}",
                    success.len(),
                    if success.len() == 1 { "" } else { "s" }
                ),
                &file_refs,
            ); // Silently fail if commit fails
        }
    }

    Ok(BatchCreateResult { success, failed })
}

/// Create a new folder
#[command]
pub async fn agent_create_folder(
    vault_path: String,
    folder_name: String,
) -> Result<String, String> {
    let vault = Path::new(&vault_path);

    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path '{}' does not exist or is not a directory",
            vault_path
        ));
    }

    let folder_path = vault.join(&folder_name);

    if folder_path.exists() {
        return Err(format!("Folder '{}' already exists", folder_name));
    }

    fs::create_dir_all(&folder_path)
        .map_err(|e| format!("Failed to create folder '{}': {}", folder_name, e))?;

    Ok(sanitize_path(&folder_path, &vault_path))
}

/// Update an existing note (overwrite content)
#[command]
pub async fn agent_update_note(
    vault_path: String,
    filename: String,
    content: String,
) -> Result<String, String> {
    let vault = Path::new(&vault_path);

    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path '{}' does not exist or is not a directory",
            vault_path
        ));
    }

    // Ensure filename ends with .md
    let filename = if filename.ends_with(".md") {
        filename
    } else {
        format!("{}.md", filename)
    };

    let note_path = vault.join(&filename);

    // Check if file exists
    if !note_path.exists() {
        return Err(format!(
            "Note '{}' does not exist. Use create_note to create it.",
            filename
        ));
    }

    // Overwrite file
    fs::write(&note_path, content)
        .map_err(|e| format!("Failed to update note '{}': {}", filename, e))?;

    let result_path = sanitize_path(&note_path, &vault_path);

    // Auto-commit if Git repository
    if let Some(repo) = crate::git_manager::open_repository(vault) {
        let _ = crate::git_manager::auto_commit_mosaic_changes(
            &repo,
            &format!("Updated {}", filename),
            &[&note_path],
        ); // Silently fail if commit fails
    }

    Ok(result_path)
}

/// Update multiple notes in a single batch operation
#[command]
pub async fn agent_batch_update_notes(
    vault_path: String,
    notes: Vec<NoteToUpdate>,
) -> Result<BatchUpdateResult, String> {
    let vault = Path::new(&vault_path);

    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path '{}' does not exist or is not a directory",
            vault_path
        ));
    }

    let mut success = Vec::new();
    let mut failed = Vec::new();

    for note_to_update in notes {
        // Ensure filename ends with .md
        let filename = if note_to_update.filename.ends_with(".md") {
            note_to_update.filename.clone()
        } else {
            format!("{}.md", note_to_update.filename)
        };

        let note_path = vault.join(&filename);

        // Check if file exists
        if !note_path.exists() {
            failed.push(BatchUpdateError {
                filename: note_to_update.filename.clone(),
                error: format!("Note '{}' does not exist", filename),
            });
            continue;
        }

        // Update file
        match fs::write(&note_path, &note_to_update.content) {
            Ok(_) => {
                success.push(sanitize_path(&note_path, &vault_path));
            }
            Err(e) => {
                failed.push(BatchUpdateError {
                    filename: note_to_update.filename.clone(),
                    error: format!("Failed to update note: {}", e),
                });
            }
        }
    }

    // Auto-commit if Git repository and there were successes
    if !success.is_empty() {
        if let Some(repo) = crate::git_manager::open_repository(vault) {
            // Collect all updated file paths
            let file_paths: Vec<_> = success
                .iter()
                .map(|s| vault.join(s).into_boxed_path())
                .collect();
            let file_refs: Vec<&std::path::Path> = file_paths.iter().map(|p| p.as_ref()).collect();

            let _ = crate::git_manager::auto_commit_mosaic_changes(
                &repo,
                &format!(
                    "Updated {} note{}",
                    success.len(),
                    if success.len() == 1 { "" } else { "s" }
                ),
                &file_refs,
            ); // Silently fail if commit fails
        }
    }

    Ok(BatchUpdateResult { success, failed })
}

/// Resolve a relative path to an absolute path in the vault
#[command]
pub async fn agent_resolve_path(vault_path: String, short_path: String) -> Result<String, String> {
    let path = Path::new(&short_path);
    let full_path = if path.is_absolute() {
        path.to_path_buf()
    } else {
        Path::new(&vault_path).join(path)
    };

    if full_path.exists() {
        return Ok(full_path.to_string_lossy().to_string());
    }

    // Try with .md
    let with_ext = full_path.with_extension("md");
    if with_ext.exists() {
        return Ok(with_ext.to_string_lossy().to_string());
    }

    Err(format!(
        "File not found: {}",
        sanitize_path(&full_path, &vault_path)
    ))
}

/// Resolve a wikilink to a file path, handling fuzzy matching
#[command]
pub async fn agent_resolve_wikilink(
    vault_path: String,
    link_text: String,
) -> Result<String, String> {
    let vault = Path::new(&vault_path);

    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path '{}' does not exist or is not a directory",
            vault_path
        ));
    }

    // 1. Try exact match (relative path)
    let path = Path::new(&link_text);
    let full_path = if path.is_absolute() {
        path.to_path_buf()
    } else {
        vault.join(path)
    };

    if full_path.exists() && full_path.is_file() {
        return Ok(sanitize_path(&full_path, &vault_path));
    }

    // 2. Try with .md extension
    let with_ext = full_path.with_extension("md");
    if with_ext.exists() && with_ext.is_file() {
        return Ok(sanitize_path(&with_ext, &vault_path));
    }

    // 3. Deep search for basename match (case-insensitive and slugified)
    // This is expensive but necessary for "fuzzy" wikilinks like [[My Note]] matching "Folder/my-note.md"
    let link_stem = Path::new(&link_text)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    if let Some(found_path) = find_file_fuzzy(vault, &link_stem) {
        return Ok(sanitize_path(&found_path, &vault_path));
    }

    Err(format!("Link target not found: {}", link_text))
}

/// Helper to find a file fuzzy matching the name
fn find_file_fuzzy(dir: &Path, target_stem: &str) -> Option<std::path::PathBuf> {
    let target_lower = target_stem.to_lowercase();
    let target_slug = target_lower.replace(' ', "-");

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();

            // Skip hidden
            if let Some(name) = path.file_name() {
                if name.to_string_lossy().starts_with('.') {
                    continue;
                }
            }

            if path.is_dir() {
                if let Some(found) = find_file_fuzzy(&path, target_stem) {
                    return Some(found);
                }
            } else if let Some(stem) = path.file_stem() {
                let stem_str = stem.to_string_lossy().to_string();
                let stem_lower = stem_str.to_lowercase();

                // Check exact match, case-insensitive, or slugified
                if stem_str == target_stem
                    || stem_lower == target_lower
                    || stem_lower == target_slug
                {
                    return Some(path);
                }
            }
        }
    }
    None
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Recursively search directory for files containing the query
fn search_directory(
    dir: &Path,
    query: &str,
    results: &mut Vec<NoteMetadata>,
    vault_path: &Path,
) -> Result<(), String> {
    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory '{}': {}", dir.display(), e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        // Skip hidden files and directories
        if let Some(name) = path.file_name() {
            if name.to_string_lossy().starts_with('.') {
                continue;
            }
        }

        if path.is_dir() {
            // Recursively search subdirectories
            search_directory(&path, query, results, vault_path)?;
        } else if path.is_file() {
            // Only process .md files
            if let Some(ext) = path.extension() {
                if ext == "md" {
                    // Check filename first
                    let filename_match = if let Some(stem) = path.file_stem() {
                        stem.to_string_lossy().to_lowercase().contains(query)
                    } else {
                        false
                    };

                    if filename_match {
                        if let Some(metadata) = create_note_metadata(&path, vault_path) {
                            results.push(metadata);
                        }
                        continue;
                    }

                    // Read file content and check if it contains the query
                    if let Ok(content) = fs::read_to_string(&path) {
                        if content.to_lowercase().contains(query) {
                            if let Some(metadata) = create_note_metadata(&path, vault_path) {
                                results.push(metadata);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

/// Recursively collect all note metadata
fn collect_notes(
    dir: &Path,
    notes: &mut Vec<NoteMetadata>,
    vault_path: &Path,
) -> Result<(), String> {
    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory '{}': {}", dir.display(), e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        // Skip hidden files and directories
        if let Some(name) = path.file_name() {
            if name.to_string_lossy().starts_with('.') {
                continue;
            }
        }

        if path.is_dir() {
            // Recursively collect from subdirectories
            collect_notes(&path, notes, vault_path)?;
        } else if path.is_file() {
            // Only process .md files
            if let Some(ext) = path.extension() {
                if ext == "md" {
                    if let Some(metadata) = create_note_metadata(&path, vault_path) {
                        notes.push(metadata);
                    }
                }
            }
        }
    }

    Ok(())
}

/// Create note metadata from a file path
fn create_note_metadata(path: &Path, vault_path: &Path) -> Option<NoteMetadata> {
    let metadata = fs::metadata(path).ok()?;
    let modified = metadata
        .modified()
        .ok()?
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();

    let title = path.file_stem()?.to_string_lossy().to_string();

    // Calculate relative path for the AI
    let relative_path = path
        .strip_prefix(vault_path)
        .ok()?
        .to_string_lossy()
        .to_string();

    Some(NoteMetadata {
        id: relative_path.clone(), // Use relative path for ID to prevent leaking absolute paths to Agent
        title,
        path: relative_path, // AI sees this relative path
        modified,
        size: metadata.len(),
    })
}

/// Helper to sanitize paths for display/errors (strips vault path)
fn sanitize_path(path: &Path, vault_path: &str) -> String {
    let vault_path = Path::new(vault_path);
    path.strip_prefix(vault_path)
        .unwrap_or(path)
        .to_string_lossy()
        .to_string()
}
