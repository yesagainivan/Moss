// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod ai;
mod fs_extra;
mod git_manager;
mod github;
mod graph;
mod indexer;
mod tags;
mod templates;
mod tools;
mod vector_store;
mod watcher;
mod wikipedia;

use ai::{
    cerebras::CerebrasProvider, gemini::GeminiProvider, openrouter::OpenRouterProvider, AIProvider,
};
use futures::StreamExt;
use keyring::Entry;
use tauri::Emitter;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ============================================================================
// Secure API Key Storage
// ============================================================================

#[tauri::command]
async fn save_api_key(provider: String, key: String) -> Result<(), String> {
    let entry = Entry::new("amber-ai", &provider)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .set_password(&key)
        .map_err(|e| format!("Failed to save API key: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn get_api_key(provider: String) -> Result<String, String> {
    let entry = Entry::new("amber-ai", &provider)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .get_password()
        .map_err(|e| format!("No API key found for {}: {}", provider, e))
}

#[tauri::command]
async fn delete_api_key(provider: String) -> Result<(), String> {
    let entry = Entry::new("amber-ai", &provider)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .delete_password()
        .map_err(|e| format!("Failed to delete API key: {}", e))?;

    Ok(())
}

// ============================================================================
// AI Provider Commands
// ============================================================================

#[tauri::command]
async fn test_ai_connection(provider: String) -> Result<bool, String> {
    let api_key = get_api_key(provider.clone()).await?;

    let provider_impl: Box<dyn AIProvider> = match provider.as_str() {
        "gemini" => Box::new(GeminiProvider::new(api_key)),
        "cerebras" => Box::new(CerebrasProvider::new(api_key)),
        "openrouter" => Box::new(OpenRouterProvider::new(api_key)),
        _ => return Err(format!("Unknown provider: {}", provider)),
    };

    provider_impl.test_connection().await
}

#[tauri::command]
async fn ai_rewrite_text(
    app_handle: tauri::AppHandle,
    provider: String,
    model: String,
    system_prompt: String,
    instruction: String,
    context: String,
) -> Result<(), String> {
    let api_key = get_api_key(provider.clone())
        .await
        .map_err(|e| e.to_string())?;

    let ai_provider: Box<dyn AIProvider> = match provider.as_str() {
        "gemini" => Box::new(GeminiProvider::new(api_key).with_model(model)),
        "cerebras" => Box::new(CerebrasProvider::new(api_key).with_model(model)),
        "openrouter" => Box::new(OpenRouterProvider::new(api_key).with_model(model)),
        _ => return Err("Invalid provider".to_string()),
    };

    let mut stream = ai_provider
        .stream_completion(system_prompt, instruction, context)
        .await?;

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                app_handle
                    .emit("ai-stream-chunk", chunk)
                    .map_err(|e| e.to_string())?;
            }
            Err(e) => {
                app_handle
                    .emit("ai-stream-error", e)
                    .map_err(|e| e.to_string())?;
            }
        }
    }

    app_handle
        .emit("ai-stream-done", ())
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct FileNode {
    id: String,
    name: String,
    #[serde(rename = "type")]
    node_type: String, // "file" or "folder"
    children: Option<Vec<FileNode>>,
    #[serde(rename = "noteId")]
    note_id: Option<String>,
    path: Option<String>,
}

