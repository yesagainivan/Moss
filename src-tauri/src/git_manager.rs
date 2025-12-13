use git2::{Error as GitError, Oid, Repository, Signature};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;

/// Git integration module for Moss
///
/// Provides version control features:
/// - Auto-commit for Mosaic changes
/// - Manual commit/undo for users
/// - History viewing
/// - Repository management

// ============================================================================
// Repository Management
// ============================================================================

/// Check if a path is a Git repository
pub fn is_git_repository(vault_path: &Path) -> bool {
    Repository::open(vault_path).is_ok()
}

/// Open existing repository or return None
pub fn open_repository(vault_path: &Path) -> Option<Repository> {
    let repo = Repository::open(vault_path).ok();
    if repo.is_some() {
        let _ = ensure_gitignore(vault_path);
    }
    repo
}

pub fn ensure_gitignore(vault_path: &Path) -> std::io::Result<()> {
    let gitignore_path = vault_path.join(".gitignore");
    let default_ignores = [".moss/", ".DS_Store"];

    if !gitignore_path.exists() {
        if let Ok(mut file) = std::fs::File::create(&gitignore_path) {
            for ignore in &default_ignores {
                writeln!(file, "{}", ignore)?;
            }
        }
    } else {
        // Append if not exists
        let content = std::fs::read_to_string(&gitignore_path)?;
        let mut file = None;

        for ignore in &default_ignores {
            if !content.contains(ignore) {
                if file.is_none() {
                    file = Some(OpenOptions::new().append(true).open(&gitignore_path)?);
                }

                if let Some(ref mut f) = file {
                    writeln!(f, "{}", ignore)?;
                }
            }
        }
    }
    Ok(())
}

/// Initialize a new Git repository
pub fn init_repository(vault_path: &Path) -> Result<Repository, GitError> {
    let repo = Repository::init(vault_path)?;
    let _ = ensure_gitignore(vault_path);
    Ok(repo)
}

/// Internal helper to create a commit
fn create_commit_internal(
    repo: &Repository,
    message: &str,
    tree: &git2::Tree,
    author_name: &str,
    author_email: &str,
) -> Result<Oid, GitError> {
    // Get HEAD commit (parent)
    let parent_commit = match repo.head() {
        Ok(head) => {
            let oid = head
                .target()
                .ok_or_else(|| GitError::from_str("HEAD target is not valid"))?;
            Some(repo.find_commit(oid)?)
        }
        Err(_) => None, // First commit
    };

    // Create signature
    let signature = Signature::now(author_name, author_email)?;

    // Create commit
    if let Some(parent) = parent_commit {
        repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            message,
            tree,
            &[&parent],
        )
    } else {
        // Initial commit
        repo.commit(Some("HEAD"), &signature, &signature, message, tree, &[])
    }
}

// ============================================================================
// Commit Operations
// ============================================================================

/// Auto-commit changes made by Mosaic
///
/// Creates a commit with all changes in the specified files.
/// Commit message format: "Mosaic: {action}"
pub fn auto_commit_mosaic_changes(
    repo: &Repository,
    message: &str,
    files: &[&Path],
) -> Result<Oid, GitError> {
    // Stage files
    let mut index = repo.index()?;
    for file_path in files {
        // Get relative path from repo root
        let repo_path = repo.path().parent().unwrap();
        let relative_path = file_path.strip_prefix(repo_path).unwrap_or(file_path);

        index.add_path(relative_path)?;
    }
    index.write()?;

    // Create commit
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    // Commit message with Mosaic prefix and timestamp
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();
    let full_message = format!("Mosaic: {} ({})", message, timestamp);

    create_commit_internal(
        repo,
        &full_message,
        &tree,
        "Mosaic",
        "mosaic@amber-app.local",
    )
}

