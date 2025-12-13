use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::command;

const TEMPLATES_DIR: &str = ".moss/templates";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Template {
    pub name: String,
    pub path: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TemplateVars {
    pub title: Option<String>,
    pub date: Option<String>,
    pub time: Option<String>,
    pub year: Option<String>,
    pub month: Option<String>,
    pub day: Option<String>,
}

/// List all templates in the vault's .moss/templates directory
#[command]
pub async fn list_templates(vault_path: String) -> Result<Vec<Template>, String> {
    let vault = Path::new(&vault_path);

    if !vault.exists() || !vault.is_dir() {
        return Err(format!(
            "Vault path '{}' does not exist or is not a directory",
            vault_path
        ));
    }

    let templates_dir = vault.join(TEMPLATES_DIR);

    // Create templates directory if it doesn't exist
    if !templates_dir.exists() {
        fs::create_dir_all(&templates_dir)
            .map_err(|e| format!("Failed to create templates directory: {}", e))?;
    }

    let mut templates = Vec::new();

    // Read all .md files in templates directory
    if let Ok(entries) = fs::read_dir(&templates_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();

                if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
                    if let Some(name) = path.file_stem() {
                        let name_str = name.to_string_lossy().to_string();

                        // Read template content for preview
                        match fs::read_to_string(&path) {
                            Ok(content) => {
                                templates.push(Template {
                                    name: name_str,
                                    path: path.to_string_lossy().to_string(),
                                    content,
                                });
                            }
                            Err(e) => {
                                eprintln!("Failed to read template '{}': {}", name_str, e);
                            }
                        }
                    }
                }
            }
        }
    }

    // Sort alphabetically by name
    templates.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(templates)
}

/// Get a specific template by name
#[command]
pub async fn get_template(vault_path: String, template_name: String) -> Result<String, String> {
    let vault = Path::new(&vault_path);
    let templates_dir = vault.join(TEMPLATES_DIR);

    // Try with and without .md extension
    let template_path = if template_name.ends_with(".md") {
        templates_dir.join(&template_name)
    } else {
        templates_dir.join(format!("{}.md", template_name))
    };

    if !template_path.exists() {
        return Err(format!("Template '{}' not found", template_name));
    }

    fs::read_to_string(&template_path).map_err(|e| format!("Failed to read template: {}", e))
}

/// Substitute variables in template content
fn substitute_variables(content: String, title: String, vars: Option<TemplateVars>) -> String {
    let now = Local::now();

    let mut result = content;

    // Use provided vars or generate defaults
    let date = vars
        .as_ref()
        .and_then(|v| v.date.clone())
        .unwrap_or_else(|| now.format("%Y-%m-%d").to_string());
    let time = vars
        .as_ref()
        .and_then(|v| v.time.clone())
        .unwrap_or_else(|| now.format("%H:%M").to_string());
    let year = vars
        .as_ref()
        .and_then(|v| v.year.clone())
        .unwrap_or_else(|| now.format("%Y").to_string());
    let month = vars
        .as_ref()
        .and_then(|v| v.month.clone())
        .unwrap_or_else(|| now.format("%m").to_string());
    let day = vars
        .as_ref()
        .and_then(|v| v.day.clone())
        .unwrap_or_else(|| now.format("%d").to_string());

    // Perform substitutions
    result = result.replace("{{title}}", &title);
    result = result.replace("{{date}}", &date);
    result = result.replace("{{time}}", &time);
    result = result.replace("{{year}}", &year);
    result = result.replace("{{month}}", &month);
    result = result.replace("{{day}}", &day);

    result
}

/// Create a note from a template
#[command]
pub async fn create_note_from_template(
    vault_path: String,
    template_name: String,
    note_title: String,
    parent_path: Option<String>,
    vars: Option<TemplateVars>,
) -> Result<String, String> {
    let vault = Path::new(&vault_path);

    // Load template content
    let template_content = get_template(vault_path.clone(), template_name.clone()).await?;

    // Substitute variables
    let final_content = substitute_variables(template_content, note_title.clone(), vars);

    // Determine note path
    let folder_path = parent_path.unwrap_or(vault_path.clone());
    let note_filename = if note_title.ends_with(".md") {
        note_title.clone()
    } else {
        format!("{}.md", note_title)
    };

    let note_path = Path::new(&folder_path).join(&note_filename);

    // Check if file already exists (uniqueness check)
    let mut final_path = note_path.clone();
    let mut counter = 1;
    while final_path.exists() {
        let name_without_ext = note_title.clone();
        let unique_name = format!("{} {}", name_without_ext, counter);
        final_path = Path::new(&folder_path).join(format!("{}.md", unique_name));
        counter += 1;
    }

    // Create parent directories if needed
    if let Some(parent) = final_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
    }

    // Write file
    fs::write(&final_path, final_content)
        .map_err(|e| format!("Failed to create note from template: {}", e))?;

    // Auto-commit if Git repository
    if let Some(repo) = crate::git_manager::open_repository(vault) {
        let _ = crate::git_manager::auto_commit_mosaic_changes(
            &repo,
            &format!("Created {} from template {}", note_filename, template_name),
            &[&final_path],
        ); // Silently fail if commit fails
    }

    Ok(final_path.to_string_lossy().to_string())
}
