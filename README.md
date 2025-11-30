# Moss

> An AI-native, local-first markdown note-taking app with built-in knowledge graphs and version control

[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Moss is a powerful desktop application that combines the elegance of markdown with the intelligence of AI. Built with Tauri and React, it offers native performance while maintaining the flexibility of modern web technologies.

## ✨ Key Features

### ✍️ **Advanced Markdown Editor**
- **TipTap-powered** rich text editing with full markdown support
- **Wikilinks** for connecting notes (`[[Note Name]]`)
- **Callouts** for highlighting important information
- **Tables**, **task lists**, and **images**
- **Backlinks** automatically tracked
- **Focus mode** for distraction-free writing
- **Swipe navigation** for note history (macOS trackpad gestures)
- **Command palette** (`Cmd+P`) for quick file switching

### 🤖 **AI-Powered Writing**
- **Integrated AI agent** with tools for note management
- **Multiple providers**: Google Gemini, Cerebras, OpenRouter (Claude, GPT-4, etc.)
- **Semantic search** using vector embeddings
- **Custom AI prompts** for rewriting, translation, and more
- **Diff preview** for AI-suggested changes
- **Secure API key storage** in system keychain

### 🔗 **Knowledge Graph**
- **Interactive visualization** of note relationships
- **Automatic backlink tracking**
- **Wikilink resolution** with path-based matching
- **Configurable layout** (center split or sidebar)

### 🔧 **Version Control**
- **Automatic git commits** on every save
- **Smart commit messages** describing changes
- **Git history viewer** with commit timeline
- **GitHub sync** support (optional)

### 🎨 **Customizable Experience**
- **Theme system** with custom YAML theme support
- **Light/dark/system** theme modes
- **Adjustable typography** (font size, line height)
- **Readable line length** option
- **Glass morphism effects** with adjustable grain

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/) (v1.70 or higher)
- [pnpm](https://pnpm.io/) (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/moss.git
   cd moss
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri dev
   ```

4. **Build for production**
   ```bash
   npm run tauri build
   ```

## 🎯 Quick Start Guide

### 1. **Choose Your Vault**
On first launch, Moss will prompt you to select a folder for your notes. This becomes your "vault" - all your markdown files will be stored here.

### 2. **Configure AI (Optional)**
1. Open Settings (`Cmd+,`)
2. Go to the **AI** tab
3. Select a provider (Gemini has a free tier)
4. Add your API key
5. Choose a model

### 3. **Start Writing**
- Create a new note with `Cmd+N`
- Link notes with `[[Note Name]]`
- Access AI features by selecting text and using `Cmd+K`

### 4. **Explore the Graph**
- View your knowledge graph from the sidebar
- Click nodes to navigate between notes
- See how your ideas connect

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+P` | Open command palette |
| `Cmd+,` | Open settings |
| `Cmd+K` | AI rewrite menu (with text selected) |
| `Cmd+[` / `Cmd+]` | Navigate back/forward |
| `Cmd+B` | Toggle sidebar |
| `Cmd+W` | Close tab |
| `Cmd+H` | Note history |
| `Cmd+S` | Save note |
| `Cmd+Shift+S` | Snapshot note |
| `Cmd+Alt+S` | Snapshot vault |

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Editor**: TipTap, ProseMirror
- **Backend**: Rust, Tauri 2.0
- **State Management**: Zustand
- **AI Integration**: Google Gemini API, Cerebras, OpenRouter
- **Search**: Tantivy (Rust full-text search)
- **Graph**: react-force-graph-2d
- **Version Control**: git2 (Rust git bindings)

## 📦 Project Structure

```
moss/
├── src/                      # React TypeScript frontend
│   ├── components/          # UI components
│   │   ├── editor/         # TipTap editor setup
│   │   ├── graph/          # Knowledge graph visualization
│   │   ├── settings/       # Settings modal & panels
│   │   └── layout/         # App layout components
│   ├── store/              # Zustand state management
│   ├── lib/                # AI agent & utilities
│   └── extensions/         # TipTap custom extensions
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── tools.rs       # AI agent tools
│   │   ├── graph.rs       # Knowledge graph indexing
│   │   ├── indexer.rs     # Full-text search
│   │   ├── git_manager.rs # Git operations
│   │   └── vector_store.rs# Semantic search
│   └── Cargo.toml
├── public/                 # Static assets
└── package.json
```

## 🧪 Development

### Running Tests
```bash
# Frontend tests
pnpm test

# Rust tests
cd src-tauri
cargo test
```

### Code Style
```bash
# Frontend linting
pnpm lint

# Rust formatting
cd src-tauri
cargo fmt
cargo clippy
```

## 🎨 Creating Custom Themes

Create a YAML file in your app data directory:

```yaml
name: "My Custom Theme"
description: "A beautiful custom theme"
colors:
  background: "#1a1b26"
  foreground: "#a9b1d6"
  accent: "#7aa2f7"
  # ... more colors
```

See the [THEMING.md](THEMING.md) for full documentation.

## 🤝 Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for more details.

### Areas We'd Love Help With:
- [ ] Plugin/extension system
- [ ] Mobile companion app
- [ ] Additional AI providers
- [ ] Export formats (PDF, HTML, EPUB)
- [ ] Spaced repetition / flashcard system
- [ ] Vim mode for the editor
- [ ] Template system for notes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Obsidian](https://obsidian.md) - Inspiration for local-first note-taking
- [TipTap](https://tiptap.dev) - Excellent rich text editor framework
- [Tauri](https://tauri.app) - Lightweight desktop app framework
- [react-force-graph](https://github.com/vasturiano/react-force-graph) - Beautiful graph visualizations

## 📞 Support

- **Documentation**: [Coming soon]
- **Issues**: [GitHub Issues](https://github.com/yourusername/moss/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/moss/discussions)

---

**Made with 🌿 by the Moss team**
