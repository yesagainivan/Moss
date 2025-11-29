# Mathematics extension

This extension allows you to insert math formulas into your editor. It uses [KaTeX](https://katex.org/) to render math formulas written in LaTeX.

# [](#install)Install

```
npm install @tiptap/extension-mathematics katex
```

## [](#usage)Usage

```
import { Mathematics } from '@tiptap/extension-mathematics'

const editor = new Editor({
  extensions: [
    Mathematics.configure({
      inlineOptions: {
        // optional options for the inline math node
      },
      blockOptions: {
        // optional options for the block math node
      },
      katexOptions: {
        // optional options for the KaTeX renderer
      },
    }),
  ],
})
```

## [](#additional-setup)Additional Setup

### [](#styling-the-katex-rendering)Styling the KaTeX rendering

You are free to style the rendering element and the editor input.

**Import of KaTeX styling (needed).**

```
import 'katex/dist/katex.min.css'
```

The following classes allow you to select and style the math nodes. For an example, see demonstration code at the end of this page.

```
/* The rendered math node */
.tiptap-mathematics-render {
  // …
}

/* This selector only selects editable math nodes */
.tiptap-mathematics-render--editable {
  // …
}

/** This selector only selects block math nodes */
.tiptap-mathematics-render[data-type="block-math"] {
  // …
}

/** This selector only selects inline math nodes */
.tiptap-mathematics-render[data-type="inline-math"] {
  // …
}
```

### [](#configuring-the-extension-and-updating-math-nodes)Configuring the extension and updating math nodes

The extension comes with a few options to configure the behavior of the math nodes.

```
import Mathematics from '@tiptap/extension-mathematics'

// [...]

Mathematics.configure({
  // Options for the inline math node
  inlineOptions: {
    onClick: (node, pos) => {
      // you can do anything on click, e.g. open a dialog to edit the math node
      // or just a prompt to edit the LaTeX code for a quick prototype
      const katex = prompt('Enter new calculation:', node.attrs.latex)
      if (katex) {
        editor.chain().setNodeSelection(pos).updateInlineMath({ latex: katex }).focus().run()
      }
    },
  },

  // Options for the block math node
  blockOptions: {
    onClick: (node, pos) => {
      // you can do anything on click, e.g. open a dialog to edit the math node
      // or just a prompt to edit the LaTeX code for a quick prototype
      const katex = prompt('Enter new calculation:', node.attrs.latex)
      if (katex) {
        editor.chain().setNodeSelection(pos).updateBlockMath({ latex: katex }).focus().run()
      }
    },
  },

  // Options for the KaTeX renderer. See here: https://katex.org/docs/options.html
  katexOptions: {
    throwOnError: false, // don't throw an error if the LaTeX code is invalid
    macros: {
      '\\R': '\\mathbb{R}', // add a macro for the real numbers
      '\\N': '\\mathbb{N}', // add a macro for the natural numbers
    },
  },
}
```

### [](#migrating-existing-math-decorations-to-math-nodes)Migrating existing math decorations to math nodes

Since the Math extension used to be a decoration extension, you might have existing math decorations in your editor. To migrate them to the new math nodes, you can use the `migrateMathStrings` utility function provided by the extension.

```
import { migrateMathStrings } from '@tiptap/extension-mathematics'

// The best way to do this is to run it in the `onCreate` hook of your editor
// but you have to be cautious in collaborative environments to wait for the initial document to be loaded
const editor = new Editor({
  // [...]
  onCreate: ({ editor: currentEditor }) => {
    migrateMathStrings(currentEditor)
  },
})

// or if you are running a collaborative environment with a provider
const editor = new Editor({
  // [...]
  onCreate: ({ editor: currentEditor }) => {
    provider.on('synced', () => {
      migrateMathStrings(currentEditor)
    })
  },
})
```

### [](#only-importing-one-type-of-math-node)Only importing one type of math node

If you only want to use one type of math node (either inline or block), you can import the respective extension directly:

```
import { InlineMath } from '@tiptap/extension-mathematics/inline'

// [...]

InlineMath.configure({
  katexOptions: {
    // optional options for the KaTeX renderer
  },
  onClick: (node, pos) => {
    // you can do anything on click, e.g. open a dialog to edit the math node
    // or just a prompt to edit the LaTeX code for a quick prototype
    const katex = prompt('Enter new calculation:', node.attrs.latex)
    if (katex) {
      editor.chain().setNodeSelection(pos).updateInlineMath({ latex: katex }).focus().run()
    }
  },
})
```

## [](#settings)Settings

### [](#inlineoptions)`inlineOptions`

This option allows you to configure the inline math node. You can pass any options that are supported by the inline math node, such as `onClick` to handle click events on the node.

Default: `undefined`

```
import Mathematics from '@tiptap/extension-mathematics'

// [...]

Mathematics.configure({
  inlineOptions: {
    onClick: (node, pos) => {
      // you can do anything on click, e.g. open a dialog to edit the math node
      // or just a prompt to edit the LaTeX code for a quick prototype
      const katex = prompt('Enter new calculation:', node.attrs.latex)
      if (katex) {
        editor.chain().setNodeSelection(pos).updateInlineMath({ latex: katex }).focus().run()
      }
    },
  },
})
```

### [](#blockoptions)`blockOptions`

This option allows you to configure the block math node. You can pass any options that are supported by the block math node, such as `onClick` to handle click events on the node.

Default: `undefined`

```
import Mathematics from '@tiptap/extension-mathematics'

// [...]

Mathematics.configure({
  blockOptions: {
    onClick: (node) => {
      // you can do anything on click, e.g. open a dialog to edit the math node
      // or just a prompt to edit the LaTeX code for a quick prototype
      const katex = prompt('Enter new calculation:', node.attrs.latex)
      if (katex) {
        editor.chain().setNodeSelection(pos).updateBlockMath({ latex: katex }).focus().run()
      }
    },
  },
})
```

### [](#katexoptions)`katexOptions`

This option allows you to configure the KaTeX renderer. You can see all options [here](https://katex.org/docs/options.html).

Default: `undefined`

```
import Mathematics from '@tiptap/extension-mathematics'

// [...]

Mathematics.configure({
  katexOptions: {
    throwOnError: false, // don't throw an error if the LaTeX code is invalid
    macros: {
      '\\R': '\\mathbb{R}', // add a macro for the real numbers
      '\\N': '\\mathbb{N}', // add a macro for the natural numbers
    },
  },
})
```

## [](#settings-inlinemath)Settings: `InlineMath`

### [](#onclick)`onClick`

This option allows you to handle click events on the inline math node. You can use it to open a dialog to edit the math node or just a prompt to edit the LaTeX code for a quick prototype.

Default: `undefined`

```
import { InlineMath } from '@tiptap/extension-mathematics'

// [...]

InlineMath.configure({
  onClick: (node) => {
    // you can do anything on click, e.g. open a dialog to edit the math node
    // or just a prompt to edit the LaTeX code for a quick prototype
    const katex = prompt('Enter new calculation:', node.attrs.latex)
    if (katex) {
      editor.chain().setNodeSelection(pos).updateInlineMath({ latex: katex }).focus().run()
    }
  },
})
```

### [](#katexoptions)`katexOptions`

This option allows you to configure the KaTeX renderer for the inline math node. You can see all options [here](https://katex.org/docs/options.html).

Default: `undefined`

```
import { InlineMath } from '@tiptap/extension-mathematics'

// [...]

InlineMath.configure({
  katexOptions: {
    throwOnError: false, // don't throw an error if the LaTeX code is invalid
    macros: {
      '\\R': '\\mathbb{R}', // add a macro for the real numbers
      '\\N': '\\mathbb{N}', // add a macro for the natural numbers
    },
  },
})
```

## [](#settings-blockmath)Settings: `BlockMath`

### [](#onclick)`onClick`

This option allows you to handle click events on the block math node. You can use it to open a dialog to edit the math node or just a prompt to edit the LaTeX code for a quick prototype.

Default: `undefined`

```
import { BlockMath } from '@tiptap/extension-mathematics'

// [...]

BlockMath.configure({
  onClick: (node) => {
    // you can do anything on click, e.g. open a dialog to edit the math node
    // or just a prompt to edit the LaTeX code for a quick prototype
    const katex = prompt('Enter new calculation:', node.attrs.latex)
    if (katex) {
      editor.chain().setNodeSelection(pos).updateBlockMath({ latex: katex }).focus().run()
    }
  },
})
```

### [](#katexoptions)`katexOptions`

This option allows you to configure the KaTeX renderer for the block math node. You can see all options [here](https://katex.org/docs/options.html).

Default: `undefined`

```
import { BlockMath } from '@tiptap/extension-mathematics'

// [...]

BlockMath.configure({
  katexOptions: {
    throwOnError: false, // don't throw an error if the LaTeX code is invalid
    macros: {
      '\\R': '\\mathbb{R}', // add a macro for the real numbers
      '\\N': '\\mathbb{N}', // add a macro for the natural numbers
    },
  },
})
```

## [](#commands-inlinemath)Commands: InlineMath

### [](#insertinlinemath-latex-pos)`insertInlineMath({ latex, pos })`

Inserts a new inline math node with the given LaTeX code at the specified position. If `pos` is not provided, it will insert the node at the current selection.

```
// with a specified position
editor.commands.insertInlineMath({
  latex: '\\frac{a}{b}',
  pos: 38,
})

// or without a position
editor.commands.insertInlineMath({
  latex: '\\frac{a}{b}',
})
```

### [](#deleteinlinemath-pos)`deleteInlineMath({ pos })`

Deletes the inline math node at the specified position. If `pos` is not provided, it will delete the node at the current selection.

```
// with a specified position
editor.commands.deleteInlineMath({
  pos: 38,
})

// or without a position
editor.commands.deleteInlineMath()
```

### [](#updateinlinemath-latex-pos)`updateInlineMath({ latex, pos })`

Updates the inline math node at the specified position with the given LaTeX code. If `pos` is not provided, it will update the node at the current selection.

```
// with a specified position
editor.commands.updateInlineMath({
  latex: '\\frac{a}{b}',
  pos: 38,
})

// or without a position
editor.commands.updateInlineMath({
  latex: '\\frac{a}{b}',
})
```

## [](#commands-blockmath)Commands: BlockMath

### [](#insertblockmath-latex-pos)`insertBlockMath({ latex, pos })`

Inserts a new block math node with the given LaTeX code at the specified position. If `pos` is not provided, it will insert the node at the current selection.

```
// with a specified position
editor.commands.insertBlockMath({
  latex: '\\frac{a}{b}',
  pos: 38,
})

// or without a position
editor.commands.insertBlockMath({
  latex: '\\frac{a}{b}',
})
```

### [](#deleteblockmath-pos)`deleteBlockMath({ pos })`

Deletes the block math node at the specified position. If `pos` is not provided, it will delete the node at the current selection.

```
// with a specified position
editor.commands.deleteBlockMath({
  pos: 38,
})

// or without a position
editor.commands.deleteBlockMath()
```

### [](#updateblockmath-latex-pos)`updateBlockMath({ latex, pos })`

Updates the block math node at the specified position with the given LaTeX code. If `pos` is not provided, it will update the node at the current selection.

```
// with a specified position
editor.commands.updateBlockMath({
  latex: '\\frac{a}{b}',
  pos: 38,
})

// or without a position
editor.commands.updateBlockMath({
  latex: '\\frac{a}{b}',
})
```

## [](#utilities-and-constants)Utilities & Constants

### [](#mathmigrationregex)`mathMigrationRegex`

The default regular expression used to find and migrate math strings in the editor. It matches LaTeX expressions wrapped in `$` symbols.

```
import { mathMigrationRegex } from '@tiptap/extension-mathematics'
```

### [](#createmathmigratetransactioneditor-transaction-regex)`createMathMigrateTransaction(editor, transaction, regex)`

Creates a ProseMirror transaction that migrates math strings in the editor document to math nodes. It uses the provided regular expression to find math strings.

### [](#params)Params

-   `editor`: The ProseMirror editor instance.
-   `transaction`: The ProseMirror transaction to modify.
-   `regex` (Optional): The regular expression to use for finding math strings. Defaults to `mathMigrationRegex`.

```
import { createMathMigrateTransaction } from '@tiptap/extension-mathematics'

const tr = createMathMigrateTransaction(editor, editor.state.tr, mathMigrationRegex)
editor.view.dispatch(tr)
```

### [](#migratemathstringseditor-regex)`migrateMathStrings(editor, regex)`

Creates and runs a migration transaction to convert math strings in the editor document to math nodes. It uses the provided regular expression to find math strings.

### [](#params)Params

-   `editor`: The ProseMirror editor instance.
-   `regex` (Optional): The regular expression to use for finding math strings. Defaults to `mathMigrationRegex`.

```
import { migrateMathStrings } from '@tiptap/extension-mathematics'

migrateMathStrings(editor, mathMigrationRegex)
```