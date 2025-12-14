# Moss 🌿

> Your second brain, elegantly simple.

**[🌐 Visit the Website](https://yesagainivan.github.io/Moss/)**

Moss is a modern, fast, and beautiful note-taking application built for those who love Markdown. It combines the speed of a local-first app with the power of Git syncing and AI assistance.

## ✨ Features

- **Markdown First**: Write in pure Markdown with a beautiful, distraction-free editor.
- **Local & Private**: Your data lives on your device in plain text files.
- **Git Sync**: Seamlessly sync your notes to GitHub for version control and backup.
- **Graph View**: Visualize the connections between your thoughts.
- **AI Assistant**: Built-in AI to help you write, brainstorm, and transform text.
- **Split Panes**: Multitask with vertically and horizontally split editor panes.
- **Backlinks**: Automatically discover connections between your notes.

## 🛠️ Tech Stack

Moss is built with a modern stack designed for performance and experience:

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Rust (Tauri)
- **Editor**: Tiptap
- **State Management**: Zustand
- **Build Tool**: Vite

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Rust (latest stable)

### Installation

**For macOS (Apple Silicon & Intel):**

1.  Download the `.dmg` or `.app` from the [Releases](https://github.com/yesagainivan/Moss/releases) page.
2.  Drag the app to your Applications folder.
3.  **Important:** Since the app is not yet signed with a paid Apple Developer certificate, macOS will prevent it from opening by default.
    - **Right-click** on the Moss app icon.
    - Select **Open**.
    - Click **Open** in the dialog box that appears.
    - You only need to do this once.

*Alternatively, if you are comfortable with the terminal, you can remove the quarantine attribute:*
```bash
xattr -cr /Applications/Moss.app
```

1.  Clone the repository:
    ```bash
    git clone https://github.com/yesagainivan/Moss.git
    cd moss
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run tauri dev
    ```

### Building for Production

To build the application for your OS:

```bash
npm run tauri build
```

The artifacts will be available in `src-tauri/target/release/bundle`.

## 📂 Project Structure

- `src/`: React frontend application.
    - `components/`: UI components (Editor, Graph, Layout, etc.).
    - `store/`: Zustand state management stores.
    - `hooks/`: Custom React hooks.
    - `lib/`: Utility functions.
- `src-tauri/`: Rust backend.
    - `src/main.rs`: Entry point and command handlers.
    - `src/git.rs`: Git operations.
- `docs/`: User documentation and guides.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[AGPL-3.0](LICENSE)