/// Create a manual commit for specific files
pub fn commit_file(repo: &Repository, message: &str, file_path: &Path) -> Result<Oid, GitError> {
    // Stage file
    let mut index = repo.index()?;

    // Get relative path from repo root
    let repo_path = repo.path().parent().unwrap();
    let relative_path = file_path.strip_prefix(repo_path).unwrap_or(file_path);

    index.add_path(relative_path)?;
    index.write()?;

    // Create commit
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    create_commit_internal(repo, message, &tree, "User", "user@amber-app.local")
}

/// Create a manual commit for ALL changes in the vault
pub fn commit_all_changes(repo: &Repository, message: &str) -> Result<Oid, GitError> {
    // Stage all changes
    let mut index = repo.index()?;

    // Add all files (including new, modified, deleted)
    // "*" matches everything.
    // We use DEFAULT option which is what we want.
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.write()?;

    // Create commit
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    create_commit_internal(repo, message, &tree, "User", "user@amber-app.local")
}

/// Restore vault to a specific commit (safe, creates new commit)
///
/// This does NOT use destructive git reset. Instead:
/// 1. Checks out the target commit's tree
/// 2. Creates a new commit with that tree as current state
/// 3. Preserves all history
pub fn restore_vault_to_commit(repo: &Repository, commit_oid: &str) -> Result<Oid, GitError> {
    // Check for uncommitted changes first
    if has_uncommitted_changes(repo)? {
        return Err(GitError::from_str(
            "Cannot restore: you have uncommitted changes. Please commit or discard them first.",
        ));
    }

    // Parse and validate commit OID
    let target_oid = Oid::from_str(commit_oid)?;
    let target_commit = repo.find_commit(target_oid)?;
    let target_tree = target_commit.tree()?;

    // Get current HEAD for parent reference
    let head = repo.head()?;
    let current_commit = head.peel_to_commit()?;

    // Reset index and working directory to target tree
    // This is the "checkout" part - it updates files on disk
    let mut checkout_builder = git2::build::CheckoutBuilder::new();
    checkout_builder.force(); // Force checkout to overwrite any local changes
    checkout_builder.remove_untracked(true); // Remove untracked files
    checkout_builder.remove_ignored(false); // Keep ignored files

    repo.checkout_tree(target_tree.as_object(), Some(&mut checkout_builder))?;

    // Update index to match the target tree
    let mut index = repo.index()?;
    index.read_tree(&target_tree)?;
    index.write()?;

    // Create a new commit with the restored state
    let signature = Signature::now("User", "user@amber-app.local")?;
    let target_message = target_commit.message().unwrap_or("Unknown");
    let restore_message = format!(
        "Restored vault to: {} ({})",
        target_message,
        &commit_oid[..8]
    );

    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    let new_commit_oid = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        &restore_message,
        &tree,
        &[&current_commit],
    )?;

    Ok(new_commit_oid)
}

/// Revert the last commit made by Mosaic
///
/// Uses `git revert` (safe, creates new commit) instead of `git reset` (destructive).
/// Only reverts commits with "Mosaic:" prefix for safety.
pub fn undo_last_mosaic_commit(repo: &Repository) -> Result<Oid, GitError> {
    // Get HEAD commit
    let head = repo.head()?;
    let head_commit = head.peel_to_commit()?;

    // Check if this is an Mosaic commit
    let message = head_commit.message().unwrap_or("");
    if !message.starts_with("Mosaic:") {
        return Err(GitError::from_str(
            "Last commit was not made by Mosaic. Cannot undo.",
        ));
    }

    // Get parent commit (what we're reverting to)
    let parent_commit = head_commit.parent(0)?;

    // Create revert commit
    let mut index = repo.index()?;
    let parent_tree = parent_commit.tree()?;

    // Reset index to parent state
    index.read_tree(&parent_tree)?;
    index.write()?;

    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    let signature = Signature::now("Mosaic", "mosaic@amber-app.local")?;
    let revert_message = format!("Revert: {}", message);

    let commit_oid = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        &revert_message,
        &tree,
        &[&head_commit],
    )?;

    Ok(commit_oid)
}

