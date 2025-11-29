use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GraphNode {
    pub id: String,
    pub name: String,
    pub val: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GraphLink {
    pub source: String,
    pub target: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<GraphLink>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CachedNode {
    id: String,
    name: String,
    links: Vec<String>, // Target names/paths extracted from wikilinks
    last_modified: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct GraphCache {
    version: u32,
    nodes: HashMap<String, CachedNode>, // Key is file path (id)
}

const CACHE_VERSION: u32 = 1;
const CACHE_FILE_NAME: &str = ".moss/graph_cache.json";

pub fn get_graph_data_with_cache(vault_path: &Path) -> Result<GraphData, String> {
    let cache_path = vault_path.join(CACHE_FILE_NAME);
    let mut cache: GraphCache = if cache_path.exists() {
        match fs::read_to_string(&cache_path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| GraphCache {
                version: CACHE_VERSION,
                nodes: HashMap::new(),
            }),
            Err(_) => GraphCache {
                version: CACHE_VERSION,
                nodes: HashMap::new(),
            },
        }
    } else {
        GraphCache {
            version: CACHE_VERSION,
            nodes: HashMap::new(),
        }
    };

    // If version mismatch, clear cache
    if cache.version != CACHE_VERSION {
        cache = GraphCache {
            version: CACHE_VERSION,
            nodes: HashMap::new(),
        };
    }

    let wikilink_regex =
        Regex::new(r"\[\[([^|\]]+)(?:\|([^\]]+))?\]\]").map_err(|e| e.to_string())?;
    let mut current_files = HashMap::new();

    // 1. Walk directory to find all MD files and check modification times
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

    walk_dir(vault_path, &mut current_files)?;

    // 2. Identify stale/new files and update cache
    let mut cache_dirty = false;

    // Remove deleted files from cache
    let cached_ids: Vec<String> = cache.nodes.keys().cloned().collect();
    for id in cached_ids {
        if !current_files.contains_key(&id) {
            cache.nodes.remove(&id);
            cache_dirty = true;
        }
    }

    // Process current files
    for (id, path) in &current_files {
        let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
        let modified = metadata
            .modified()
            .unwrap_or(SystemTime::UNIX_EPOCH)
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let needs_update = match cache.nodes.get(id) {
            Some(node) => node.last_modified != modified,
            None => true,
        };

        if needs_update {
            let content = fs::read_to_string(path).unwrap_or_default();
            let file_name = path.file_stem().unwrap().to_string_lossy().to_string();
            let mut links = Vec::new();

            for cap in wikilink_regex.captures_iter(&content) {
                let target_name = cap.get(1).map(|m| m.as_str().trim()).unwrap_or("");
                if !target_name.is_empty() {
                    links.push(target_name.to_string());
                }
            }

            cache.nodes.insert(
                id.clone(),
                CachedNode {
                    id: id.clone(),
                    name: file_name,
                    links,
                    last_modified: modified,
                },
            );
            cache_dirty = true;
        }
    }

    // 3. Save cache if dirty
    if cache_dirty {
        // Ensure .moss directory exists
        let moss_dir = vault_path.join(".moss");

        // Migrate from .amber to .moss if .amber exists
        let old_amber_dir = vault_path.join(".amber");
        if old_amber_dir.exists() && !moss_dir.exists() {
            // Try to rename .amber to .moss
            if let Err(_) = fs::rename(&old_amber_dir, &moss_dir) {
                // If rename fails, create .moss dir manually
                fs::create_dir(&moss_dir).map_err(|e| e.to_string())?;
            }
        } else if !moss_dir.exists() {
            fs::create_dir(&moss_dir).map_err(|e| e.to_string())?;
        }

        // Hide .moss directory on Windows (optional, but good practice)
        // On Mac/Linux starting with dot is enough.

        let json = serde_json::to_string(&cache).map_err(|e| e.to_string())?;
        fs::write(&cache_path, json).map_err(|e| e.to_string())?;
    }

    // 4. Build GraphData from cache
    // We need to resolve link targets (names) to IDs
    let mut name_to_id: HashMap<String, String> = HashMap::new();

    for node in cache.nodes.values() {
        // 1. Map exact filename (without extension) -> ID
        // e.g. "Note" -> "/path/to/Folder/Note.md"
        name_to_id.insert(node.name.clone(), node.id.clone());

        // 2. Map relative path (without extension) -> ID
        // e.g. "Folder/Note" -> "/path/to/Folder/Note.md"
        if let Ok(path) = Path::new(&node.id).strip_prefix(vault_path) {
            let relative_path = path.to_string_lossy().to_string();
            // Remove .md extension if present
            let clean_path = relative_path.trim_end_matches(".md").to_string();
            name_to_id.insert(clean_path.clone(), node.id.clone());

            // Also map with extension just in case
            name_to_id.insert(relative_path, node.id.clone());
        }
    }

    let mut nodes_map: HashMap<String, GraphNode> = HashMap::new();
    let mut final_links: Vec<GraphLink> = Vec::new();

    for cached_node in cache.nodes.values() {
        // Add node
        nodes_map
            .entry(cached_node.id.clone())
            .or_insert(GraphNode {
                id: cached_node.id.clone(),
                name: cached_node.name.clone(),
                val: 1, // Base weight
            });

        // Process links
        for target_name in &cached_node.links {
            // Resolve target ID
            let target_id = name_to_id
                .get(target_name)
                .or_else(|| name_to_id.get(&format!("{}.md", target_name)))
                .or_else(|| name_to_id.get(&target_name.replace(".md", "")));

            if let Some(tid) = target_id {
                final_links.push(GraphLink {
                    source: cached_node.id.clone(),
                    target: tid.clone(),
                });

                // Increment weight of target
                if let Some(node) = nodes_map.get_mut(tid) {
                    node.val += 1;
                }
            }
        }
    }

    Ok(GraphData {
        nodes: nodes_map.into_values().collect(),
        links: final_links,
    })
}
