# Amber Brown - Development Roadmap

**Last Updated:** December 3, 2025  
**Current Phase:** Sprint 2 - Organization Features

---

## 🎯 Project Goal

Transform Amber Brown from a functional note-taking app into a **production-ready PKM (Personal Knowledge Management) tool** with feature parity to Obsidian, plus unique AI superpowers.

---

## ✅ Completed Features

### Core Architecture
- ✅ Split pane system with independent tabs
- ✅ Pane-based state management (Zustand)
- ✅ Tab history and navigation
- ✅ File tree with virtualization
- ✅ Markdown editor with Tiptap
- ✅ Git integration with auto-commit
- ✅ Settings system with persistence

### Sprint 1: Search & Discovery ✅ COMPLETE
**Timeline:** December 3, 2025  
**Status:** All features implemented and tested

1. **✅ Global Search UI** (~1 day)
   - Modal-based search with `Cmd+Shift+F`
   - Uses existing `agent_search_notes` backend
   - Debounced input, keyboard navigation
   - Empty/loading states

2. **✅ Backlinks Panel** (~1.5 days)
   - Right sidebar panel showing incoming links
   - Backend: `get_backlinks` command queries graph cache
   - Frontend: Card-based list with navigation
   - Toggle: `Cmd+Opt+B`

3. **✅ Note Outline/TOC** (~1 day)
   - Auto-parses markdown headings (H1-H6)
   - Hierarchical display with indentation
   - Click-to-scroll navigation
   - Mutual exclusivity with Backlinks Panel
   - Toggle: `Cmd+Opt+O`

**Sprint 1 Impact:** Users can now discover connections and navigate content efficiently! 🎉

---

## 🚧 In Progress

### Sprint 2: Organization Features
**Estimated Timeline:** 6-9 days  
**Goal:** Enable power user workflows with tags, frontmatter, and templates

---

## 📋 Planned Features

### Sprint 2: Organization (Week 2)

#### 4. Tags System (~2-3 days) 🏷️
**Priority:** 🔴 CRITICAL - Table stakes for PKM

**Backend Work:**
- [ ] Tag extraction from markdown (`#tag` syntax)
- [ ] Tag index/cache system (similar to `graph.rs`)
- [ ] Tauri command: `get_all_tags` (returns tag list with counts)
- [ ] Tauri command: `get_notes_by_tag` (filter notes)

**Frontend Work:**
- [ ] Tag panel in sidebar (collapsible section)
- [ ] Tag list with note counts
- [ ] Click tag → filter file tree
- [ ] Tag autocomplete in editor (Tiptap extension)
- [ ] Multi-tag filtering

**Estimated Effort:** 2-3 days  
**Impact:** Unlocks serious organization workflows

---

#### 5. Frontmatter Support (~2-3 days) 📝
**Priority:** 🔴 CRITICAL - Required for metadata

**Features:**
- [ ] YAML frontmatter parsing (`gray-matter` library)
- [ ] Exclude frontmatter from editor display
- [ ] Properties panel (toggleable sidebar)
- [ ] Property editing UI (key-value pairs)
- [ ] Default properties in templates
- [ ] Support for:
  - `tags: [tag1, tag2]`
  - `created: 2025-12-03`
  - `status: in-progress`
  - Custom fields

**Estimated Effort:** 2-3 days  
**Impact:** Enables structured metadata workflows

---

#### 6. Templates System (~2-3 days) 📄
**Priority:** 🟡 HIGH - Unlocks daily notes & structured workflows

**Features:**
- [ ] Templates folder (`.amber/templates/`)
- [ ] Template picker UI (command palette integration)
- [ ] Variable substitution:
  - `{{date}}` - Current date
  - `{{time}}` - Current time
  - `{{title}}` - Note title
  - `{{year}}`, `{{month}}`, `{{day}}`
- [ ] Default template setting
- [ ] Template management UI

**Estimated Effort:** 2-3 days  
**Impact:** Enables daily notes and repeatable workflows

---

### Sprint 3: Daily Driver Features (Week 3)

#### 7. Daily Notes (~1 day) 📅
**Priority:** 🟡 HIGH - Core PKM workflow

**Dependencies:** Templates System

**Features:**
- [ ] Daily notes settings (folder, template, format)
- [ ] "Open Today" command (`Cmd+Shift+D`)
- [ ] Auto-create if missing
- [ ] Date-based file naming
- [ ] Calendar widget (optional, nice-to-have)

**Estimated Effort:** 1 day  
**Impact:** Massive UX improvement for journaling

---

#### 8. Export Functionality (~0.5 days) 📤
**Priority:** 🟢 MEDIUM - Trust factor

**Features:**
- [ ] Export vault (copy all markdown to new location)
- [ ] Export single note
- [ ] PDF export (optional, via Pandoc)
- [ ] HTML export (optional)
- [ ] "Export" menu in command palette

**Estimated Effort:** 0.5 days  
**Impact:** Reduces friction for new users (exit strategy)

---

#### 9. Tab Management Polish (~1 day) 🗂️
**Priority:** 🟢 MEDIUM - Expected by users