// ============================================================================
// History & Status
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CommitInfo {
    pub oid: String,
    pub message: String,
    pub author: String,
    pub timestamp: i64,
    pub is_mosaic: bool,
    pub stats: Option<CommitStats>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CommitStats {
    pub files_changed: usize,
    pub insertions: usize,
    pub deletions: usize,
    pub file_paths: Vec<String>,
}

/// Get commit history, optionally filtered to Mosaic commits only and/or specific file
pub fn get_commit_history(
    repo: &Repository,
    limit: usize,
    mosaic_only: bool,
    file_path: Option<&Path>,
    include_stats: bool,
) -> Result<Vec<CommitInfo>, GitError> {
    let mut revwalk = repo.revwalk()?;

    // Try to push HEAD, if it fails (no commits or invalid HEAD), return empty history
    if revwalk.push_head().is_err() {
        return Ok(Vec::new());
    }

    revwalk.set_sorting(git2::Sort::TIME)?;

    let mut commits = Vec::new();
    let mut count = 0;

    for oid in revwalk {
        if count >= limit {
            break;
        }

        let oid = oid?;
        let commit = repo.find_commit(oid)?;
        let message = commit.message().unwrap_or("").to_string();
        let is_mosaic = message.starts_with("Mosaic:");

        if mosaic_only && !is_mosaic {
            continue;
        }

        // Filter by file path if provided
        if let Some(path) = file_path {
            let tree = commit.tree()?;

            // Get parent tree (or empty tree if no parent)
            let parent_tree = match commit.parent(0) {
                Ok(parent) => Some(parent.tree()?),
                Err(_) => None,
            };

            // Check if file changed between parent and this commit
            let mut diff_opts = git2::DiffOptions::new();
            diff_opts.pathspec(path);

            let diff =
                repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut diff_opts))?;

            // If no deltas, file didn't change in this commit
            if diff.deltas().len() == 0 {
                continue;
            }
        }

        // Optionally compute stats
        let stats = if include_stats {
            match compute_commit_stats(repo, &commit) {
                Ok(s) => Some(s),
                Err(_) => None,
            }
        } else {
            None
        };

        commits.push(CommitInfo {
            oid: oid.to_string(),
            message,
            author: commit.author().name().unwrap_or("Unknown").to_string(),
            timestamp: commit.time().seconds(),
            is_mosaic,
            stats,
        });

        count += 1;
    }

    Ok(commits)
}

/// Get the content of a file at a specific commit
pub fn get_file_content_at_commit(
    repo: &Repository,
    commit_oid: &str,
    file_path: &str, // Changed from &Path to &str since Git uses forward slashes
) -> Result<String, GitError> {
    let oid = Oid::from_str(commit_oid)?;
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;

    // Git always uses forward slashes, so use the string directly
    // Don't convert to Path which uses OS-specific separators
    let entry = tree.get_path(Path::new(file_path))?;
    let object = entry.to_object(repo)?;

    if let Some(blob) = object.as_blob() {
        // Convert blob content to string
        let content = std::str::from_utf8(blob.content())
            .map_err(|_| GitError::from_str("File content is not valid UTF-8"))?;
        Ok(content.to_string())
    } else {
        Err(GitError::from_str("Path is not a file (blob)"))
    }
}

/// Check if there are uncommitted changes
pub fn has_uncommitted_changes(repo: &Repository) -> Result<bool, GitError> {
    let statuses = repo.statuses(None)?;
    Ok(!statuses.is_empty())
}

