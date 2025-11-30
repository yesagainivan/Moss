use reqwest;
use serde::{Deserialize, Serialize};

/// GitHub Device Flow authentication module
///
/// Implements the GitHub Device Flow for OAuth authentication
/// https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow

const GITHUB_DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const GITHUB_API_URL: &str = "https://api.github.com";

// ============================================================================
// Request/Response Structures
// ============================================================================

#[derive(Debug, Serialize)]
struct DeviceCodeRequest {
    client_id: String,
    scope: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Serialize)]
struct AccessTokenRequest {
    client_id: String,
    device_code: String,
    grant_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum AccessTokenResponse {
    Success {
        access_token: String,
        #[allow(dead_code)]
        token_type: String,
        #[allow(dead_code)]
        scope: String,
    },
    Pending {
        error: String,
    },
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct GitHubUser {
    pub login: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: String,
}

// ============================================================================
// Public API
// ============================================================================

/// Step 1: Request device code from GitHub
pub async fn request_device_code(client_id: &str) -> Result<DeviceCodeResponse, String> {
    let client = reqwest::Client::new();

    let params = DeviceCodeRequest {
        client_id: client_id.to_string(),
        scope: "repo user:email".to_string(), // repo access + email
    };

    let response = client
        .post(GITHUB_DEVICE_CODE_URL)
        .header("Accept", "application/json")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Failed to request device code: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {}: {}", status, body));
    }

    let device_code_response: DeviceCodeResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse device code response: {}", e))?;

    Ok(device_code_response)
}

/// Step 2: Poll for access token
///
/// This should be called repeatedly with the device_code from step 1.
/// Returns:
/// - Ok(Some(token)) when user has authorized
/// - Ok(None) when still pending (call again after interval)
/// - Err(_) on error
pub async fn poll_access_token(
    client_id: &str,
    device_code: &str,
) -> Result<Option<String>, String> {
    let client = reqwest::Client::new();

    let params = AccessTokenRequest {
        client_id: client_id.to_string(),
        device_code: device_code.to_string(),
        grant_type: "urn:ietf:params:oauth:grant-type:device_code".to_string(),
    };

    let response = client
        .post(GITHUB_ACCESS_TOKEN_URL)
        .header("Accept", "application/json")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Failed to poll access token: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {}: {}", status, body));
    }

    let token_response: AccessTokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse access token response: {}", e))?;

    match token_response {
        AccessTokenResponse::Success { access_token, .. } => Ok(Some(access_token)),
        AccessTokenResponse::Pending { error } => {
            match error.as_str() {
                "authorization_pending" => Ok(None), // Still waiting for user
                "slow_down" => Ok(None),             // Polling too fast, but just return None
                "expired_token" => Err("Device code expired. Please try again.".to_string()),
                "access_denied" => Err("User denied authorization.".to_string()),
                _ => Err(format!("Unknown error: {}", error)),
            }
        }
    }
}

/// Get authenticated user information
pub async fn get_user_info(access_token: &str) -> Result<GitHubUser, String> {
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{}/user", GITHUB_API_URL))
        .header("Accept", "application/vnd.github+json")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "Amber-App")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Failed to get user info: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {}: {}", status, body));
    }

    let user: GitHubUser = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse user info: {}", e))?;

    Ok(user)
}

/// Verify that a token is still valid
pub async fn verify_token(access_token: &str) -> Result<bool, String> {
    match get_user_info(access_token).await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

// ============================================================================
// Repository Management
// ============================================================================

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct GitHubRepository {
    pub id: u64,
    pub name: String,
    pub full_name: String,
    pub private: bool,
    pub html_url: String,
    pub clone_url: String,
    pub description: Option<String>,
    pub owner: RepositoryOwner,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct RepositoryOwner {
    pub login: String,
}

#[derive(Debug, Serialize)]
struct CreateRepositoryRequest {
    name: String,
    description: Option<String>,
    private: bool,
    auto_init: bool,
}

/// List all repositories for the authenticated user
pub async fn list_repositories(access_token: &str) -> Result<Vec<GitHubRepository>, String> {
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{}/user/repos", GITHUB_API_URL))
        .header("Accept", "application/vnd.github+json")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "Amber-App")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .query(&[("per_page", "100"), ("sort", "updated")]) // Get recently updated repos
        .send()
        .await
        .map_err(|e| format!("Failed to list repositories: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {}: {}", status, body));
    }

    let repos: Vec<GitHubRepository> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse repositories: {}", e))?;

    Ok(repos)
}

/// Create a new private repository
pub async fn create_repository(
    access_token: &str,
    name: &str,
    description: Option<String>,
) -> Result<GitHubRepository, String> {
    let client = reqwest::Client::new();

    let request_body = CreateRepositoryRequest {
        name: name.to_string(),
        description,
        private: true,    // Always create private repos for vaults
        auto_init: false, // Don't auto-initialize (we'll push from local)
    };

    let response = client
        .post(format!("{}/user/repos", GITHUB_API_URL))
        .header("Accept", "application/vnd.github+json")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "Amber-App")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to create repository: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {}: {}", status, body));
    }

    let repo: GitHubRepository = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse created repository: {}", e))?;

    Ok(repo)
}
