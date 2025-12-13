# Changelog: December 13, 2025

## 🚀 Public Launch & Final Polish

Today marks a major milestone: **Moss is now fully open source!** We have finalized the repository structure, documentation, and licensing for public release.

### ✨ Major Changes

#### Open Source Release
- **License**: Adopted **AGPL-3.0** to ensure the project remains free and open while encouraging contribution.
- **Repository**: Publicly accessible at `github.com/yesagainivan/Moss`.
- **Website**: Live deployment configured via GitHub Pages.

#### Graph View Optimization
- **Performance**: Implemented Level of Detail (LOD) system.
  - Text labels are now hidden when zoomed out (`scale < 1.2`).
  - Removed expensive `measureText` calls that were running on every frame.
  - Result: Significantly smoother zooming and panning, especially in large vaults.
- **Usability**: 
  - Verified and fixed the `Cmd+G` shortcut to reliably toggle the graph view.
  - Clarified User Guide to reflect that nodes are opened by clicking, not hovering.

### 📚 Documentation

#### User Guide Overhaul
- **Shortcuts**: Audit complete. Added missing keys (`Cmd+Alt+S` for snapshots, `Cmd+G` for graph).
- **Git Sync**: Simplified instructions to match the actual OAuth flow (no manual repo URL needed).
- **Cleanup**: Removed internal-only documents (`SCREENSHOTS.md`, `OPEN_SOURCE.md`) to reduce noise for new contributors.

### 🧹 Housekeeping
- **Changelog Structure**: 
  - Established standard `CHANGELOG.md` in the root for high-level summaries.
  - created `docs/changelogs/` archive for detailed daily logs like this one.
- **Linting**: Fixed unused variable warnings in the Graph component.

### 🔜 Next Steps
- Gather community feedback!
- Continue improving the AI agent integration.
