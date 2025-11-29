Great! Is our approach the best, production-ready approach? The grain seems overlayed over the entire app, in places like setting, it is not on the setting, just overlayed; Could we address that or is our approach already optimal? Also, should we bring the settings CSS into its own. file?

//

Some models are broken, can we fix them?

//

Great! I found this:
```
# Introduction into Markdown with Tiptap

> **Important**: The markdown extension is a early release and can be subject to change or may have edge cases that may not be supported yet. If you are encountering a bug or have a feature request, please open an issue on GitHub.

The Markdown extension provides bidirectional Markdown support for your Tiptap editor—parse Markdown strings into Tiptap's JSON format and serialize editor content back to Markdown.

## [](#core-capabilities)Core Capabilities

-   **Markdown Parsing**: Convert Markdown strings to Tiptap JSON
-   **Markdown Serialization**: Export editor content as Markdown
-   **Custom Tokenizers**: Add support for custom Markdown syntax
-   **Extensible Architecture**: Each extension can define its own parsing and rendering logic
-   **Utilities to Simplify Custom Syntax Creation**: `createBlockMarkdownSpec`, `createInlineMarkdownSpec` and more
-   **HTML Support**: Parse HTML embedded in Markdown using Tiptap's existing HTML parsing

## [](#how-it-works)How It Works

The Markdown extension acts as a bridge between Markdown text and Tiptap's JSON document structure.

It extends the base editor functionality by overwriting existing methods & properties with markdown-ready implementations, allowing for seamless integration between Markdown and Tiptap's rich text editor.

```
// Set initial content
const editor = new Editor({
  extensions: [StarterKit, Markdown],
  content: '# Hello World\n\nThis is **Markdown**!',
  contentType: 'markdown',
})

// Insert content
editor.commands.insertContent('# Hello World\n\nThis is **Markdown**!')
```

### [](#architecture)Architecture

```
Markdown String
      ↓
   MarkedJS Lexer (Tokenization)
      ↓
   Markdown Tokens
      ↓
   Extension Parse Handlers
      ↓
   Tiptap JSON
```

And in reverse:

```
Tiptap JSON
      ↓
   Extension Render Handlers
      ↓
   Markdown String
```

## [](#limitations)Limitations

The current implementation of the Markdown extension has some limitations:

-   **Comments are not supported yet**: Some advanced features like comments are not supported in Markdown. Be **cautious** when parsing Markdown content into a document that contains comments as they may be lost if replaced by Markdown content.
-   **Multiple child nodes in Tables**: Markdown tables are supported, but only one child node per cell is allowed as the Markdown syntax can't represent multiple child nodes.

## [](#why-markedjs)Why MarkedJS?

This extension integrates [MarkedJS](https://marked.js.org) as its parser:

-   **Fast and Lightweight**: One of the fastest Markdown parsers available
-   **Extensible**: Custom tokenizers enable non-standard Markdown syntax
-   **CommonMark Compliant**: Follows the CommonMark specification
-   **Battle-tested**: Widely used in production with active development

The Lexer API breaks Markdown into tokens that map naturally to Tiptap's node structure, making the integration clean and maintainable. The extension works identically in browser and server environments.
```

//

Hey! Why are some data lost when we go from source mode to preview mode? For instance, 
With:
```
Can you fill the Checklist note with some checklists for things to do in a day?
05:49 AM
Used tool: update_note
update_notecompleted
Ambre
05:49 AM
Done! ✨ Filled Checklist with practical daily checklists for morning, work, afternoon, and evening. Want me to open it or tweak anything? 📋
```
checklists go from (in the version history we get the true snapshot):
```
# Daily Checklists 📋

Here are some practical checklists for a balanced day. Customize them as needed!

## 🌅 Morning Routine (Start strong)
- [ ] Wake up & hydrate (glass of water)
- [ ] Meditate or stretch (5-10 min)
- [ ] Exercise (walk, yoga, or workout ~30 min)
- [ ] Healthy breakfast
- [ ] Review goals & plan the day (top 3 priorities)

## 💼 Work/Study Block (Focus mode)
- [ ] Check emails & messages (15 min max)
- [ ] Deep work session 1 (90 min)
- [ ] Short break (walk or stretch)
- [ ] Deep work session 2 (90 min)
- [ ] Meetings or collaboration
- [ ] Review progress & adjust tasks

## 🌿 Afternoon Recharge
- [ ] Nutritious lunch
- [ ] Quick walk outside (15 min)
- [ ] Tackle creative or low-energy tasks

## 🌙 Evening Wind-Down (Reflect & recover)
- [ ] Dinner & family time
- [ ] Review accomplishments (what went well?)
- [ ] Prep tomorrow's checklist
- [ ] Hobby or reading (30 min)
- [ ] No screens after 9 PM
- [ ] Lights out by 10-11 PM

**Pro Tip:** Use these as templates—duplicate sections for specific days or projects! ✨
```

