# Callout Implementation Demo

This document tests various callout scenarios to ensure robust implementation.

## Basic Callout Types

> [!info] Information Callout
> This is a basic information callout with some text content.

> [!warning] Warning Callout
> This is a warning callout that should grab attention.

> [!success] Success Callout
> This is a success callout for positive feedback.

> [!danger] Danger Callout
> This is a danger callout for critical warnings.

## Multi-line Content

> [!info] Multi-line Information
> This callout contains multiple lines of text.
> Each line should be properly rendered.
> And spacing should be preserved between lines.

> [!warning] Long Content Warning
> This is a much longer warning callout that contains several lines of text to test how the rendering handles longer content blocks.
> 
> It even includes a blank line above this paragraph.
> 
> And another blank line above this one to test spacing handling.

## Edge Cases

> [!info] Title Only
> 

> [!success] Special Characters in Title!@#$%
> Testing special characters in both title and content: !@#$%^&*()

> [!danger] Very Long Title That Goes On And On And Should Test Wrapping Behavior
> Short content.

> [!info] Content With Formatting
> This content has **bold text** and *italic text* and `inline code`.

## Sequential Callouts

> [!info] First Callout
> This is the first callout in a sequence.

> [!warning] Second Callout
> This is the second callout immediately following the first.

> [!success] Third Callout
> This is the third callout in the sequence.

> [!danger] Fourth Callout
> This is the fourth and final callout in this sequence.

## Nested in Other Content

Here is some regular paragraph text before a callout.

> [!info] Callout in Context
> This callout appears within regular content.

And here is some regular paragraph text after the callout.

### In a List Context

1. First list item
2. Second list item
3. Third list item with callout below:

> [!warning] Callout After List
> This callout appears after a list.

4. Fourth list item after callout

## Stress Test - Many Callouts

> [!info] Callout 1
> Content for callout 1

> [!warning] Callout 2
> Content for callout 2

> [!success] Callout 3
> Content for callout 3

> [!danger] Callout 4
> Content for callout 4

> [!info] Callout 5
> Content for callout 5

> [!warning] Callout 6
> Content for callout 6

> [!success] Callout 7
> Content for callout 7

> [!danger] Callout 8
> Content for callout 8

> [!info] Callout 9
> Content for callout 9

> [!warning] Callout 10
> Content for callout 10

## Empty Title Test

> [!info] 
> This callout has no title text after the type.

## Unicode and Emoji

> [!success] Unicode Test 你好 🎉
> Content with unicode: 世界 and emojis: 🚀 ✨ 💡 🔥

## Very Long Content

> [!info] Stress Test - Long Content
> Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
> 
> Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
> 
> Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

## Multiple Blank Lines

> [!warning] Blank Line Test
> Line 1
> 
> 
> 
> Line 2 after multiple blank lines

## Tab Character Test

> [!info] Content with tabs
> This line has	a tab	character in it.

## End of Document Callout

> [!success] Final Callout
> This is the very last callout in the document to test end-of-file handling.
