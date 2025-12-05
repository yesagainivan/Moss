use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use notify_debouncer_full::{new_debouncer, DebouncedEvent, Debouncer, FileIdMap};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{Emitter, State};

pub struct WatcherState {
    pub watcher: Arc<Mutex<Option<Debouncer<RecommendedWatcher, FileIdMap>>>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            watcher: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub async fn watch_vault(
    app_handle: tauri::AppHandle,
    state: State<'_, WatcherState>,
    vault_path: String,
) -> Result<(), String> {
    let path = Path::new(&vault_path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", vault_path));
    }

    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;

    // Stop existing watcher if any
    if watcher_guard.is_some() {
        *watcher_guard = None;
    }

    let app_handle_clone = app_handle.clone();

    // Create a new debouncer
    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        None,
        move |result: Result<Vec<DebouncedEvent>, _>| {
            match result {
                Ok(events) => {
                    // We only care that *something* changed to trigger a refresh
                    if !events.is_empty() {
                        // Filter out events related to .git
                        let has_relevant_changes = events.iter().any(|e| {
                            e.paths.iter().any(|p| {
                                !p.components().any(|c| {
                                    let s = c.as_os_str().to_string_lossy();
                                    s == ".git" || s == ".moss"
                                })
                            })
                        });

                        if has_relevant_changes {
                            let _ = app_handle_clone.emit("file-changed", ());
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Watch error: {:?}", e);
                }
            }
        },
    )
    .map_err(|e| format!("Failed to create watcher: {:?}", e))?;

    // Add path to watcher
    debouncer
        .watcher()
        .watch(path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch path: {:?}", e))?;

    debouncer.cache().add_root(path, RecursiveMode::Recursive);

    *watcher_guard = Some(debouncer);

    Ok(())
}