**Features:**
- [ ] Drag-drop tab reordering (`@dnd-kit`)
- [ ] Pin tabs (with pin icon)
- [ ] Tab context menu (right-click):
  - Close Tab
  - Close Others
  - Close to Right
  - Pin/Unpin
  - Duplicate
- [ ] Persist pinned state

**Estimated Effort:** 1 day  
**Impact:** Professional tab experience

---

#### 10. Keyboard Shortcuts Modal (~1 day) ⌨️
**Priority:** 🟢 MEDIUM - Discoverability

**Features:**
- [ ] Shortcuts modal (triggered by `?` or `Cmd+/`)
- [ ] Categorized list:
  - Editor
  - Navigation
  - AI Tools
  - Panes
  - Search
- [ ] Search within shortcuts
- [ ] Visual keyboard hints

**Estimated Effort:** 1 day  
**Impact:** Helps users discover features

---

### Sprint 4: Testing & Polish (Week 4)

#### 11. Performance Testing (~2 days) ⚡
**Priority:** 🔴 CRITICAL - Production readiness

**Testing Areas:**
- [ ] Create test vault with 1000+ notes
- [ ] Stress test graph rendering
- [ ] Profile search performance
- [ ] Monitor memory usage
- [ ] Test startup time
- [ ] Identify and fix bottlenecks

**Estimated Effort:** 2 days  
**Impact:** Ensures app scales

---

#### 12. Error Handling Polish (~1 day) 🛡️
**Priority:** 🟡 HIGH - Stability

**Features:**
- [ ] User-visible error messages
- [ ] Git operation failure handling
- [ ] File save error feedback
- [ ] Search error handling
- [ ] Graceful degradation

**Estimated Effort:** 1 day  
**Impact:** Professional error UX

---

#### 13. Empty States & Loading States (~1 day) 🎨
**Priority:** 🟢 MEDIUM - Polish

**Features:**
- [ ] Empty vault message
- [ ] No search results message
- [ ] Empty graph view message
- [ ] Loading spinners where needed
- [ ] Skeleton states

**Estimated Effort:** 1 day  
**Impact:** Polished first impression

---

#### 14. Onboarding Flow (~1 day) 👋
**Priority:** 🟢 MEDIUM - Reduce friction

**Features:**
- [ ] First launch welcome screen
- [ ] Quick start guide
- [ ] Sample vault template
- [ ] Feature highlights
- [ ] Settings tour

**Estimated Effort:** 1 day  
**Impact:** Smooth new user experience

---

## 🔵 Future Enhancements (Post-Beta)

### Phase 2 Features
- Block references
- Canvas/whiteboard view
- Plugin API
- Vim mode
- Advanced search filters
- Mobile sync
- Collaboration features

---

## 📊 Progress Summary

**Total Features Planned:** 14  
**Completed:** 3 (Sprint 1)  
**In Progress:** 0  
**Remaining:** 11

**Estimated Time to Beta:** ~3-4 weeks

---

## 🎯 Beta Launch Checklist

### Must-Have ✅
- [x] Global search UI
- [x] Backlinks panel
- [x] Note outline/TOC
- [ ] Tags system
- [ ] Frontmatter support
- [ ] Templates system
- [ ] Daily notes
- [ ] Export functionality
- [ ] Performance tested (1000+ notes)
- [ ] Error handling doesn't crash app

### Nice-to-Have 🟡
- [ ] Tab reordering
- [ ] Pin tabs
- [ ] Keyboard shortcuts modal
- [ ] Onboarding flow
- [ ] Empty states

### Can Wait 🔵
- Block references
- Canvas view
- Plugin API
- Vim mode

---

## 🚀 Competitive Positioning

### Current State
- ✅ Split pane architecture
- ✅ AI-native integration
- ✅ Built-in Git versioning
- ✅ Free & open source
- ❌ Missing PKM essentials (tags, frontmatter)

### After Sprint 2-4
- ✅ Feature parity with Obsidian core
- ✅ AI superpowers (inline generation, rewriting)
- ✅ Semantic search (vector embeddings)
- ✅ Automatic version control
- ✅ Free GitHub sync

**Positioning:** "Obsidian with AI superpowers and Git baked in"

---

## 📈 Development Velocity

**Sprint 1 Actual:** 3 features in ~1 day  
**Sprint 1 Estimate:** 3-4 days

**Lessons Learned:**
- Backend reuse accelerates development (graph cache, search command)
- UI patterns are established (panels, modals, shortcuts)
- Development is faster than estimated!

**Revised Timeline:**
- Sprint 2: Target 1.5 weeks (was 2 weeks)
- Sprint 3: Target 1 week
- Sprint 4: Target 1 week
- **Beta-ready:** ~3.5 weeks from now

---

## 🎯 Next Steps

1. **Immediate:** Start Sprint 2 with Tags System
2. **This Week:** Complete Tags + Frontmatter
3. **Next Week:** Templates + Daily Notes + Quick wins
4. **Week After:** Testing, polish, and beta prep

---

## 💡 Notes

- **Momentum is strong!** Sprint 1 completed ahead of schedule
- **Backend is solid:** Most features leverage existing infrastructure
- **UI patterns established:** Panels, modals, shortcuts are consistent
- **Focus on PKM essentials first:** Tags and frontmatter unlock everything else

---

**Let's build something amazing! 🚀**