/// Compute aggregated diff stats for a commit
fn compute_commit_stats(repo: &Repository, commit: &git2::Commit) -> Result<CommitStats, GitError> {
    let commit_tree = commit.tree()?;

    // Get parent tree (or None if this is the first commit)
    let parent_tree = match commit.parent(0) {
        Ok(parent) => Some(parent.tree()?),
        Err(_) => None,
    };

    // Create diff between parent and this commit
    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&commit_tree), None)?;

    let mut total_insertions = 0;
    let mut total_deletions = 0;
    let mut file_paths = Vec::new();
    let files_changed = diff.deltas().len();

    // Aggregate stats from all deltas
    for (delta_idx, delta) in diff.deltas().enumerate() {
        // Collect file path
        let path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .and_then(|p| p.to_str())
            .unwrap_or("unknown")
            .to_string();

        file_paths.push(path);

        if let Ok(Some(patch)) = git2::Patch::from_diff(&diff, delta_idx) {
            if let Ok((_context, adds, dels)) = patch.line_stats() {
                total_insertions += adds;
                total_deletions += dels;
            }
        }
    }

    Ok(CommitStats {
        files_changed,
        insertions: total_insertions,
        deletions: total_deletions,
        file_paths,
    })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileChange {
    pub path: String,
    pub status: String, // "added", "modified", "deleted"
    pub additions: usize,
    pub deletions: usize,
}

/// Get the list of changed files for a specific commit
pub fn get_commit_changes(
    repo: &Repository,
    commit_oid: &str,
) -> Result<Vec<FileChange>, GitError> {
    let oid = Oid::from_str(commit_oid)?;
    let commit = repo.find_commit(oid)?;
    let commit_tree = commit.tree()?;

    // Get parent tree (or None if this is the first commit)
    let parent_tree = match commit.parent(0) {
        Ok(parent) => Some(parent.tree()?),
        Err(_) => None,
    };

    // Create diff between parent and this commit
    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&commit_tree), None)?;

    let mut changes = Vec::new();

    // Iterate through deltas using patches to get per-file stats
    for (delta_idx, delta) in diff.deltas().enumerate() {
        let status = match delta.status() {
            git2::Delta::Added => "added",
            git2::Delta::Deleted => "deleted",
            git2::Delta::Modified => "modified",
            git2::Delta::Renamed => "renamed",
            git2::Delta::Copied => "copied",
            _ => "unknown",
        };

        let path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .and_then(|p| p.to_str())
            .unwrap_or("unknown")
            .to_string();

        // Get per-file stats using patch
        let (additions, deletions) = match git2::Patch::from_diff(&diff, delta_idx) {
            Ok(Some(patch)) => match patch.line_stats() {
                Ok((_context, adds, dels)) => (adds, dels),
                Err(_) => (0, 0),
            },
            _ => (0, 0),
        };

        changes.push(FileChange {
            path,
            status: status.to_string(),
            additions,
            deletions,
        });
    }

    Ok(changes)
}

// ============================================================================
// Remote Operations (GitHub Sync)
// ============================================================================

use git2::{Cred, FetchOptions, PushOptions, RemoteCallbacks};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SyncStatus {
    pub ahead: usize,
    pub behind: usize,
    pub up_to_date: bool,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ConflictInfo {
    pub path: String,
    pub ancestor: Option<String>,
    pub ours: String,
    pub theirs: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ConflictResolution {
    pub has_conflicts: bool,
    pub conflicts: Vec<ConflictInfo>,
    pub sync_status: SyncStatus,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum ResolutionType {
    KeepOurs,
    KeepTheirs,
    Manual,
}

/// Configure remote URL for the repository
pub fn configure_remote(repo: &Repository, url: &str) -> Result<(), GitError> {
    // Remove existing remote if it exists
    match repo.find_remote("origin") {
        Ok(_) => repo.remote_delete("origin")?,
        Err(_) => {} // Remote doesn't exist, that's fine
    }

    // Add new remote
    repo.remote("origin", url)?;
    Ok(())
}

/// Create credentials callback for GitHub authentication
fn create_credentials_callback<'a>(token: &'a str) -> RemoteCallbacks<'a> {
    let token_clone = token.to_string();
    let mut callbacks = RemoteCallbacks::new();

    callbacks.credentials(move |_url, _username_from_url, _allowed_types| {
        // For HTTPS, use the token as password with empty username
        Cred::userpass_plaintext("x-access-token", &token_clone)
    });

    callbacks
}

/// Push local commits to remote
pub fn push_to_remote(repo: &Repository, token: &str) -> Result<(), GitError> {
    let mut remote = repo.find_remote("origin")?;

    // Get current branch name
    let head = repo.head()?;
    let branch_name = head
        .shorthand()
        .ok_or_else(|| GitError::from_str("Could not determine current branch"))?;

    let refspec = format!("refs/heads/{}:refs/heads/{}", branch_name, branch_name);

    let callbacks = create_credentials_callback(token);
    let mut push_options = PushOptions::new();
    push_options.remote_callbacks(callbacks);

    remote.push(&[refspec.as_str()], Some(&mut push_options))?;
    Ok(())
}

/// Fetch from remote (doesn't merge)
pub fn fetch_remote(repo: &Repository, token: &str) -> Result<(), GitError> {
    let mut remote = repo.find_remote("origin")?;

    let callbacks = create_credentials_callback(token);
    let mut fetch_options = FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);

    remote.fetch(
        &["refs/heads/*:refs/remotes/origin/*"],
        Some(&mut fetch_options),
        None,
    )?;
    Ok(())
}

