# Open Source & AI Guide 🌍

## 1. Licensing
We recommend the **MIT License**. It's permissive, widely used, and great for growing a community.

**Action**: Ensure a `LICENSE` file is in the root.

## 2. Handling Secrets (Crucial!)
Before pushing to GitHub, verify that no secrets are committed.

- **Check `.gitignore`**: Ensure it includes:
    ```
    .env
    .DS_Store
    src-tauri/target/
    node_modules/
    .moss/
    ```
- **API Keys**: Moss uses a "Bring Your Own Key" (BYOK) architecture. Users store their keys in their local system keychain. **NEVER** include your own keys in the code or default config.

## 3. Addressing AI in Open Source
Since Moss relies on AI, here is how to position it:

**"AI-Native, User-Controlled"**
- **Privacy First**: We don't proxy AI requests. The app connects directly from the user's machine to the provider (OpenAI, Gemini, etc.).
- **No Training**: We clarify that using Moss doesn't implicitly train our models (since we don't have one).
- **Provider Agnostic**: The codebase abstracts the AI provider, allowing users (and contributors) to add support for any LLM (Local Llama, Anthropic, etc.).

## 4. Contributing Guide (Stub)
When you open source, add a `CONTRIBUTING.md`:
1.  Fork & Clone.
2.  `npm install`.
3.  `npm run tauri dev`.
4.  Submit PR.
