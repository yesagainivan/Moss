# Moss Branding - RemainingTasks

This document lists the branding tasks that need to be completed manually.

## 🎨 Icons & Visual Assets

### Application Icons
The default Tauri icons in `src-tauri/icons/` need to be replaced with custom Moss branding:

- [x] **icon.png** (source icon, 512x512 or larger recommended)
- [x] **icon.icns** (macOS app icon)
- [x] **icon.ico** (Windows app icon)
- [x] **32x32.png** (for macOS)
- [x] **128x128.png** (for macOS)
- [x] **128x128@2x.png** (for macOS Retina)
- [x] **Square*.png** files (for Windows Store, if publishing)

**Recommended workflow:**
1. Design a master icon (SVG or high-resolution PNG, 1024x1024 minimum)
2. Use a tool like [tauri-icon](https://www.npmjs.com/package/@tauri-apps/tauricon) to generate all sizes:
   ```bash
   npx @tauri-apps/tauricon path/to/your/icon.png
   ```

### Favicon
- [x] Create a custom Moss favicon
- [x] Replace `/vite.svg` referenced in [index.html](file:///Users/ivanowono/Documents/Code/Rusty/Apps/brown/Amber_brown/index.html#L6)
- [x] Update the `<link rel="icon">` tag to point to your new favicon

**Suggested formats:**
- `favicon.ico` (traditional, multi-size)
- `favicon.svg` (modern, scalable)
- Or keep as PNG if preferred

## 📝 Optional Documentation Updates

- [x] Update `README.md` (if it exists) with Moss branding
- [x] Add a proper description of what Moss is
- [x] Include screenshots of the app
- [x] Add installation instructions

## 📄 Legal & Metadata

- [x] Add or update `LICENSE` file with appropriate license
- [x] Update any copyright notices to reflect Moss
- [x] Consider adding an "About" section in the app with version info

## 🔄 After Icon Updates

Once you've created and replaced the icons, you'll need to:

1. **Rebuild the app** to see the new icons:
   ```bash
   npm run tauri build
   ```

2. **Test the icons** on your platform to ensure they look good at all sizes

## 💡 Design Suggestions for Moss Icons

Since Moss is a markdown note-taking app, consider icon designs that incorporate:
- A stylized "M" monogram
- Moss/nature aesthetic (earthy green tones)
- Document/note motifs
- Clean, modern minimalist design
- Colors that work well in both light and dark themes

---

**Current Status**: All branding tasks, including visual assets, configuration files, and code, have been completed! ✨