/// Pull from remote (fetch + merge)
/// Returns ConflictResolution which may contain conflicts if merge cannot fast-forward
pub fn pull_from_remote(repo: &Repository, token: &str) -> Result<ConflictResolution, GitError> {
    // First fetch
    fetch_remote(repo, token)?;

    // Get current branch
    let head = repo.head()?;
    let branch_name = head
        .shorthand()
        .ok_or_else(|| GitError::from_str("Could not determine current branch"))?;

    // Try to find remote branch
    let remote_branch_name = format!("refs/remotes/origin/{}", branch_name);
    let remote_ref = match repo.find_reference(&remote_branch_name) {
        Ok(r) => r,
        Err(_) => {
            // Remote branch doesn't exist yet (empty repo on first push)
            // This is fine - we'll just push without pulling
            return Ok(ConflictResolution {
                has_conflicts: false,
                conflicts: Vec::new(),
                sync_status: get_sync_status(repo)?,
            });
        }
    };

    let remote_commit = remote_ref.peel_to_commit()?;

    // Create annotated commit for merge analysis
    let annotated_commit = repo.find_annotated_commit(remote_commit.id())?;

    // Try fast-forward merge
    let (merge_analysis, _) = repo.merge_analysis(&[&annotated_commit])?;

    if merge_analysis.is_up_to_date() {
        // Already up to date
        return Ok(ConflictResolution {
            has_conflicts: false,
            conflicts: Vec::new(),
            sync_status: get_sync_status(repo)?,
        });
    }

    if merge_analysis.is_fast_forward() {
        // Fast-forward merge
        let refname = format!("refs/heads/{}", branch_name);
        let mut reference = repo.find_reference(&refname)?;
        reference.set_target(remote_commit.id(), "Fast-forward merge")?;
        repo.set_head(&refname)?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
        return Ok(ConflictResolution {
            has_conflicts: false,
            conflicts: Vec::new(),
            sync_status: get_sync_status(repo)?,
        });
    }

    // Normal merge needed (may have conflicts)
    repo.merge(&[&annotated_commit], None, None)?;

    // Check for conflicts
    let index = repo.index()?;
    if index.has_conflicts() {
        // Extract conflict information
        let conflicts = extract_conflicts(repo)?;

        return Ok(ConflictResolution {
            has_conflicts: true,
            conflicts,
            sync_status: get_sync_status(repo)?,
        });
    }

    // No conflicts - complete the merge
    complete_merge_internal(repo, &remote_commit)?;

    Ok(ConflictResolution {
        has_conflicts: false,
        conflicts: Vec::new(),
        sync_status: get_sync_status(repo)?,
    })
}