#[tauri::command]
async fn get_file_tree(vault_path: String) -> Result<Vec<FileNode>, String> {
    // println!("RUST: get_file_tree called with path: {}", vault_path);
    let path = std::path::Path::new(&vault_path);
    if !path.exists() || !path.is_dir() {
        // println!("RUST: Path does not exist or is not a directory");
        return Err(format!("Vault path does not exist"));
    }

    use ignore::WalkBuilder;

    let path = std::path::Path::new(&vault_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Vault path does not exist"));
    }

    let mut nodes = Vec::new();
    let walker = WalkBuilder::new(path)
        .hidden(false) // We want to control hidden files manually if needed, but for now let's follow standard rules or custom ones
        .git_ignore(true)
        .build();

    for result in walker {
        match result {
            Ok(entry) => {
                let entry_path = entry.path();

                // Skip the root folder itself
                if entry_path == path {
                    continue;
                }

                let name = entry.file_name().to_string_lossy().to_string();

                // Skip hidden files/folders explicitly if needed (though git_ignore handles many)
                if name.starts_with('.') {
                    continue;
                }

                let relative_path = entry_path.strip_prefix(path).unwrap_or(entry_path);
                let _depth = relative_path.components().count();

                if entry_path.is_dir() {
                    nodes.push(FileNode {
                        id: entry_path.to_string_lossy().to_string(),
                        name,
                        node_type: "folder".to_string(),
                        children: None, // Flat list, no children
                        note_id: None,
                        path: Some(entry_path.to_string_lossy().to_string()),
                    });
                } else if entry_path.is_file() {
                    if let Some(ext) = entry_path.extension() {
                        let ext_str = ext.to_string_lossy();
                        if ext_str == "md" || ext_str == "txt" {
                            nodes.push(FileNode {
                                id: entry_path.to_string_lossy().to_string(),
                                name,
                                node_type: "file".to_string(),
                                children: None,
                                note_id: Some(entry_path.to_string_lossy().to_string()),
                                path: Some(entry_path.to_string_lossy().to_string()),
                            });
                        }
                    }
                }
            }
            Err(err) => {
                eprintln!("Error walking directory: {}", err);
            }
        }
    }

    // Sort by path to ensure parent folders come before their children
    // This is crucial for the frontend to reconstruct the tree structure if needed,
    // or just to render in a logical order (though sidebar sorting might be different)
    // Actually, for a flat list rendering, we usually want depth-first order.
    // WalkBuilder usually yields in a depth-first manner, but let's ensure consistency.
    // However, standard string sort of paths usually gives a decent order:
    // /a
    // /a/b
    // /b
    nodes.sort_by(|a, b| {
        let path_a = std::path::Path::new(a.path.as_ref().unwrap_or(&a.id));
        let path_b = std::path::Path::new(b.path.as_ref().unwrap_or(&b.id));
        path_a.components().cmp(path_b.components())
    });

    Ok(nodes)
}

