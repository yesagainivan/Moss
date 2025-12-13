# Moss GitHub Setup & Deployment Guide

This guide will walk you through creating the official repository for **Moss**, uploading your code, and deploying your website to GitHub Pages.

## 1. Strategy: Private to Public

You asked whether to start Private or Public.
**Recommendation:** Start **Private**, then verify, then go **Public**.

**Why?**
1.  **Safety**: You can strictly verify that no API keys or sensitive files are committed before anyone sees it.
2.  **Cleanliness**: You can squash commits or fix history if needed without public eyes on it.
3.  **Deployment**: Once you are ready, you flip the switch to **Public**, which enables the free tier of GitHub Pages.

---

## 2. Preparation (Local)

Your project already has a `.gitignore` which looks good (ignores `node_modules`, `.env`, `target/`).

### Step 2.1: Initialize Git (if not already done)
Open your terminal in the project root (`Amber_brown`).
```sh
# Check if git is already initialized
git status

# If not initialized:
git init
git add .
git commit -m "Initial commit of Moss"
```

### Step 2.2: Verify Content
Ensure you haven't accidentally included any large media files (>100MB) or secret keys in files that aren't ignored.
*   The `website/` folder contains your static site.
*   The `src/` folder contains your app.

---

## 3. Creating the Repository

1.  Go to [GitHub.com/new](https://github.com/new).
2.  **Repository name**: `Moss` (or `Mosaic` if you are using the new name).
3.  **Visibility**: Select **Private**.
4.  **Initialize**: Do **not** check "Add a README", ".gitignore", or "License" (you already have them locally).
5.  Click **Create repository**.

## 4. Pushing Your Code

Copy the commands provided by GitHub under "…or push an existing repository from the command line":

```sh
git remote add origin https://github.com/YOUR_USERNAME/Moss.git
git branch -M main
git push -u origin main
```

*Replace `YOUR_USERNAME` with your actual GitHub username.*

---

## 5. Deployment (GitHub Pages)

Because your website lives in the `website/` folder (not the root), the default "Deploy from Branch" option in GitHub Pages works best with a GitHub Action. This is very easy to set up.

### Step 5.1: Create the Workflow File
Create a new file in your project at this exact path:
`.github/workflows/deploy_website.yml`

Paste this content into it:

```yaml
name: Deploy Website to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './website'
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

### Step 5.2: Commit and Push
```sh
git add .github/workflows/deploy_website.yml
git commit -m "Add GitHub Pages deployment workflow"
git push
```

## 6. Going Public & Live

Now that your code is safe on GitHub:

1.  **Make it Public**:
    *   Go to **Settings** > **General** > Scroll to "Danger Zone" > **Change repository visibility**.
    *   Select **Make public**.
2.  **Enable Pages**:
    *   Go to **Settings** > **Pages**.
    *   Under **Build and deployment** > **Source**, select **GitHub Actions**.
    *   The workflow you created (`Deploy Website to Pages`) should usually pick this up automatically, or you can manually trigger it from the "Actions" tab if it hasn't run yet.

Your site will be live at: `https://YOUR_USERNAME.github.io/Moss/`
