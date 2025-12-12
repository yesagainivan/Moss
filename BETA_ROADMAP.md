# Moss Beta Launch Roadmap

> Strategic plan for open sourcing and beta release of Moss - the AI-native, local-first note-taking app

---

## Open Source Strategy

### Decision: YES - Full Open Source ✅

**Why Open Source?**
- **Trust**: Users store sensitive personal data - transparency builds confidence
- **Community**: PKM community strongly prefers FOSS tools
- **Network Effects**: Plugin ecosystem, themes, and extensions thrive with open source
- **Differentiation**: AI integration is the secret sauce, not the editor code
- **Talent**: Attracts contributors and potential team members
- **Marketing**: "Open-source AI-native note-taking" is a compelling unique value proposition

### Recommended Business Model

**Free Tier (Open Source)**
- Full desktop application with all features
- Local-first, self-hosted
- GitHub sync support
- All AI features with user's own API keys

**Paid Services** (Optional extras)
- Premium AI API access (we host the AI layer)
- Managed cloud sync service
- Team/organization features
- Priority support
- Premium themes marketplace

**Inspiration**: Bitwarden, Standard Notes, Ghost

---

## Competitive Analysis: Moss vs Obsidian

### What Moss Does Better ✅
- **Native AI Integration** - Not a plugin, deeply integrated
- **Built-in Version Control** - Automatic Git commits
- **Free GitHub Sync** - No paid subscription needed
- **Semantic Search** - Vector embeddings, not just keywords
- **Interactive Knowledge Graph** - Modern force-graph visualization
- **Open Source** - Full transparency (when launched)

### What We Need to Match 🎯
See "Pre-Beta Must-Have Features" below

---

## Pre-Beta Must-Have Features

### 🔴 CRITICAL (Beta blockers - users will immediately notice)

#### 1. Split View / Multiple Panes ✅ **COMPLETE**
**Why**: Table stakes for serious note-taking. Users WILL try to view two notes simultaneously.
**Status**: ✅ Implemented
**Effort**: Medium (2-3 days)
**Impact**: 🔥 Very High

#### 2. Tags System ✅ **COMPLETE**
**Why**: Universal expectation in note apps, enables powerful organization
**Status**: ✅ Implemented
**Effort**: Low (1-2 days)
**Impact**: 🔥 Very High

#### 3. Global Search UI ✅ **COMPLETE**
**Why**: Backend (Tantivy) exists, need user interface
**Status**: ✅ Implemented (Cmd+Shift+F)
**Effort**: Low (1 day)
**Impact**: 🔥 High

#### 4. Note Properties/Frontmatter ✅ **COMPLETE**
**Why**: Essential for metadata, enables automation and queries
**Status**: ✅ Implemented (PropertiesEditor)
**Effort**: Medium (2 days)
**Impact**: High

#### 5. Basic Export (Markdown)
**Why**: Trust issue - users need exit strategy
**Status**: Not implemented
**Effort**: Low (0.5 days)
**Impact**: High (trust factor)

#### 6. Performance Testing (1000+ notes) ✅ **COMPLETE**
**Why**: Ensure app doesn't lag with real-world usage
**Status**: ✅ Implemented (Optimized Editor Reuse)
**Effort**: Medium (testing + optimization)
**Impact**: Very High

#### 7. Error Handling & Resilience
**Why**: What if Git fails? File deleted externally? Need graceful degradation
**Status**: Partial
**Effort**: Medium (ongoing)
**Impact**: High (stability)

#### 8. Tab Management Polish ✅ **COMPLETE**
**Why**: Complete the existing tab system
**Features Needed**: Pin tabs, reorder tabs, close tabs to right
**Status**: ✅ Implemented (2025-12-11)
**Effort**: Low (1 day)
**Impact**: Medium

### 🟡 IMPORTANT (Users will notice and ask)

#### 9. Templates System ✅ **COMPLETE**
**Why**: High-value, enables Daily Notes and workflows
**Status**: ✅ Implemented (2025-12-11)
**Effort**: Medium (2-3 days)
**Impact**: Very High

#### 10. Daily Notes ✅ **COMPLETE**
**Why**: Many users build entire PKM around this concept
**Status**: ✅ Implemented (2025-12-11)
**Effort**: Low (1 day, depends on templates)
**Impact**: Very High

#### 11. Backlinks Panel ✅ **COMPLETE**
**Why**: Data already tracked, just need UI
**Status**: ✅ Implemented (Cmd+Opt+B)
**Effort**: Low (1 day)
**Impact**: Medium-High

#### 12. Note Outline / Table of Contents ✅ **COMPLETE**
**Why**: Essential for navigating long notes
**Status**: ✅ Implemented (Cmd+Opt+O)
**Effort**: Low (1 day)
**Impact**: Medium

#### 13. Image Handling Improvements
**Why**: Ensure paste/upload works smoothly
**Status**: ✅ Implemented (2025-12-11)
**Effort**: Variable
**Impact**: Medium

#### 14. Keyboard Shortcuts Help
**Why**: Feature discoverability
**Status**: Not implemented
**Effort**: Low (0.5 days)
**Impact**: Low (polish)

### 🟢 NICE-TO-HAVE (Can wait for v1.1+)