#[tauri::command]
async fn get_graph_data(vault_path: String) -> Result<graph::GraphData, String> {
    let path = std::path::Path::new(&vault_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Vault path '{}' does not exist", vault_path));
    }

    graph::get_graph_data_with_cache(path)
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct Backlink {
    source_path: String,
    source_title: String,
}

#[tauri::command]
async fn get_backlinks(vault_path: String, note_path: String) -> Result<Vec<Backlink>, String> {
    let path = std::path::Path::new(&vault_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Vault path '{}' does not exist", vault_path));
    }

    // Get graph data
    let graph_data = graph::get_graph_data_with_cache(path)?;

    // Find all links where target matches the note_path
    let mut backlinks = Vec::new();
    for link in &graph_data.links {
        if link.target == note_path {
            // Find source node to get title
            if let Some(source_node) = graph_data.nodes.iter().find(|n| n.id == link.source) {
                backlinks.push(Backlink {
                    source_path: source_node.id.clone(),
                    source_title: source_node.name.clone(),
                });
            }
        }
    }

    Ok(backlinks)
}

// ============================================================================
// Tags
// ============================================================================

#[tauri::command]
async fn get_all_tags(vault_path: String) -> Result<tags::TagsData, String> {
    let path = std::path::Path::new(&vault_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Vault path '{}' does not exist", vault_path));
    }

    tags::get_tags_data_with_cache(path)
}

#[tauri::command]
async fn get_notes_by_tag(vault_path: String, tag: String) -> Result<Vec<String>, String> {
    let path = std::path::Path::new(&vault_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Vault path '{}' does not exist", vault_path));
    }

    let tags_data = tags::get_tags_data_with_cache(path)?;

    // Find the tag (case-insensitive)
    let tag_lower = tag.to_lowercase();
    let tag_info = tags_data.tags.into_iter().find(|t| t.tag == tag_lower);

    Ok(tag_info.map(|t| t.files).unwrap_or_default())
}

// ============================================================================
// Vector Search / Semantic Search
// ============================================================================

#[tauri::command]
async fn trigger_indexing(vault_path: String) -> Result<(), String> {
    let api_key = get_api_key("gemini".to_string()).await?;
    let path = std::path::Path::new(&vault_path);
    indexer::index_vault(path, &api_key).await
}

#[tauri::command]
async fn agent_semantic_search(
    vault_path: String,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    let api_key = get_api_key("gemini".to_string()).await?;
    let provider = GeminiProvider::new(api_key);

    // Get query embedding
    let query_vector = provider.get_embedding(&query).await?;

    // Load vector store
    let store_path = std::path::Path::new(&vault_path).join(".moss/vector_store.db");
    let store = vector_store::VectorStore::open(&store_path).map_err(|e| e.to_string())?;

    // Search
    let results = store
        .search(&query_vector, limit.unwrap_or(5))
        .map_err(|e| e.to_string())?;

    // Convert to SearchResult format (paths are already relative in DB)
    let search_results = results
        .into_iter()
        .map(|(chunk, score)| SearchResult {
            file_path: chunk.file_path,
            content: chunk.content,
            score,
        })
        .collect();

    Ok(search_results)
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct SearchResult {
    file_path: String,
    content: String,
    score: f32,
}

// ============================================================================
// Wikipedia Search Commands
// ============================================================================

#[tauri::command]
async fn search_wikipedia(
    query: String,
    limit: Option<usize>,
) -> Result<wikipedia::SearchResults, String> {
    wikipedia::search_wikipedia(&query, limit.unwrap_or(5)).await
}

#[tauri::command]
async fn get_wikipedia_summary(title: String) -> Result<wikipedia::WikiSummary, String> {
    wikipedia::get_wikipedia_summary(&title).await
}

#[tauri::command]
async fn get_wikipedia_content(title: String) -> Result<wikipedia::WikiContent, String> {
    wikipedia::get_wikipedia_content(&title).await
}

// ============================================================================
// Git Version Control Commands
// ============================================================================

#[tauri::command]
async fn check_git_status(vault_path: String) -> Result<bool, String> {
    let path = std::path::Path::new(&vault_path);
    Ok(git_manager::is_git_repository(path))
}

#[tauri::command]
async fn init_git_repository(vault_path: String) -> Result<(), String> {
    let path = std::path::Path::new(&vault_path);
    git_manager::init_repository(path)
        .map(|_| ())
        .map_err(|e| format!("Failed to initialize Git repository: {}", e))
}

#[tauri::command]
async fn get_git_history(
    vault_path: String,
    limit: Option<usize>,
    ambre_only: Option<bool>,
    file_path: Option<String>,
    include_stats: Option<bool>,
) -> Result<Vec<git_manager::CommitInfo>, String> {
    let path = std::path::Path::new(&vault_path);

    let relative_file_path = if let Some(fp) = file_path {
        let full_path = std::path::Path::new(&fp);
        // If path is absolute, strip prefix. If relative, use as is.
        if full_path.is_absolute() {
            match full_path.strip_prefix(path) {
                Ok(p) => Some(p.to_path_buf()),
                Err(_) => return Err("File path is not inside vault".to_string()),
            }
        } else {
            Some(full_path.to_path_buf())
        }
    } else {
        None
    };

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::get_commit_history(
            &repo,
            limit.unwrap_or(50),
            ambre_only.unwrap_or(false),
            relative_file_path.as_deref(),
            include_stats.unwrap_or(false),
        )
        .map_err(|e| format!("Failed to get commit history: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn get_file_content_at_commit(
    vault_path: String,
    commit_oid: String,
    file_path: String,
) -> Result<String, String> {
    let path = std::path::Path::new(&vault_path);
    let full_file_path = std::path::Path::new(&file_path);

    // Convert to relative path string for Git (uses forward slashes)
    let relative_path_str = if full_file_path.is_absolute() {
        let relative = full_file_path
            .strip_prefix(path)
            .map_err(|_| "File path is not inside vault".to_string())?;
        relative
            .to_str()
            .ok_or_else(|| "Path contains invalid UTF-8".to_string())?
    } else {
        file_path.as_str()
    };

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::get_file_content_at_commit(&repo, &commit_oid, relative_path_str)
            .map_err(|e| format!("Failed to get file content: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn undo_last_ambre_change(vault_path: String) -> Result<String, String> {
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::undo_last_ambre_commit(&repo)
            .map(|oid| format!("Reverted commit: {}", oid))
            .map_err(|e| format!("Failed to undo last change: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn check_uncommitted_changes(vault_path: String) -> Result<bool, String> {
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::has_uncommitted_changes(&repo)
            .map_err(|e| format!("Failed to check uncommitted changes: {}", e))
    } else {
        Ok(false) // Not a git repo = no uncommitted changes
    }
}

#[tauri::command]
async fn commit_note(
    vault_path: String,
    file_path: String,
    message: String,
) -> Result<String, String> {
    let path = std::path::Path::new(&vault_path);
    let full_file_path = std::path::Path::new(&file_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::commit_file(&repo, &message, full_file_path)
            .map(|oid| oid.to_string())
            .map_err(|e| format!("Failed to commit file: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn commit_vault(vault_path: String, message: String) -> Result<String, String> {
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::commit_all_changes(&repo, &message)
            .map(|oid| oid.to_string())
            .map_err(|e| format!("Failed to commit vault: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn restore_vault(vault_path: String, commit_oid: String) -> Result<String, String> {
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::restore_vault_to_commit(&repo, &commit_oid)
            .map(|oid| oid.to_string())
            .map_err(|e| format!("Failed to restore vault: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

// ============================================================================
// GitHub Authentication Commands
// ============================================================================

#[tauri::command]
async fn github_start_device_flow(client_id: String) -> Result<github::DeviceCodeResponse, String> {
    github::request_device_code(&client_id).await
}

#[tauri::command]
async fn github_poll_token(
    client_id: String,
    device_code: String,
) -> Result<Option<String>, String> {
    github::poll_access_token(&client_id, &device_code).await
}

#[tauri::command]
async fn github_save_token(token: String) -> Result<(), String> {
    let entry = Entry::new("amber-github", "access_token")
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .set_password(&token)
        .map_err(|e| format!("Failed to save GitHub token: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn github_get_token() -> Result<String, String> {
    let entry = Entry::new("amber-github", "access_token")
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .get_password()
        .map_err(|e| format!("No GitHub token found: {}", e))
}

#[tauri::command]
async fn github_delete_token() -> Result<(), String> {
    let entry = Entry::new("amber-github", "access_token")
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .delete_password()
        .map_err(|e| format!("Failed to delete GitHub token: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn github_get_user() -> Result<github::GitHubUser, String> {
    let token = github_get_token().await?;
    github::get_user_info(&token).await
}

#[tauri::command]
async fn github_verify_token() -> Result<bool, String> {
    match github_get_token().await {
        Ok(token) => github::verify_token(&token).await,
        Err(_) => Ok(false),
    }
}

#[tauri::command]
async fn github_list_repositories() -> Result<Vec<github::GitHubRepository>, String> {
    let token = github_get_token().await?;
    github::list_repositories(&token).await
}

#[tauri::command]
async fn github_create_repository(
    name: String,
    description: Option<String>,
) -> Result<github::GitHubRepository, String> {
    let token = github_get_token().await?;
    github::create_repository(&token, &name, description).await
}

// ============================================================================
// Git Remote Operations Commands
// ============================================================================

#[tauri::command]
async fn git_configure_remote(vault_path: String, remote_url: String) -> Result<(), String> {
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::configure_remote(&repo, &remote_url)
            .map_err(|e| format!("Failed to configure remote: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn git_push_to_remote(vault_path: String) -> Result<(), String> {
    let token = github_get_token().await?;
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::push_to_remote(&repo, &token).map_err(|e| format!("Failed to push: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn git_pull_from_remote(
    vault_path: String,
) -> Result<git_manager::ConflictResolution, String> {
    let token = github_get_token().await?;
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::pull_from_remote(&repo, &token).map_err(|e| format!("Failed to pull: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn git_fetch_remote(vault_path: String) -> Result<(), String> {
    let token = github_get_token().await?;
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::fetch_remote(&repo, &token).map_err(|e| format!("Failed to fetch: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn git_sync_vault(vault_path: String) -> Result<git_manager::ConflictResolution, String> {
    let token = github_get_token().await?;
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::sync_vault(&repo, &token).map_err(|e| format!("Failed to sync vault: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn git_resolve_conflict(
    vault_path: String,
    file_path: String,
    resolution_type: String,
    custom_content: Option<String>,
) -> Result<(), String> {
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        let res_type = match resolution_type.as_str() {
            "ours" => git_manager::ResolutionType::KeepOurs,
            "theirs" => git_manager::ResolutionType::KeepTheirs,
            "manual" => git_manager::ResolutionType::Manual,
            _ => return Err("Invalid resolution type".to_string()),
        };

        git_manager::resolve_conflict(&repo, &file_path, res_type, custom_content)
            .map_err(|e| format!("Failed to resolve conflict: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn git_complete_merge(vault_path: String) -> Result<git_manager::SyncStatus, String> {
    let token = github_get_token().await?;
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        // Complete the merge commit
        git_manager::complete_merge(&repo)
            .map_err(|e| format!("Failed to complete merge: {}", e))?;

        // Push to remote
        git_manager::push_to_remote(&repo, &token)
            .map_err(|e| format!("Failed to push after merge: {}", e))?;

        // Return updated status
        git_manager::get_sync_status(&repo).map_err(|e| format!("Failed to get sync status: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn git_abort_merge(vault_path: String) -> Result<(), String> {
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::abort_merge(&repo).map_err(|e| format!("Failed to abort merge: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn git_get_sync_status(vault_path: String) -> Result<git_manager::SyncStatus, String> {
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::get_sync_status(&repo).map_err(|e| format!("Failed to get sync status: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn git_get_commit_changes(
    vault_path: String,
    commit_oid: String,
) -> Result<Vec<git_manager::FileChange>, String> {
    let path = std::path::Path::new(&vault_path);

    if let Some(repo) = git_manager::open_repository(path) {
        git_manager::get_commit_changes(&repo, &commit_oid)
            .map_err(|e| format!("Failed to get commit changes: {}", e))
    } else {
        Err("Not a Git repository".to_string())
    }
}

#[tauri::command]
async fn save_pane_layout(vault_path: String, layout: String) -> Result<(), String> {
    let path = std::path::Path::new(&vault_path);
    if !path.exists() {
        return Err("Vault path does not exist".to_string());
    }

    let moss_dir = path.join(".moss");
    if !moss_dir.exists() {
        std::fs::create_dir(&moss_dir).map_err(|e| e.to_string())?;
    }

    let layout_path = moss_dir.join("pane-layout.json");
    std::fs::write(layout_path, layout).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn load_pane_layout(vault_path: String) -> Result<Option<String>, String> {
    let path = std::path::Path::new(&vault_path).join(".moss/pane-layout.json");
    if !path.exists() {
        return Ok(None);
    }

    match std::fs::read_to_string(path) {
        Ok(content) => Ok(Some(content)),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .manage(watcher::WatcherState::new())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_api_key,
            get_api_key,
            delete_api_key,
            test_ai_connection,
            ai_rewrite_text,
            get_file_tree,
            get_graph_data,
            get_backlinks,
            get_all_tags,
            get_notes_by_tag,
            templates::list_templates,
            templates::get_template,
            templates::create_note_from_template,
            tools::agent_get_note,
            tools::agent_batch_read,
            tools::agent_search_notes,
            tools::agent_list_recent_notes,
            tools::agent_list_all_notes,
            tools::agent_create_note,
            tools::agent_batch_create_notes,
            tools::agent_create_folder,
            tools::agent_update_note,
            tools::agent_batch_update_notes,
            tools::agent_resolve_path,
            tools::agent_resolve_wikilink,
            trigger_indexing,
            agent_semantic_search,
            search_wikipedia,
            get_wikipedia_summary,
            get_wikipedia_content,
            check_git_status,
            init_git_repository,
            get_git_history,
            get_file_content_at_commit,
            undo_last_ambre_change,
            check_uncommitted_changes,
            commit_note,
            commit_vault,
            restore_vault,
            fs_extra::rename_note,
            fs_extra::file_exists,
            fs_extra::save_image,
            watcher::watch_vault,
            github_start_device_flow,
            github_poll_token,
            github_save_token,
            github_get_token,
            github_delete_token,
            github_get_user,
            github_verify_token,
            github_list_repositories,
            github_create_repository,
            git_configure_remote,
            git_push_to_remote,
            git_pull_from_remote,
            git_fetch_remote,
            git_sync_vault,
            git_resolve_conflict,
            git_complete_merge,
            git_abort_merge,
            git_get_sync_status,
            git_get_commit_changes,
            save_pane_layout,
            load_pane_layout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
