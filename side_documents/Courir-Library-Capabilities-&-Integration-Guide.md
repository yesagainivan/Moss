# Courir Library Capabilities & Integration Guide

## What the Library CAN Do (No File I/O Required)

### ✅ Pure Data Operations

```rust
// 1. PARSE & LOAD
let curriculum = Curriculum::from_yaml(yaml_string)?;
let ctx = load_curriculum_with_theme(file_path)?;  // Loads from file

// 2. VALIDATE
curriculum.validate()?;  // Full validation

// 3. MUTATE (pure logic, no side effects)
let module_id = mutation::add_module(&mut curriculum, "Intro", None, 4)?;
let activity_id = mutation::add_activity(&mut curriculum, "mod_1", "Reading", "Chapter 1", None, 45)?;
mutation::edit_module(&mut curriculum, "mod_1", Some("New Title"), None, None)?;
mutation::remove_module(&mut curriculum, "mod_1")?;

// 4. RENDER (returns strings, no file I/O)
let render_ctx = RenderContext::new(curriculum, theme);
let index_html: String = render_ctx.render_index_html()?;
let module_html: String = render_ctx.render_module_html(&module)?;
let index_md: String = render_ctx.render_index_markdown()?;
let module_md: String = render_ctx.render_module_markdown(&module)?;

// 5. EXPORT UTILITIES
let css: String = export::html::generate_theme_css(&theme);
```

### ✅ Perfect for Your AI Editor

```rust
// User edits curriculum in your UI
let mut curriculum = load_curriculum_with_quizzes(&path)?;

// Click "Add Module"
let module_id = add_module(&mut curriculum, "New Module", None, 4)?;

// Click "Preview"
let render_ctx = RenderContext::new(curriculum, theme);
let html = render_ctx.render_index_html()?;
send_to_browser(html);  // Display preview

// Click "Save"
let yaml = serde_yaml::to_string(&curriculum)?;
save_to_file(path, yaml)?;  // Your code handles file I/O
```

---

## What Needs to Be Implemented in Your App

### ❌ NOT in the Library (Your Responsibility)

The library provides **rendering logic**, but your app must handle:

1. **File I/O & Directory Management**
   ```rust
   // Library gives you: HTML string
   // You must do:
   fs::create_dir_all(output_dir)?;
   fs::write(output_path, html_string)?;
   ```

2. **Serving/Delivering Files**
   ```rust
   // Library gives you: CSS string
   // You must do:
   actix_web::HttpResponse::Ok()
       .content_type("text/css")
       .body(css_string)
   ```

3. **Content File Rendering**
   ```rust
   // Library doesn't include: Reading markdown files & rendering them
   // You must do:
   let content = fs::read_to_string(activity.content_file)?;
   let html = render_markdown(&content)?;  // Your code
   ```

4. **Static Asset Copying**
   ```rust
   // Library doesn't include: Copying templates, JS, etc.
   // You must do:
   copy_templates_to_output()?;
   copy_js_vendors()?;
   ```

---

## Two Approaches for Your App

### Approach A: Generate Static Website (Full File Output)

```rust
// courir_app/src/export.rs
use courir_lib::export::RenderContext;
use std::fs;

pub fn generate_static_site(
    curriculum_path: &Path,
    output_dir: &Path,
) -> Result<(), String> {
    // 1. Load (library)
    let curriculum_with_theme = 
        courir_lib::parsing::load_curriculum_with_theme(curriculum_path)?;
    
    let render_ctx = RenderContext::new(
        curriculum_with_theme.curriculum,
        curriculum_with_theme.theme,
    );

    // 2. Create output directory (your code)
    fs::create_dir_all(output_dir)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    // 3. Render and save index (library + your code)
    let index_html = render_ctx.render_index_html()?;
    fs::write(output_dir.join("index.html"), index_html)?;

    // 4. Render and save each module (library + your code)
    for module in &render_ctx.curriculum.course.modules {
        let module_html = render_ctx.render_module_html(module)?;
        let filename = format!("{}.html", module.id);
        fs::write(output_dir.join(filename), module_html)?;
    }

    // 5. Save CSS (library + your code)
    let css = courir_lib::export::html::generate_theme_css(&render_ctx.theme);
    fs::write(output_dir.join("style.css"), css)?;

    // 6. Copy content directory (your code)
    copy_content_files(curriculum_path.parent().unwrap(), output_dir)?;

    // 7. Copy templates/JS (your code)
    copy_static_assets(output_dir)?;

    Ok(())
}

fn copy_content_files(src: &Path, dst: &Path) -> Result<(), String> {
    let content_src = src.join("content");
    if content_src.exists() {
        let content_dst = dst.join("content");
        copy_dir_recursive(&content_src, &content_dst)?;
    }
    Ok(())
}

fn copy_static_assets(output_dir: &Path) -> Result<(), String> {
    // Copy base.html, module.html, base.js, style.css, etc.
    // Include these as embedded strings or from `templates/` directory
    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let file_name = entry.file_name();
        let dest_path = dst.join(&file_name);

        if path.is_dir() {
            copy_dir_recursive(&path, &dest_path)?;
        } else {
            fs::copy(&path, &dest_path)?;
        }
    }
    Ok(())
}
```