- Customizable hotkeys
- CSS snippets support
- Block references
- Canvas/whiteboard view
- Plugin API
- Advanced search filters
- Vim mode

---

## Development Timeline

### Phase 1: Core Stability (2-3 weeks)
**Goal**: Make beta-worthy and stable

**Week 1-2**
- [x] ~~Existing features~~ (already built)
- [x] **Split view/multiple panes** ✅ (3 days)
- [x] **Tags system** ✅ (2 days)
- [x] **Global search UI** ✅ (1 day)
- [ ] Basic export (markdown) (0.5 days) - SKIPPED (vault IS the export)
- [x] **Tab management polish** ✅ (1 day)

**Week 2-3**
- [x] Performance testing with large vaults (2 days) ✅ (Optimized)
- [ ] Error handling improvements (2 days)
- [ ] Bug fixes and stability (2 days)

### Phase 2: Organization Features (1-2 weeks)
**Goal**: Add organizational power

- [x] **Properties/Frontmatter** ✅ (2 days) - Complete
- [x] **Templates system** ✅ (2-3 days) - Complete
- [x] **Daily Notes** ✅ (1 day) - Complete
- [x] **Backlinks panel** ✅ (1 day) - Complete
- [x] **Note outline/TOC** ✅ (1 day) - Complete
- [x] **Image handling polish** ✅ (1 day)

### Phase 3: Pre-Launch Polish (1 week)
**Goal**: First impressions matter

- [ ] Onboarding improvements
- [ ] Documentation (README, user guide)
- [ ] Keyboard shortcuts help/cheatsheet
- [ ] Final bug fixes
- [ ] Performance optimization
- [ ] Prepare beta announcement

### Phase 4: Beta Launch 🚀
**Goal**: Gather feedback, iterate

- [ ] Soft launch to PKM communities
  - r/ObsidianMD
  - r/PKMS  
  - r/selfhosted
  - Hacker News
- [ ] Set up feedback channels (GitHub issues, Discord?)
- [ ] Monitor usage patterns
- [ ] Rapid iteration on feedback

**Later**: Product Hunt (after addressing initial feedback)

---

## Marketing Positioning

### Unique Value Proposition
**"Moss: The AI-native note-taking app that thinks with you"**

**For**: Knowledge workers, researchers, writers, developers  
**Who**: Want intelligent assistance in their note-taking  
**Moss is**: An open-source desktop app  
**That**: Combines local-first privacy with AI-powered features  
**Unlike**: Obsidian (no AI), Notion (cloud-only), Roam (expensive)  
**Moss**: Gives you AI superpowers while keeping your data local and private

### Key Differentiators (Landing Page Headlines)
1. 🤖 **AI-Native** - Not bolted on, but deeply integrated from day one
2. 🔒 **Local-First** - Your notes stay on your machine, always
3. 📊 **Automatic Version Control** - Every change tracked with Git
4. 🔍 **Semantic Search** - AI understands meaning, not just keywords
5. 📈 **Knowledge Graph** - See how your ideas connect
6. 🎨 **Infinitely Customizable** - Themes, AI prompts, workflows
7. 💰 **Free & Open Source** - Full transparency, community-driven

---

## Success Metrics (Beta)

### Week 1 Targets
- 100 active users
- <5 critical bugs reported
- App doesn't crash with real vaults

### Month 1 Targets
- 500 active users
- 50+ GitHub stars
- Positive sentiment on Reddit/HN
- <10 open critical bugs
- 3+ community contributions

### Month 3 Targets
- 2000 active users
- 200+ GitHub stars
- First community themes/plugins
- Clear feedback on v1.0 roadmap
- Revenue model validated (if pursuing)

---

## Risk Mitigation

### Technical Risks
- **Performance with large vaults**: Test early, optimize aggressively
- **Cross-platform issues**: Test on Windows/Mac/Linux
- **Data loss**: Robust error handling, Git safety net
- **AI API costs**: User brings their own keys (BYOK model)

### Market Risks
- **Obsidian switching costs**: Make migration easy (import vaults)
- **Feature parity**: Focus on differentiators, not feature-for-feature match
- **Community adoption**: Engage early and often

### Business Risks
- **Monetization**: BYOK model reduces costs, premium services optional
- **Support burden**: Community forums, good documentation
- **Sustainability**: Open source doesn't mean unsustainable - many success stories

---

## Next Immediate Action

**Excellent Progress!** Phase 1 & 2 features mostly complete!

**Next Steps** (Priority Order):
1. **Tab Management Polish** (1 day) - Pin tabs, reorder, context menu
2. **Performance Testing** (2 days) - Test with 1000+ notes vault
3. **Error Handling Polish** (1-2 days) - Graceful degradation
4. **Pre-Launch Polish** (~1 week) - Documentation, onboarding, final bugs

**Current Focus**: Tab Management Polish

---

## Notes

- Keep user-facing changes minimal until beta
- Focus on stability over features
- Community feedback will drive post-beta roadmap
- AI features are the moat - double down on those
- Local-first is non-negotiable - maintain this principle

---

**Last Updated**: 2025-12-11  
**Status**: Phase 2 - Organization Features (Templates & Daily Notes Complete)  
**Target Beta Launch**: ~4-6 weeks from start
