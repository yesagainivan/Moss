use reqwest;
use serde::{Deserialize, Serialize};

// ============================================================================
// Wikipedia API Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub title: String,
    pub pageid: i64,
    pub snippet: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResults {
    pub results: Vec<SearchResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WikiSummary {
    pub title: String,
    pub extract: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WikiContent {
    pub title: String,
    pub content: String,
    pub url: String,
}

// ============================================================================
// Wikipedia API Client
// ============================================================================

const WIKIPEDIA_API_BASE: &str = "https://en.wikipedia.org/api/rest_v1";
const WIKIPEDIA_SEARCH_BASE: &str = "https://en.wikipedia.org/w/rest.php/v1";
const USER_AGENT: &str = "Amber-Notes/1.0 (Educational note-taking app)";

/// Search Wikipedia for articles matching a query
pub async fn search_wikipedia(query: &str, limit: usize) -> Result<SearchResults, String> {
    // Use the correct Wikipedia REST API v1 search endpoint
    let url = format!("{}/search/title", WIKIPEDIA_SEARCH_BASE);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10)) // 10 second timeout
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .header("User-Agent", USER_AGENT)
        .query(&[("q", query), ("limit", &limit.to_string())])
        .send()
        .await
        .map_err(|e| format!("Failed to search Wikipedia: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Wikipedia API error: {} - {}", status, error_text));
    }

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Wikipedia response: {}", e))?;

    // Parse the search results from Wikipedia REST API response
    let pages = data["pages"].as_array().ok_or("No search results found")?;

    let results = pages
        .iter()
        .filter_map(|page| {
            Some(SearchResult {
                title: page["title"].as_str()?.to_string(),
                pageid: page["id"].as_i64()?,
                snippet: page["description"]
                    .as_str()
                    .or_else(|| page["excerpt"].as_str())
                    .unwrap_or("")
                    .to_string(),
            })
        })
        .collect();

    Ok(SearchResults { results })
}

/// Get summary/introduction of a Wikipedia article
pub async fn get_wikipedia_summary(title: &str) -> Result<WikiSummary, String> {
    let url = format!(
        "{}/page/summary/{}",
        WIKIPEDIA_API_BASE,
        urlencoding::encode(title)
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10)) // 10 second timeout
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| format!("Failed to get Wikipedia summary: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Wikipedia article not found or API error: {}",
            response.status()
        ));
    }

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Wikipedia response: {}", e))?;

    Ok(WikiSummary {
        title: data["title"].as_str().ok_or("Missing title")?.to_string(),
        extract: data["extract"]
            .as_str()
            .ok_or("Missing extract")?
            .to_string(),
        url: data["content_urls"]["desktop"]["page"]
            .as_str()
            .ok_or("Missing URL")?
            .to_string(),
    })
}

/// Get full Wikipedia article content in markdown format
pub async fn get_wikipedia_content(title: &str) -> Result<WikiContent, String> {
    let url = format!(
        "{}/page/html/{}",
        WIKIPEDIA_API_BASE,
        urlencoding::encode(title)
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10)) // 10 second timeout
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| format!("Failed to get Wikipedia content: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Wikipedia article not found or API error: {}",
            response.status()
        ));
    }

    let html = response
        .text()
        .await
        .map_err(|e| format!("Failed to read Wikipedia content: {}", e))?;

    // Convert HTML to Markdown
    let mut markdown = html2md::parse_html(&html);

    // Truncate if too long to avoid context limits (e.g., 413 errors)
    // 8,000 chars is roughly 2-3k tokens, leaving room for other context
    const MAX_CHARS: usize = 8000;
    if markdown.chars().count() > MAX_CHARS {
        let truncated: String = markdown.chars().take(MAX_CHARS).collect();
        markdown = format!(
            "{}\n\n...(Content truncated due to length limit)...",
            truncated
        );
    }

    // Get the article URL
    let article_url = format!(
        "https://en.wikipedia.org/wiki/{}",
        urlencoding::encode(title)
    );

    Ok(WikiContent {
        title: title.to_string(),
        content: markdown,
        url: article_url,
    })
}
