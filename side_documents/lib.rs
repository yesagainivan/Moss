//! # Courir Library
//!
//! A comprehensive Rust library for building, validating, editing, and exporting educational curricula.
//! Designed to power both CLI tools and web applications for curriculum management.
//!
//! ## Quick Start
//!
//! ```ignore
//! use courir_lib::{
//!     Curriculum,
//!     load_curriculum_with_theme,
//!     add_module,
//!     RenderContext,
//!     Validate,
//! };
//! use std::path::Path;
//!
//! // Load a curriculum
//! let curriculum_with_theme = load_curriculum_with_theme(Path::new("curriculum.yaml"))?;
//!
//! // Mutate it
//! let mut curriculum = curriculum_with_theme.curriculum;
//! let module_id = add_module(&mut curriculum, "New Module", None, 4)?;
//!
//! // Validate
//! curriculum.validate()?;
//!
//! // Render to HTML
//! let render_ctx = RenderContext::new(curriculum, curriculum_with_theme.theme);
//! let html = render_ctx.render_index_html()?;
//!
//! // Your app saves the HTML to a file
//! std::fs::write("output/index.html", html)?;
//! # Ok::<(), Box<dyn std::error::Error>>(())
//! ```
//!
//! ## Architecture
//!
//! The library is organized into functional modules:
//!
//! - **Data Models** (`models`, `quiz`, `theme`, `visualizer`): Define the curriculum structure
//! - **I/O** (`parsing`): Load and deserialize curriculum files
//! - **Validation** (`validation`): Verify curriculum integrity
//! - **Mutation** (`mutation`): Safely modify curriculum structures (pure functions, no I/O)
//! - **Rendering** (`export`): Transform curriculum to HTML, Markdown, CSS
//! - **Content Processing** (`markdown`): Handle Markdown with extensions (callouts, math)
//!
//! ## Core Workflow
//!
//! ```ignore
//! Parse YAML → Load Theme → Validate → [Mutate] → Render → Save/Serve
//! ```
//!
//! The library handles everything up to "Save/Serve". Your application handles file I/O and delivery.

// ============================================================================
// MODULE DECLARATIONS
// ============================================================================

/// Core data models for curriculum structure
///
/// Contains the main types:
/// - [`Curriculum`]: Root curriculum structure with metadata
/// - [`Course`]: Top-level course containing modules
/// - [`Module`]: Group of related activities
/// - [`Activity`]: Individual learning activity (Reading, Quiz, or Resource)
/// - [`Catalog`]: Collection of multiple courses
/// - [`CurriculumWithTheme`]: Curriculum paired with its theme
///
/// These types are serializable to/from YAML and fully validated.
pub mod models;

/// Markdown and content processing
///
/// Extends standard Markdown with:
/// - **Callouts**: `> [!info] Title` syntax for highlighted blocks
/// - **Math**: LaTeX expressions with `$...$` and `$$...$$` delimiters
/// - **Custom processing**: Event-based parsing for robust content handling
///
/// # Example
/// ```ignore
/// use courir_lib::markdown::process_math_in_text;
///
/// let text = "When $E = mc^2$, we have Einstein's equation.";
/// let html = process_math_in_text(text);
/// // Returns: "When <span class=\"math\">E = mc^2</span>, we have Einstein's equation."
/// ```
pub mod markdown;

/// Quiz structures and parsing
///
/// Provides:
/// - [`quiz::QuizData`]: Quiz definition with questions and passing score
/// - [`quiz::Question`]: Individual quiz question with options and feedback
/// - **YAML front-matter parsing**: Extract quiz data from Markdown files
/// - **Math processing**: Support LaTeX in questions and answers
///
/// # Example
/// ```ignore
/// use courir_lib::quiz::parse_markdown_frontmatter;
///
/// let md_content = r#"---
/// quiz:
///   passing_score: 75
///   questions:
///     - id: q1
///       question: "What is 2+2?"
///       options:
///         - text: "4"
///           correct: true
/// ---
/// # Quiz Content
/// "#;
///
/// let (frontmatter, body) = parse_markdown_frontmatter(md_content)?;
/// ```
pub mod quiz;

/// Theme system for customizable styling
///
/// Provides:
/// - [`theme::Theme`]: Color palette and typography configuration
/// - **Semantic colors**: Alert, Success, Warning, Info with semantic meaning
/// - **Theme-dependent colors**: Primary (60%), Secondary (30%), Accent (10%)
/// - **Dark mode support**: Automatic system theme detection
/// - **CSS generation**: Automatic theme CSS variable injection
///
/// # Example
/// ```ignore
/// use courir_lib::theme::{Theme, load_theme_or_default};
///
/// let theme = load_theme_or_default(None, std::path::Path::new("."))?;
/// let css = courir_lib::export::html::generate_theme_css(&theme);
/// ```
pub mod theme;

