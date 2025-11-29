# Image extension

Use this extension to render `<img>` HTML tags. By default, those images are blocks. If you want to render images in line with text set the `inline` option to `true`.

### No Server Functionality

This extension is only responsible for displaying images. It doesn’t upload images to your server, for that you can integrate the [FileHandler extension](/docs/editor/extensions/functionality/filehandler)

## [](#install)Install

```
npm install @tiptap/extension-image
```

## [](#settings)Settings

### [](#inline)inline

Renders the image node inline, for example in a paragraph tag: `<p><img src="spacer.gif"></p>`. By default images are on the same level as paragraphs.

It totally depends on what kind of editing experience you’d like to have, but can be useful if you (for example) migrate from Quill to Tiptap.

Default: `false`

```
Image.configure({
  inline: true,
})
```

### [](#resize)resize

Options for resizable images. If defined the node will be wrapped in a [resizable node view](/docs/editor/api/resizable-nodeviews) making it possible to resize the image via resize handles.

Default: `undefined`

```
Image.configure({
  resize: {
    enabled: true,
    directions: ['top', 'bottom', 'left', 'right'], // can be any direction or diagonal combination
    minWidth: 50,
    minHeight: 50,
    alwaysPreserveAspectRatio: true,
  }
})
```

### [](#allowbase64)allowBase64

Allow images to be parsed as base64 strings `<img src="data:image/jpg;base64...">`.

Default: `false`

```
Image.configure({
  allowBase64: true,
})
```

### [](#htmlattributes)HTMLAttributes

Custom HTML attributes that should be added to the rendered HTML tag.

```
Image.configure({
  HTMLAttributes: {
    class: 'my-custom-class',
  },
})
```

## [](#commands)Commands

### [](#setimage)setImage()

Makes the current node an image.

```
editor.commands.setImage({ src: 'https://example.com/foobar.png' })
editor.commands.setImage({
  src: 'https://example.com/foobar.png',
  alt: 'A boring example image',
  title: 'An example',
})
```

## [](#examples)Examples

### [](#resizable-images)Resizable Images

## [](#source-code)Source code

[packages/extension-image/](https://github.com/ueberdosis/tiptap/blob/main/packages/extension-image/)