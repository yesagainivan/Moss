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

#### 1. Split View / Multiple Panes ⭐ **HIGHEST PRIORITY**
**Why**: Table stakes for serious note-taking. Users WILL try to view two notes simultaneously.
**Status**: Not implemented
**Effort**: Medium (2-3 days)
**Impact**: 🔥 Very High

#### 2. Tags System ⭐
**Why**: Universal expectation in note apps, enables powerful organization
**Status**: Not implemented
**Effort**: Low (1-2 days)
**Impact**: 🔥 Very High

#### 3. Global Search UI
**Why**: Backend (Tantivy) exists, need user interface
**Status**: Backend ready, UI missing
**Effort**: Low (1 day)
**Impact**: 🔥 High

#### 4. Note Properties/Frontmatter
**Why**: Essential for metadata, enables automation and queries
**Status**: Not implemented
**Effort**: Medium (2 days)
**Impact**: High

#### 5. Basic Export (Markdown)
**Why**: Trust issue - users need exit strategy
**Status**: Not implemented
**Effort**: Low (0.5 days)
**Impact**: High (trust factor)

#### 6. Performance Testing (1000+ notes)
**Why**: Ensure app doesn't lag with real-world usage
**Status**: Unknown
**Effort**: Medium (testing + optimization)
**Impact**: Very High

#### 7. Error Handling & Resilience
**Why**: What if Git fails? File deleted externally? Need graceful degradation
**Status**: Partial
**Effort**: Medium (ongoing)
**Impact**: High (stability)

#### 8. Tab Management Polish
**Why**: Complete the existing tab system
**Features Needed**: Pin tabs, reorder tabs, close tabs to right
**Status**: Basic tabs exist
**Effort**: Low (1 day)
**Impact**: Medium

### 🟡 IMPORTANT (Users will notice and ask)

#### 9. Templates System
**Why**: High-value, enables Daily Notes and workflows
**Status**: Not implemented
**Effort**: Medium (2-3 days)
**Impact**: Very High

#### 10. Daily Notes
**Why**: Many users build entire PKM around this concept
**Status**: Not implemented
**Effort**: Low (1 day, depends on templates)
**Impact**: Very High

#### 11. Backlinks Panel
**Why**: Data already tracked, just need UI
**Status**: Data tracked, no panel
**Effort**: Low (1 day)
**Impact**: Medium-High

#### 12. Note Outline / Table of Contents
**Why**: Essential for navigating long notes
**Status**: Not implemented
**Effort**: Low (1 day)
**Impact**: Medium

#### 13. Image Handling Improvements
**Why**: Ensure paste/upload works smoothly
**Status**: Check needed
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
- [ ] **Split view/multiple panes** ⭐ (3 days)
- [ ] **Tags system** ⭐ (2 days)
- [ ] **Global search UI** ⭐ (1 day)
- [ ] Basic export (markdown) (0.5 days)
- [ ] Tab management polish (1 day)

**Week 2-3**
- [ ] Performance testing with large vaults (2 days)
- [ ] Error handling improvements (2 days)
- [ ] Bug fixes and stability (2 days)

### Phase 2: Organization Features (1-2 weeks)
**Goal**: Add organizational power

- [ ] Properties/Frontmatter (2 days)
- [ ] Templates system (2-3 days)
- [ ] Daily Notes (1 day)
- [ ] Backlinks panel (1 day)
- [ ] Note outline/TOC (1 day)
- [ ] Image handling polish (1 day)

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

**Start with**: Split View implementation (highest impact, blocking issue)

See: `IMPLEMENTATION_PLAN_SPLIT_VIEW.md` (to be created)

---

## Notes

- Keep user-facing changes minimal until beta
- Focus on stability over features
- Community feedback will drive post-beta roadmap
- AI features are the moat - double down on those
- Local-first is non-negotiable - maintain this principle

---

**Last Updated**: 2025-12-01  
**Status**: Pre-Beta Planning Phase  
**Target Beta Launch**: ~4-6 weeks from start