**Usage:**
```rust
generate_static_site(
    Path::new("curriculum.yaml"),
    Path::new("./output"),
)?;
```

---

### Approach B: Web Server (Render on Demand)

```rust
// courir_app/src/web.rs
use actix_web::{web, HttpResponse, Result};
use courir_lib::export::RenderContext;

pub async fn get_index(
    curriculum_path: web::Data<String>,
) -> Result<HttpResponse> {
    let curriculum_with_theme =
        courir_lib::parsing::load_curriculum_with_theme(
            std::path::Path::new(&**curriculum_path),
        )
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let render_ctx = RenderContext::new(
        curriculum_with_theme.curriculum,
        curriculum_with_theme.theme,
    );

    let html = render_ctx.render_index_html()
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(html))
}

pub async fn get_module(
    curriculum_path: web::Data<String>,
    module_id: web::Path<String>,
) -> Result<HttpResponse> {
    let curriculum_with_theme =
        courir_lib::parsing::load_curriculum_with_theme(
            std::path::Path::new(&**curriculum_path),
        )
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let render_ctx = RenderContext::new(
        curriculum_with_theme.curriculum,
        curriculum_with_theme.theme,
    );

    let module = render_ctx.curriculum
        .course
        .modules
        .iter()
        .find(|m| m.id == *module_id)
        .ok_or_else(|| actix_web::error::ErrorNotFound("Module not found"))?;

    let html = render_ctx.render_module_html(module)
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(html))
}

pub async fn get_css(
    curriculum_path: web::Data<String>,
) -> Result<HttpResponse> {
    let curriculum_with_theme =
        courir_lib::parsing::load_curriculum_with_theme(
            std::path::Path::new(&**curriculum_path),
        )
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let css = courir_lib::export::html::generate_theme_css(
        &curriculum_with_theme.theme
    );

    Ok(HttpResponse::Ok()
        .content_type("text/css")
        .body(css))
}
```

---

## Summary: What You Need to Do in Your App

| Feature | Library Provides | You Implement |
|---------|------------------|---------------|
| Parse YAML | ✅ `Curriculum::from_yaml()` | - |
| Validate | ✅ `validate()` | - |
| Mutate | ✅ `add_module()`, `edit_activity()`, etc. | - |
| Render HTML | ✅ Returns HTML string | File I/O, serving |
| Render CSS | ✅ Returns CSS string | File I/O, serving |
| Content files | ❌ | Read `.md` files, render them |
| Static assets | ❌ | Copy templates, JS, images |
| UI/Button handling | ❌ | "Generate" button logic |
| Preview | ✅ (renders HTML) | Display in iframe/browser |
| Save | ✅ (serialize) | `fs::write()` |

---

## Minimal Implementation for Your App

To get a working "Generate" button:

```rust
// In your backend (Actix, Rocket, Axum, etc.)

#[post("/api/generate")]
async fn generate_website(
    req: web::Json<GenerateRequest>,
) -> Result<HttpResponse> {
    // 1. Load curriculum
    let curriculum_with_theme = 
        courir_lib::parsing::load_curriculum_with_theme(
            &req.curriculum_path,
        )?;

    // 2. Render
    let render_ctx = RenderContext::new(
        curriculum_with_theme.curriculum,
        curriculum_with_theme.theme,
    );

    let index = render_ctx.render_index_html()?;
    let css = courir_lib::export::html::generate_theme_css(&render_ctx.theme);

    // 3. Save files (you handle this)
    std::fs::create_dir_all(&req.output_dir)?;
    std::fs::write(
        format!("{}/index.html", req.output_dir),
        index,
    )?;
    std::fs::write(
        format!("{}/style.css", req.output_dir),
        css,
    )?;

    // 4. Return success
    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "output_dir": req.output_dir,
    })))
}
```

That's it! Library does the heavy lifting, your app handles delivery.
