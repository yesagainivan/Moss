# Moss User Guide 🌿

Welcome to Moss, your second brain! This guide will help you get started with capturing your thoughts, organizing your knowledge, and leveraging the power of AI.

## 🚀 Getting Started

### 1. Setting up your Vault
When you launch Moss for the first time, you'll be asked to select a "Vault".
- A **Vault** is simply a folder on your computer where Moss stores all your notes.
- You can choose an existing folder (e.g., from Obsidian or Logseq) or create a new one.
- Moss creates a simple `.moss` config folder inside, but otherwise, your files remain plain Markdown (`.md`).

### 2. The Interface
- **Sidebar (Left)**: Shows your file explorer and folders. Toggle with `Cmd+B`.
- **Editor (Center)**: Where you write. Supports split panes (Vertical: `Cmd+\`, Horizontal: `Cmd+Shift+\`).
- **Right Panel**: Shows Backlinks (notes that link to the current note) and the Table of Contents.

## ✍️ Writing in Moss

Moss uses **Markdown**, a lightweight way to format text.

### Basic Syntax
- **Bold**: `**text**` -> **text**
- **Italic**: `*text*` -> _text_
- **Headings**: `# Heading 1`, `## Heading 2`, etc.
- **Lists**: `- Item` or `1. Item`.
- **Tasks**: `- [ ] To-do item`.
- **Blockquotes**: `> Quote`.

### Linking Notes (The Power of Moss)
Connect your ideas using **WikiLinks**.
- Type `[[` to trigger the auto-complete menu.
- Select a note to link to it.
- If the note doesn't exist, Moss will create it when you click the link.

### Images
- Simply **drag and drop** an image from your computer into the editor.
- Moss will save it to your vault and embed it automatically.

## 🤖 AI Assistant

Moss has a built-in AI to help you think and write.

### Using the AI
1.  **Select some text** in your editor.
2.  Press `Cmd+K`.
3.  Type a command (e.g., "Summarize this", "Fix grammar", "Translate to Spanish").
4.  The AI will stream the result. You can view a "Diff" to see exactly what changed before accepting.

### Configuration
- Go to **Settings** (`Cmd+,`) -> **AI**.
- Select your provider (Google Gemini, OpenAI, etc.) and enter your API Key.
- Choose your preferred model.

## 🔗 Graph View

Visualize your knowledge garden.
- Click the **Graph Icon** in the sidebar (or press `Cmd+G`).
- **Nodes** are notes. **Lines** are links.
- Larger nodes have more connections.
- Hover over a node to highlight its connections.

## ⌨️ Keyboard Shortcuts

| **New Note** | `Cmd+N` |
| **Command Palette** | `Cmd+P` |
| **Search** | `Cmd+Shift+F` |
| **Daily Note** | `Cmd+Shift+D` |
| **Settings** | `Cmd+,` |
| **Toggle Sidebar** | `Cmd+B` |
| **Split Vertically** | `Cmd+\` |
| **Split Horizontally** | `Cmd+Shift+\` |
| **AI Rewrite** | `Cmd+K` |
| **Open Graph** | `Cmd+G` |
| **Toggle Right Panel** | `Cmd+Opt+B` |
| **Snapshot Vault** | `Cmd+Alt+S` |

## 🛠️ Advanced: Git Sync

Moss creates a Git repository in your vault automatically.
- Changes made by AI operations and templates are auto-committed.
- You can manually save snapshots with `Cmd+Alt+S`.
- You can view the history of any note with `Cmd+H`.
- To sync with GitHub:
    1. Create an empty repo on GitHub.
    2. Go to Settings -> Sync.
    3. Enter your Repo URL and push your changes.