/// Extract conflict information from repository index
fn extract_conflicts(repo: &Repository) -> Result<Vec<ConflictInfo>, GitError> {
    let index = repo.index()?;
    let mut conflicts = Vec::new();

    for conflict in index.conflicts()? {
        let conflict = conflict?;

        // Get file path from one of the conflict entries
        let path = if let Some(our) = &conflict.our {
            our.path.clone()
        } else if let Some(their) = &conflict.their {
            their.path.clone()
        } else if let Some(ancestor) = &conflict.ancestor {
            ancestor.path.clone()
        } else {
            continue; // Skip if no path available
        };

        let path_str = String::from_utf8_lossy(&path).to_string();

        // Get ancestor content (common base)
        let ancestor_content = if let Some(ancestor_entry) = &conflict.ancestor {
            let blob = repo.find_blob(ancestor_entry.id)?;
            Some(String::from_utf8_lossy(blob.content()).to_string())
        } else {
            None
        };

        // Get "ours" content (local)
        let ours_content = if let Some(our_entry) = &conflict.our {
            let blob = repo.find_blob(our_entry.id)?;
            String::from_utf8_lossy(blob.content()).to_string()
        } else {
            String::new()
        };

        // Get "theirs" content (remote)
        let theirs_content = if let Some(their_entry) = &conflict.their {
            let blob = repo.find_blob(their_entry.id)?;
            String::from_utf8_lossy(blob.content()).to_string()
        } else {
            String::new()
        };

        conflicts.push(ConflictInfo {
            path: path_str,
            ancestor: ancestor_content,
            ours: ours_content,
            theirs: theirs_content,
        });
    }

    Ok(conflicts)
}

/// Internal helper to complete merge with a commit
fn complete_merge_internal(
    repo: &Repository,
    remote_commit: &git2::Commit,
) -> Result<git2::Oid, GitError> {
    let mut index = repo.index()?;
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    let head = repo.head()?;
    let local_commit = head.peel_to_commit()?;

    let signature = Signature::now("User", "user@amber-app.local")?;
    let message = format!(
        "Merge remote-tracking branch 'origin/{}'",
        head.shorthand().unwrap_or("main")
    );

    let commit_oid = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        &message,
        &tree,
        &[&local_commit, remote_commit],
    )?;

    // Clean up merge state
    repo.cleanup_state()?;

    Ok(commit_oid)
}

/// Get sync status (ahead/behind counts)
pub fn get_sync_status(repo: &Repository) -> Result<SyncStatus, GitError> {
    let head = repo.head()?;
    let branch_name = head
        .shorthand()
        .ok_or_else(|| GitError::from_str("Could not determine current branch"))?;

    // Try to find remote branch
    let remote_branch_name = format!("refs/remotes/origin/{}", branch_name);
    let remote_ref = match repo.find_reference(&remote_branch_name) {
        Ok(r) => r,
        Err(_) => {
            // Remote branch doesn't exist yet (never pushed)
            return Ok(SyncStatus {
                ahead: repo.revwalk()?.count(),
                behind: 0,
                up_to_date: false,
            });
        }
    };

    let local_commit = head.peel_to_commit()?;
    let remote_commit = remote_ref.peel_to_commit()?;

    // Count commits ahead
    let (ahead, behind) = repo.graph_ahead_behind(local_commit.id(), remote_commit.id())?;

    Ok(SyncStatus {
        ahead,
        behind,
        up_to_date: ahead == 0 && behind == 0,
    })
}

/// Sync vault: pull then push
/// Returns ConflictResolution which may indicate conflicts that need resolution
pub fn sync_vault(repo: &Repository, token: &str) -> Result<ConflictResolution, GitError> {
    // Pull first (may return conflicts)
    let pull_result = pull_from_remote(repo, token)?;

    // If there are conflicts, return them without pushing
    if pull_result.has_conflicts {
        return Ok(pull_result);
    }

    // No conflicts - proceed with push
    push_to_remote(repo, token)?;

    // Return updated status
    Ok(ConflictResolution {
        has_conflicts: false,
        conflicts: Vec::new(),
        sync_status: get_sync_status(repo)?,
    })
}

