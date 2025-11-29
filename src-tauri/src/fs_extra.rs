use regex::Regex;
use std::fs;
use std::path::Path;
use tauri::command;

#[command]
pub async fn rename_note(
    vault_path: String,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    let old_p = Path::new(&old_path);
    let new_p = Path::new(&new_path);
    let vault_p = Path::new(&vault_path);

    if !old_p.exists() {
        return Err(format!("Source file '{}' does not exist", old_path));
    }

    if new_p.exists() {
        return Err(format!("Destination file '{}' already exists", new_path));
    }

    // 1. Rename the file itself
    fs::rename(old_p, new_p).map_err(|e| format!("Failed to rename file: {}", e))?;

    // 2. Calculate relative paths and filenames
    let old_rel_path = old_p
        .strip_prefix(vault_p)
        .map_err(|_| "Failed to calculate relative path")?
        .to_string_lossy()
        .to_string();

    let new_rel_path = new_p
        .strip_prefix(vault_p)
        .map_err(|_| "Failed to calculate relative path")?
        .to_string_lossy()
        .to_string();

    // Remove .md extension for linking
    let old_link_path = old_rel_path.trim_end_matches(".md");
    let new_link_path = new_rel_path.trim_end_matches(".md");

    let old_name = old_p.file_stem().and_then(|s| s.to_str()).unwrap_or("");
    let new_name = new_p.file_stem().and_then(|s| s.to_str()).unwrap_or("");

    // 3. Update links in all other files
    update_links_in_vault(vault_p, old_name, new_name, old_link_path, new_link_path)?;

    Ok(())
}

fn update_links_in_vault(
    dir: &Path,
    old_name: &str,
    new_name: &str,
    old_link_path: &str,
    new_link_path: &str,
) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read dir: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_dir() {
            // Skip hidden
            if path
                .file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.starts_with('.'))
                .unwrap_or(false)
            {
                continue;
            }
            update_links_in_vault(&path, old_name, new_name, old_link_path, new_link_path)?;
        } else if path.is_file() {
            if path.extension().and_then(|s| s.to_str()) == Some("md") {
                process_file(&path, old_name, new_name, old_link_path, new_link_path)?;
            }
        }
    }

    Ok(())
}

fn process_file(
    path: &Path,
    old_name: &str,
    new_name: &str,
    old_link_path: &str,
    new_link_path: &str,
) -> Result<(), String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mut new_content = content.clone();
    let mut changed = false;

    // Strategy:
    // 1. Replace exact filename matches: [[OldName]] -> [[NewName]]
    // 2. Replace path matches: [[Folder/OldName]] -> [[Folder/NewName]] (or new path)

    // Case 1: Filename match [[OldName]] or [[OldName|Alias]]
    // Only if old_name is not empty
    if !old_name.is_empty() {
        let pattern = format!(r"\[\[\s*{}\s*(\|[^\]]*)?\]\]", regex::escape(old_name));
        if let Ok(re) = Regex::new(&pattern) {
            if re.is_match(&new_content) {
                new_content = re
                    .replace_all(&new_content, |caps: &regex::Captures| {
                        let suffix = caps.get(1).map(|m| m.as_str()).unwrap_or("");
                        format!("[[{}{}]]", new_name, suffix)
                    })
                    .to_string();
                changed = true;
            }
        }
    }

    // Case 2: Path match [[Folder/OldName]]
    // We use old_link_path which is "Folder/OldName"
    if old_link_path != old_name {
        // Avoid double replacement if path == name (root file)
        let pattern = format!(r"\[\[\s*{}\s*(\|[^\]]*)?\]\]", regex::escape(old_link_path));
        if let Ok(re) = Regex::new(&pattern) {
            if re.is_match(&new_content) {
                new_content = re
                    .replace_all(&new_content, |caps: &regex::Captures| {
                        let suffix = caps.get(1).map(|m| m.as_str()).unwrap_or("");
                        format!("[[{}{}]]", new_link_path, suffix)
                    })
                    .to_string();
                changed = true;
            }
        }
    }

    if changed {
        fs::write(path, new_content).map_err(|e| e.to_string())?;
    }

    Ok(())
}
