# Euler-Style Vault Builder Prompt for Mosaic 🏗️

Paste this **exact prompt** to Mosaic to auto-generate a structured knowledge vault for **any notable person** (mathematician, actor, musician, scientist, etc.) just like your Leonhard Euler vault!

---

**Mosaic, create a comprehensive knowledge vault for **[[NAME|NAME]]** (e.g., Leonhard Euler, Marie Curie, David Bowie). Mirror the Euler vault structure exactly, but adapt content to **[[NAME|NAME]]**. Use your knowledge to fill notes with accurate, concise markdown—facts, timelines, links, etc.**

## Exact Structure to Build:

### Root Notes:

- [[[NAME|[NAME]]**]**: High-level intro & hub. Link to all folders.
- **[[[NAME] Summary]]**: One-page overview.
- **[[Vault Summary - [NAME] & Related Concepts]]**: MOC of entire vault.
- [[graph model|graph model]]: Visualize as knowledge graph (nodes: timeline/story/works; edges: influences/connections).

### Folders & Notes:

1. **Timeline/**
  - Life/career phases (e.g., "1707-1727: Basel Years").
  - **_Timeline Summary.md**: Hub with [[wikilinks|wikilinks]] to all timeline notes.
2. **Story/**
  - Early Life, Family/Challenges, Anecdotes.
  - **_Story Summary.md**: Hub linking all.
3. **Key Works/**
  - Major achievements/books/roles/albums (e.g., "Basel Problem", "E=mc²").
  - **_Key Works Summary.md**: Hub.
4. **Legacy/**
  - Famous Quotes, Modern Applications, Named Concepts (e.g., "Euler's Number e").
  - **_Legacy Summary.md**: Hub.
5. **Work/** (or adapt: e.g., "Discography" for musicians)
  - Fields/domains (e.g., "Graph Theory", "Number Theory").
  - **_Work Summary.md**: Hub.
6. **Resources/**
  - Recommended Books, Videos & Lectures, Images & Portraits.
  - **_Resources Summary.md**: Hub.

## Guidelines:

- **Fill each note**: 500-2000 words of structured markdown (bullets, tables, quotes). Use **bold**, *italics*, [[wikilinks|wikilinks]] everywhere.
- **Interconnect**: Every note links to 3-5 others (e.g., "See [[Timeline/1727-1741: St. Petersburg I|Timeline/1727-1741: St. Petersburg I]]").
- **Summaries first**: Create hub summaries as index pages with embeds/links.
- **Adapt intelligently**: Actor? Add "Roles/Films". Musician? "Albums/Tours". Keep core folders.
- **Graph model**: Mermaid diagram or text graph showing clusters (Timeline → Story → Works → Legacy).
- **Check duplicates**: Use `list_all_notes` before creating.
- **Start in root**, build folders progressively.

**Go!** Create folder structure, populate with rich content, then show me the [[graph model|graph model]] and open [[Vault Summary...|Vault Summary...]]. 🚀

---

**Usage**: Replace [[NAME|NAME]] with "Albert Einstein", "Frida Kahlo", etc. Mosaic will handle the rest!

*Inspired by your Euler vault—now scalable to anyone!* ✨