/// Resolve a conflict by choosing a resolution strategy
pub fn resolve_conflict(
    repo: &Repository,
    file_path: &str,
    resolution_type: ResolutionType,
    custom_content: Option<String>,
) -> Result<(), GitError> {
    let repo_path = repo.path().parent().unwrap();
    let full_path = repo_path.join(file_path);

    // Determine content to write based on resolution type
    let content = match resolution_type {
        ResolutionType::KeepOurs => {
            // Get "ours" version blob ID from index
            let index = repo.index()?;
            let mut ours_blob_id = None;

            for conflict in index.conflicts()? {
                let conflict = conflict?;
                if let Some(our) = &conflict.our {
                    if String::from_utf8_lossy(&our.path) == file_path {
                        ours_blob_id = Some(our.id);
                        break;
                    }
                }
            }

            // Now fetch the blob content (index borrow is dropped)
            if let Some(blob_id) = ours_blob_id {
                let blob = repo.find_blob(blob_id)?;
                String::from_utf8_lossy(blob.content()).to_string()
            } else {
                return Err(GitError::from_str(
                    "Conflict not found or no 'ours' version available",
                ));
            }
        }
        ResolutionType::KeepTheirs => {
            // Get "theirs" version blob ID from index
            let index = repo.index()?;
            let mut theirs_blob_id = None;

            for conflict in index.conflicts()? {
                let conflict = conflict?;
                if let Some(their) = &conflict.their {
                    if String::from_utf8_lossy(&their.path) == file_path {
                        theirs_blob_id = Some(their.id);
                        break;
                    }
                }
            }

            // Now fetch the blob content (index borrow is dropped)
            if let Some(blob_id) = theirs_blob_id {
                let blob = repo.find_blob(blob_id)?;
                String::from_utf8_lossy(blob.content()).to_string()
            } else {
                return Err(GitError::from_str(
                    "Conflict not found or no 'theirs' version available",
                ));
            }
        }
        ResolutionType::Manual => custom_content
            .ok_or_else(|| GitError::from_str("Manual resolution requires custom content"))?,
    };

    // Write resolved content to file
    std::fs::write(&full_path, content)
        .map_err(|e| GitError::from_str(&format!("Failed to write resolved content: {}", e)))?;

    // Stage the resolved file
    let mut index = repo.index()?;
    index.add_path(Path::new(file_path))?;
    index.write()?;

    Ok(())
}

/// Complete merge after all conflicts are resolved
/// Creates the merge commit and cleans up merge state
pub fn complete_merge(repo: &Repository) -> Result<Oid, GitError> {
    // Check if we're in a merge state
    if repo.state() != git2::RepositoryState::Merge {
        return Err(GitError::from_str("Not in merge state"));
    }

    // Check for remaining conflicts
    let index = repo.index()?;
    if index.has_conflicts() {
        return Err(GitError::from_str(
            "Cannot complete merge: conflicts still exist",
        ));
    }

    // Get merge head (the commit we're merging)
    let merge_head_path = repo.path().join("MERGE_HEAD");
    let merge_head_content = std::fs::read_to_string(&merge_head_path)
        .map_err(|e| GitError::from_str(&format!("Failed to read MERGE_HEAD: {}", e)))?;
    let merge_oid = Oid::from_str(merge_head_content.trim())?;
    let merge_commit = repo.find_commit(merge_oid)?;

    // Complete the merge
    complete_merge_internal(repo, &merge_commit)
}

/// Abort an ongoing merge and clean up merge state
/// This is called when user cancels conflict resolution
pub fn abort_merge(repo: &Repository) -> Result<(), GitError> {
    // Check if we're in a merge state
    if repo.state() != git2::RepositoryState::Merge {
        // Not in merge state, nothing to abort
        return Ok(());
    }

    // Reset to HEAD to discard merge
    let head = repo.head()?;
    let head_commit = head.peel_to_commit()?;

    // Reset working directory and index to HEAD
    repo.reset(head_commit.as_object(), git2::ResetType::Hard, None)?;

    // Clean up merge state files
    repo.cleanup_state()?;

    Ok(())
}
