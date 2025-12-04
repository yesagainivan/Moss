use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagInfo {
    pub tag: String,        // Normalized lowercase tag name
    pub count: usize,       // Number of notes with this tag
    pub files: Vec<String>, // Relative paths of notes with this tag
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TagsData {
    pub tags: Vec<TagInfo>, // All tags with metadata
}

#[derive(Debug, Serialize, Deserialize)]
struct CachedFile {
    path: String,       // Relative path
    tags: Vec<String>,  // Normalized tags found in this file
    last_modified: u64, // Timestamp for cache invalidation
}

#[derive(Debug, Serialize, Deserialize)]
struct TagsCache {
    version: u32,
    files: HashMap<String, CachedFile>, // Key is relative path
}

const CACHE_VERSION: u32 = 2;
const CACHE_FILE_NAME: &str = ".moss/tags_cache.json";

/// Remove inline code from a line (text between backticks)
fn remove_inline_code(line: &str) -> String {
    let inline_code_regex = Regex::new(r"`[^`]+`").unwrap();
    inline_code_regex.replace_all(line, "").to_string()
}

/// Extract tags from markdown content
/// Tags are in the format #tag-name and are case-insensitive
/// Tags inside code blocks and inline code are excluded
fn extract_tags_from_content(content: &str) -> Vec<String> {
    // Require at least 2 characters to avoid noise like #1
    let tag_regex = Regex::new(r"#([a-zA-Z0-9_-]{2,})").unwrap();
    let mut tags = HashSet::new();

    let mut in_code_block = false;
    let mut cleaned_content = String::new();

    for line in content.lines() {
        if line.trim_start().starts_with("```") {
            in_code_block = !in_code_block;
            continue;
        }

        if !in_code_block {
            // Remove inline code
            let line_without_inline_code = remove_inline_code(line);
            cleaned_content.push_str(&line_without_inline_code);
            cleaned_content.push('\n');
        }
    }

    // Extract tags from cleaned content
    for cap in tag_regex.captures_iter(&cleaned_content) {
        if let Some(tag) = cap.get(1) {
            // Normalize to lowercase
            tags.insert(tag.as_str().to_lowercase());
        }
    }

    tags.into_iter().collect()
}

/// Recursively walk directory to find markdown files
fn walk_dir(dir: &Path, files: &mut HashMap<String, PathBuf>) -> Result<(), String> {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_dir() {
                    // Skip .moss directory and hidden folders
                    if let Some(name) = path.file_name() {
                        if name.to_string_lossy().starts_with('.') {
                            continue;
                        }
                    }
                    walk_dir(&path, files)?;
                } else if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext == "md" {
                            files.insert(path.to_string_lossy().to_string(), path);
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

/// Get tags data with intelligent caching
/// Only re-parses files that have been modified since last cache
pub fn get_tags_data_with_cache(vault_path: &Path) -> Result<TagsData, String> {
    let cache_path = vault_path.join(CACHE_FILE_NAME);
    let mut cache: TagsCache = if cache_path.exists() {
        match fs::read_to_string(&cache_path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| TagsCache {
                version: CACHE_VERSION,
                files: HashMap::new(),
            }),
            Err(_) => TagsCache {
                version: CACHE_VERSION,
                files: HashMap::new(),
            },
        }
    } else {
        TagsCache {
            version: CACHE_VERSION,
            files: HashMap::new(),
        }
    };

    // If version mismatch, clear cache
    if cache.version != CACHE_VERSION {
        cache = TagsCache {
            version: CACHE_VERSION,
            files: HashMap::new(),
        };
    }

    // Walk vault to find all markdown files
    let mut current_files = HashMap::new();
    walk_dir(vault_path, &mut current_files)?;

    // Track which cached files are still valid
    let mut updated_files = HashSet::new();

    // Process each file
    for (_path_str, path_buf) in &current_files {
        let relative_path = path_buf
            .strip_prefix(vault_path)
            .map_err(|_| "Failed to get relative path")?
            .to_string_lossy()
            .to_string();

        // Get file modification time in milliseconds for better precision
        let modified = path_buf
            .metadata()
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        // Check if we have a valid cache entry
        let needs_update = cache
            .files
            .get(&relative_path)
            .map(|cached| cached.last_modified != modified)
            .unwrap_or(true);

        if needs_update {
            // Read and parse file
            let content = fs::read_to_string(path_buf)
                .map_err(|e| format!("Failed to read {}: {}", relative_path, e))?;

            let tags = extract_tags_from_content(&content);

            cache.files.insert(
                relative_path.clone(),
                CachedFile {
                    path: relative_path.clone(),
                    tags,
                    last_modified: modified,
                },
            );
        }

        updated_files.insert(relative_path);
    }

    // Remove deleted files from cache
    cache.files.retain(|path, _| updated_files.contains(path));

    // Save cache
    let moss_dir = vault_path.join(".moss");
    if !moss_dir.exists() {
        fs::create_dir(&moss_dir).map_err(|e| e.to_string())?;
    }

    let json = serde_json::to_string(&cache).map_err(|e| e.to_string())?;
    fs::write(&cache_path, json).map_err(|e| e.to_string())?;

    // Build TagsData from cache
    let mut tag_map: HashMap<String, TagInfo> = HashMap::new();

    for cached_file in cache.files.values() {
        for tag in &cached_file.tags {
            tag_map
                .entry(tag.clone())
                .and_modify(|info| {
                    info.count += 1;
                    info.files.push(cached_file.path.clone());
                })
                .or_insert(TagInfo {
                    tag: tag.clone(),
                    count: 1,
                    files: vec![cached_file.path.clone()],
                });
        }
    }

    // Convert to sorted vec (by count descending, then alphabetically)
    let mut tags: Vec<TagInfo> = tag_map.into_values().collect();
    tags.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.tag.cmp(&b.tag)));

    Ok(TagsData { tags })
}