/// Interactive visualization configuration
///
/// Provides:
/// - [`visualizer::VisualizerConfig`]: Configuration for 2D/3D plots
/// - **2D visualizations**: Function plots, contour plots, vector fields
/// - **3D visualizations**: Surface plots, 3D vector fields, parametric curves
/// - **Interactive controls**: Toggles for grid, contours, streamlines
///
/// # Example
/// ```ignore
/// use courir_lib::visualizer::VisualizerConfig;
///
/// let config = VisualizerConfig {
///     r#type: "surface_3d".to_string(),
///     function: Some("x^2 + y^2".to_string()),
///     x_range: Some([-2.0, 2.0]),
///     y_range: Some([-2.0, 2.0]),
///     ..Default::default()
/// };
/// ```
pub mod visualizer;

/// YAML parsing and file loading
///
/// Handles:
/// - **Curriculum deserialization**: Parse `curriculum.yaml` files
/// - **Quiz extraction**: Load quiz data from markdown front-matter
/// - **Theme loading**: Load optional `theme.yaml` with fallback to defaults
/// - **Path resolution**: Smart handling of relative paths
///
/// # Functions
/// - [`parsing::load_curriculum_with_quizzes`]: Load curriculum with embedded quizzes
/// - [`parsing::load_curriculum_with_theme`]: Load curriculum with theme
///
/// # Example
/// ```ignore
/// use courir_lib::parsing::load_curriculum_with_theme;
/// use std::path::Path;
///
/// let curriculum_with_theme = load_curriculum_with_theme(
///     Path::new("curriculum.yaml")
/// )?;
/// ```
pub mod parsing;

/// Validation logic for all data structures
///
/// Implements the [`Validate`] trait for:
/// - [`Activity`]: Validates ID, title, duration, content file, quiz structure
/// - [`Module`]: Validates all activities, checks for duplicate IDs
/// - [`Course`]: Validates all modules, checks duration consistency
/// - [`Curriculum`]: Validates version, dates, and entire course structure
/// - [`Catalog`]: Validates all course entries and checks for duplicates
///
/// # Example
/// ```ignore
/// use courir_lib::Validate;
///
/// curriculum.validate()?;  // Full validation cascade
/// ```
pub mod validation;

/// Safe mutations for curriculum structures
///
/// Provides pure functions (no I/O) for modifying curricula:
/// - [`mutation::add_module`]: Add a new module to a course
/// - [`mutation::add_activity`]: Add a new activity to a module
/// - [`mutation::remove_module`]: Remove a module from a course
/// - [`mutation::remove_activity`]: Remove an activity from a module
/// - [`mutation::edit_module`]: Update module metadata
/// - [`mutation::edit_activity`]: Update activity metadata
///
/// All mutations validate the entire curriculum after changes.
///
/// # Example
/// ```ignore
/// use courir_lib::mutation::{add_module, edit_module};
///
/// let mut curriculum = load_curriculum_with_quizzes(path)?;
///
/// let module_id = add_module(&mut curriculum, "Introduction", None, 4)?;
/// edit_module(&mut curriculum, &module_id, Some("Getting Started"), None, None)?;
/// ```
pub mod mutation;

/// Scaffolding utilities for generating curriculum directory structures
///
/// Provides data structures describing what files/directories should be created,
/// along with placeholder content for each file. Does NOT perform I/O – your app decides how to use the scaffolding data.
///
/// Useful for:
/// - CLI tools: Generate files on disk
/// - Web apps: Generate in-memory structures or send as download
/// - Headless CMS: Store scaffolding in database
/// - SaaS: Create user projects programmatically
///
/// # Functions
/// - [`scaffolding::generate_scaffolding`]: Analyze curriculum and return scaffolding data
/// - [`scaffolding::apply_scaffolding_to_disk`]: Helper to create scaffolding on disk (CLI use)
///
/// # Example
/// ```ignore
/// use courir_lib::scaffolding::{generate_scaffolding, apply_scaffolding_to_disk};
///
/// let curriculum = Curriculum::from_yaml(yaml_str)?;
/// let scaffold = generate_scaffolding(&curriculum)?;
///
/// // Option 1: Create on disk (CLI)
/// let report = apply_scaffolding_to_disk(
///     std::path::Path::new("./my-course"),
///     &scaffold,
/// )?;
/// println!("{}", report.format());
///
/// // Option 2: Iterate and do custom I/O (web app, API, etc.)
/// for action in scaffold.files {
///     println!("Would create: {:?}", action);
/// }
/// ```
pub mod scaffolding;

