# Step 1: Discovery & Initialization

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- ALWAYS treat this as collaborative discovery between technical peers
- YOU ARE A FACILITATOR, not a content generator
- FOCUS on understanding the codebase structure before analysis
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

---

## STEP GOAL:

Initialize the code style analysis workflow by:
1. Checking for existing code-style-guide.md
2. Loading project context if available
3. Detecting languages, frameworks, and tooling
4. Identifying directories to scan
5. Configuring scan depth
6. Initializing the output document

---

## EXECUTION PROTOCOLS:

- Show your analysis before taking any action
- Check for existing style guide and offer to update or replace
- Identify all source code directories
- Exclude non-source directories (node_modules, dist, build, .git, etc.)
- Present findings for user validation

---

## CONTEXT BOUNDARIES:

- Available context: Config values loaded from workflow.md
- Focus: Codebase structure discovery
- Limits: Do not begin pattern extraction (that's Step 2)
- Dependencies: None (this is the first step)

---

## Sequence of Instructions (Do not deviate, skip, or optimize)

### 1. Check for Existing Style Guide

Search for existing code style documentation:

```
Search locations:
- {output_folder}/code-style-guide.md
- {project-root}/docs/code-style*.md
- {project-root}/.github/STYLE*.md
- {project-root}/CONTRIBUTING.md (may contain style info)
```

**If existing style guide found:**
Present to user:
"I found an existing code style guide at: {{path}}

Would you like to:
[U] Update - Analyze codebase and update the existing guide
[R] Replace - Start fresh and replace the existing guide
[C] Cancel - Exit without changes"

**If no style guide found:**
Continue to step 2.

---

### 2. Load Project Context (If Available)

Search for and load:
- `{output_folder}/project-context.md` - For existing rules and patterns
- `{output_folder}/**/architecture*.md` - For architectural patterns
- `{project-root}/package.json`, `go.mod`, `Cargo.toml`, etc. - For tech stack

Present findings:
"I found the following project context:

**Technology Stack:**
{{detected_technologies}}

**Existing Documentation:**
{{list_of_found_documents}}

Does this look correct? Any additional context I should know about?"

---

### 3. Detect Languages and Frameworks

Scan the codebase to identify:

**Languages** (by file extension):
- `.ts`, `.tsx` → TypeScript
- `.js`, `.jsx` → JavaScript
- `.py` → Python
- `.go` → Go
- `.rs` → Rust
- `.java` → Java
- `.cs` → C#
- `.rb` → Ruby
- `.php` → PHP
- (etc.)

**Frameworks** (by config files and patterns):
- `package.json` with react → React
- `next.config.*` → Next.js
- `angular.json` → Angular
- `vue.config.*` or `nuxt.config.*` → Vue/Nuxt
- `nest-cli.json` → NestJS
- `requirements.txt` with django → Django
- `Gemfile` with rails → Rails
- (etc.)

**Tooling** (by config files):
- `.eslintrc*` → ESLint
- `.prettierrc*` → Prettier
- `tsconfig.json` → TypeScript compiler
- `.editorconfig` → EditorConfig
- `jest.config.*` → Jest
- `vitest.config.*` → Vitest
- (etc.)

Present findings:
"Based on my scan, here's what I found:

**Primary Language(s):**
{{languages_with_file_counts}}

**Framework(s):**
{{frameworks_detected}}

**Code Quality Tools:**
{{tooling_detected}}

Does this accurately represent your project?"

---

### 4. Identify Directories to Scan

**Include directories:**
- `src/`, `lib/`, `app/`
- `packages/*/src/` (monorepo)
- `components/`, `services/`, `utils/`
- `tests/`, `__tests__/`, `spec/`

**Exclude directories:**
- `node_modules/`, `vendor/`
- `dist/`, `build/`, `out/`
- `.git/`, `.svn/`
- `coverage/`
- `.next/`, `.nuxt/`
- Any directory starting with `.`

Present findings:
"I'll analyze these directories:

**Source Code:**
{{source_directories_with_file_counts}}

**Tests:**
{{test_directories_with_file_counts}}

**Excluded:**
{{excluded_directories}}

Should I include or exclude any other directories?"

---

### 5. Configure Scan Depth

Present scan depth options:

"Choose your scan depth:

[Q] Quick Scan
   - Samples 20% of files randomly + all entry points
   - Best for: Getting a quick style overview
   - Coverage: Key patterns only

[D] Deep Scan (Recommended)
   - Samples 50% of files + all public APIs
   - Best for: Comprehensive style guide
   - Coverage: All major patterns with good examples

[E] Exhaustive Scan
   - Analyzes 100% of source files
   - Best for: Critical projects or migration planning
   - Coverage: Complete pattern inventory

Which scan depth would you like?"

**HALT AND WAIT for user selection.**

---

### 6. Initialize Output Document

After user confirms scan depth:

1. Copy template from `{installed_path}/code-style-guide-template.md` to `{output_folder}/code-style-guide.md`

2. Update frontmatter with discovered information:
```yaml
project_name: '{{project_name}}'
user_name: '{{user_name}}'
date: '{{current_date}}'
stepsCompleted: ['discovery']
inputDocuments: [{{list_of_loaded_documents}}]
languages: [{{detected_languages}}]
frameworks: [{{detected_frameworks}}]
scan_depth: '{{selected_scan_depth}}'
status: 'in_progress'
```

3. Update Technology Context section:
```markdown
## Technology Context

- **Primary Language**: {{primary_language}} {{version_if_known}}
- **Framework(s)**: {{frameworks}}
- **Package Manager**: {{package_manager}}
- **Code Quality**: {{linter}}, {{formatter}}
- **Testing**: {{test_framework}}
```

4. Create state file at `{output_folder}/code-style-analysis-state.json`:
```json
{
  "workflow_version": "1.0.0",
  "started": "{{timestamp}}",
  "scan_depth": "{{selected_depth}}",
  "directories_to_scan": [{{directories}}],
  "files_to_scan": {{file_count}},
  "current_step": "step-01",
  "categories_completed": [],
  "extraction_results": {}
}
```

Present confirmation:
"I've initialized the code style guide with your project information.

**Output file:** {{output_path}}
**Files to analyze:** {{file_count}} files in {{directory_count}} directories
**Scan depth:** {{scan_depth}}

Ready to begin pattern extraction?"

---

### 7. Proceed to Next Step

**ONLY when user confirms they are ready**, load and execute `./step-02-extract.md`.

---

## SUCCESS METRICS:

- Existing style guide detected and handled appropriately
- Project context loaded successfully (if available)
- Languages and frameworks accurately detected
- Scan directories identified and confirmed by user
- Scan depth selected by user
- Output document initialized with correct frontmatter
- State file created for resumability
- User has confirmed readiness to proceed

## FAILURE MODES:

- Proceeding without user confirmation on scan depth
- Missing important source directories
- Including generated/vendor code in scan
- Not detecting the primary language correctly
- Not creating the state file for resumability
- Proceeding to step-02 without user confirmation

---

## NEXT STEP:

Load `./step-02-extract.md` ONLY after user confirms readiness to begin pattern extraction.
