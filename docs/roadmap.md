# Amber Development Roadmap

This document tracks planned improvements and feature ideas for the Amber note-taking application.

## 🚀 Performance Optimizations

### Search Indexing
- **Problem**: Search performs a linear scan of all file contents.
- **Solution**: Implement a search index (e.g., using a lightweight indexing library or custom implementation) to speed up queries.


## 🧠 AI & Agent Enhancements

### Agent Context Management (In Progress)
- **Goal**: Prevent token limit issues and improve conversation continuity.
- **Implementation**: Sliding window of recent messages with intelligent summarization of older context.

### Long-term AI Goals
- **Personalized Fine-tuning**: Allow users to fine-tune small models on their own notes.
- **Multi-modal Support**: Analyze images and diagrams within notes.

## ✨ UI/UX Improvements

### Mobile Support
- **Goal**: Optimize layout for smaller screens (iOS/Android).
- **Implementation**: Responsive design updates and touch-friendly controls.

### Canvas / Whiteboard
- **Goal**: Infinite canvas for spatial thinking and diagramming.
- **Implementation**: Node-based editor for connecting notes visually.

## 🔌 Extensibility

### Plugin API
- **Goal**: Allow community extensions.
- **Implementation**: WASM-based plugin system for safe execution of third-party code.

### Advanced Search Filters
- **Goal**: Powerful query language for filtering notes.
- **Implementation**:  Support for `tag:foo`, `created:today`, and boolean operators.