/// Export scaffolding: Data structures for export file generation
///
/// Separates **scaffolding** (what files to create) from **rendering** (producing actual content).
/// This allows maximum flexibility: preview exports instantly, render asynchronously, stream to
/// browser, store in database, or implement custom I/O.
///
/// ## Key Workflow
///
/// 1. **Generate Scaffold**: Create a list of files with rendering instructions (instant, no rendering)
/// 2. **Render Files**: Execute rendering instructions to produce actual content
/// 3. **Apply**: Save to disk, ZIP, database, or whatever your app needs
///
/// ## Useful for
/// - CLI: `courir export` command saves to disk
/// - Web app: Generate ZIP download, stream files, or preview structure
/// - Note-taking app: Preview curriculum structure, render on-demand
/// - API: Return JSON scaffold, client renders later
/// - Headless: Store files in database or CDN
///
/// ## Architecture Benefits
///
/// - **Instant preview**: Show export structure without rendering (fast feedback)
/// - **Async rendering**: Render in background without blocking UI
/// - **Streaming exports**: Send files as they're rendered (great for large exports)
/// - **Custom I/O**: Implement any storage backend (disk, DB, CDN, etc.)
/// - **Error isolation**: Scaffolding failures are separate from rendering failures
///
/// # Functions
/// - [`export_scaffolding::generate_export_scaffold`]: Create export plan (no rendering)
/// - [`export_scaffolding::generate_export_scaffold_with_content`]: Include content files
/// - [`export_scaffolding::render_export_files`]: Execute rendering instructions
/// - [`export_scaffolding::apply_export_to_disk`]: Save rendered files to disk (CLI use)
///
/// # Example: Standard Flow (CLI/API)
///
/// ```ignore
/// use courir_lib::export_scaffolding::{
///     generate_export_scaffold,
///     render_export_files,
///     apply_export_to_disk,
/// };
/// use courir_lib::RenderContext;
/// use std::path::Path;
///
/// // Step 1: Generate scaffold (instant, no rendering)
/// let scaffold = generate_export_scaffold(&render_ctx)?;
/// println!("Export will create {} files", scaffold.summary.total_files);
///
/// // Step 2: Render files (this is where rendering happens)
/// let rendered_files = render_export_files(&render_ctx, &scaffold)?;
///
/// // Step 3: Save to disk
/// let report = apply_export_to_disk(Path::new("./output"), &rendered_files)?;
/// println!("{}", report.format());
/// ```
///
/// # Example: Note-Taking App (Preview + Async)
///
/// ```ignore
/// use courir_lib::export_scaffolding::generate_export_scaffold;
///
/// // Show user the export structure immediately
/// let scaffold = generate_export_scaffold(&render_ctx)?;
/// show_preview(scaffold.files);  // Fast, no rendering needed
///
/// // Render in background when user confirms
/// tokio::spawn(async move {
///     let rendered = render_export_files(&render_ctx, &scaffold)?;
///     // Save, ZIP, or send to user...
/// });
/// ```
///
/// # Example: Custom I/O
///
/// ```ignore
/// use courir_lib::export_scaffolding::{generate_export_scaffold, render_export_files};
///
/// let scaffold = generate_export_scaffold(&render_ctx)?;
/// let rendered_files = render_export_files(&render_ctx, &scaffold)?;
///
/// // Your custom logic for each file
/// for file in rendered_files {
///     if file.file_type == ExportFileType::Html {
///         database.store(&file.path, &file.content)?;
///     } else {
///         cdn.upload(&file.path, &file.content)?;
///     }
/// }
/// ```
pub mod export_scaffolding;

/// Content rendering and export
///
/// Provides:
/// - [`export::RenderContext`]: Main rendering orchestrator
/// - [`export::html`]: HTML rendering with Tera templates
/// - [`export::markdown`]: Markdown export functionality
/// - **CSS generation**: Theme-aware stylesheet generation
///
/// Renders to strings (no file I/O) – your app saves the output.
///
/// # Example
/// ```ignore
/// use courir_lib::export::RenderContext;
///
/// let render_ctx = RenderContext::new(curriculum, theme);
/// let index_html = render_ctx.render_index_html()?;
/// let module_html = render_ctx.render_module_html(&module)?;
/// let css = courir_lib::export::html::generate_theme_css(&theme);
/// ```
pub mod export;

// ============================================================================
// CORE RE-EXPORTS (Most Important Types)
// ============================================================================

/// Core data types
pub use models::{
    Activity, ActivityType, Catalog, CatalogEntry, CatalogRoot, Course, Curriculum,
    CurriculumWithTheme, Module,
};

/// Parsing functions
pub use parsing::{load_curriculum_with_quizzes, load_curriculum_with_theme};

/// Validation trait
pub use validation::Validate;

/// Mutation functions
pub use mutation::{
    add_activity, add_module, edit_activity, edit_module, remove_activity, remove_module,
};

/// Rendering context
pub use export::RenderContext;

// ============================================================================
// CONVENIENCE RE-EXPORTS (Less Common, But Available)
// ============================================================================

/// Quiz types (useful if building quiz editors)
pub use quiz::{Question, QuizData, QuizOption};

/// Theme types (useful if building theme editors)
pub use theme::Theme;

/// Visualizer types (useful if building interactive content)
pub use visualizer::VisualizerConfig;
