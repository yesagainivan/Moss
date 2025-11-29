# Amber Development Roadmap

This document tracks planned improvements and feature ideas for the Amber note-taking application.

## 🚀 Performance Optimizations

### Graph View Caching
- **Problem**: The Knowledge Graph is rebuilt from scratch on every load, scanning all files. This is slow for large vaults.
- **Solution**: Cache the graph data (nodes and links) and only update it incrementally when files change.

### Search Indexing
- **Problem**: Search performs a linear scan of all file contents.
- **Solution**: Implement a search index (e.g., using a lightweight indexing library or custom implementation) to speed up queries.

## 🧠 AI & Agent Enhancements

### Vector Search / RAG (Retrieval-Augmented Generation)
- **Goal**: Allow the agent to "read" the entire vault semantically, not just by keyword search.
- **Implementation**: Embed notes into vectors and use a vector store to retrieve relevant context for user queries.

### Agent Context Management (In Progress)
- **Goal**: Prevent token limit issues.
- **Implementation**: Sliding window of recent messages.

## ✨ UI/UX Improvements

### Tabs System
- **Goal**: Allow multiple notes to be open simultaneously.

### Mobile Support
- **Goal**: Optimize layout for smaller screens (if Tauri mobile target is desired).
