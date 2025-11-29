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