To
```
# Daily Checklists 📋

Here are some practical checklists for a balanced day. Customize them as needed!

## 🌅 Morning Routine (Start strong)

- Wake up & hydrate (glass of water)
- Meditate or stretch (5-10 min)
- Exercise (walk, yoga, or workout ~30 min)
- Healthy breakfast
- Review goals & plan the day (top 3 priorities)

## 💼 Work/Study Block (Focus mode)

- Check emails & messages (15 min max)
- Deep work session 1 (90 min)
- Short break (walk or stretch)
- Deep work session 2 (90 min)
- Meetings or collaboration
- Review progress & adjust tasks

## 🌿 Afternoon Recharge

- Nutritious lunch
- Quick walk outside (15 min)
- Tackle creative or low-energy tasks

## 🌙 Evening Wind-Down (Reflect & recover)

- Dinner & family time
- Review accomplishments (what went well?)
- Prep tomorrow's checklist
- Hobby or reading (30 min)
- No screens after 9 PM
- Lights out by 10-11 PM

**Pro Tip:** Use these as templates—duplicate sections for specific days or projects! ✨
```

Are we missing an extension? Why are we losing the checklist in the rendering and back to source? I found this for example:
```
# TaskList extension

This extension enables you to use task lists in the editor. They are rendered as `<ul data-type="taskList">`. This implementation doesn’t require any framework, it’s using Vanilla JavaScript only.

Type `[ ]` or `[x]` at the beginning of a new line and it will magically transform to a task list.

## [](#install)Install

```
npm install @tiptap/extension-list
```

This extension requires the [`TaskItem`](/docs/editor/extensions/nodes/task-item) extension.

## [](#usage)Usage

```
import { Editor } from '@tiptap/core'
import { TaskList } from '@tiptap/extension-list'

new Editor({
  extensions: [TaskList],
})
```

This extension is installed by default with the `ListKit` extension, so you don’t need to install it separately.

```
import { Editor } from '@tiptap/core'
import { ListKit } from '@tiptap/extension-list-kit'

new Editor({
  extensions: [ListKit],
})
```

## [](#settings)Settings

### [](#htmlattributes)HTMLAttributes

Custom HTML attributes that should be added to the rendered HTML tag.

```
TaskList.configure({
  HTMLAttributes: {
    class: 'my-custom-class',
  },
})
```

### [](#itemtypename)itemTypeName

Specify the list item name.

Default: `'taskItem'`

```
TaskList.configure({
  itemTypeName: 'taskItem',
})
```

## [](#commands)Commands

# [](#toggletasklist)toggleTaskList()

Toggle a task list.

```
editor.commands.toggleTaskList()
```

## [](#keyboard-shortcuts)Keyboard shortcuts

Command

Windows/Linux

macOS

toggleTaskList()

Control + Shift + 9

Cmd + Shift + 9

## [](#source-code)Source code

[packages/extension-list/src/task-list/](https://github.com/ueberdosis/tiptap/blob/main/packages/extension-list/src/task-list/)

## [](#minimal-install)Minimal Install

```
import { Editor } from '@tiptap/core'
import { TaskList } from '@tiptap/extension-list/task-list'

new Editor({
  extensions: [TaskList],
})
```
```