# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-13

### 🎉 Initial Public Release
- **Moss** is now open source!
- **Core Features**:
    - **Markdown First**: Full CommonMark support with GFM extensions.
    - **Git Sync**: Automatic syncing with GitHub.
    - **Graph View**: Interactive knowledge graph (`Cmd+G`).
    - **Linked Editing**: WikiLinks support (`[[Note Name]]`).
    - **AI Assistant**: Integration with Gemini/Ollama.
    - **Multi-Pane Layout**: Split and arrange editors freely.

### 🐛 Fixed
- **Graph View**: 
    - Fixed `Cmd+G` shortcut not ensuring accurate view toggling.
    - Optimized performance by implementing Level of Detail (text hidden when zoomed out).
    - Removed unused code causing lint warnings.
- **Documentation**: Corrected keyboard shortcuts and GitHub sync instructions in User Guide.

### 🔧 Improvements
- **Shortcuts**: Added `Cmd+Alt+S` for manual snapshotting.
- **UI**: Polished website and branding assets.
