# Step 2: Automated Pattern Extraction

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER skip files or directories without logging
- ALWAYS use batching to manage context (process by directory)
- YOU ARE AN ANALYST extracting statistical patterns
- FOCUS on finding dominant patterns (>70% threshold)
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

---

## STEP GOAL:

Automatically extract coding patterns from the codebase by:
1. Scanning files according to configured scan depth
2. Extracting patterns for each of 12 categories
3. Calculating pattern statistics (occurrences, percentages)
4. Identifying anomalies (deviations from dominant patterns)
5. Storing results in state file for Step 3

---

## EXECUTION PROTOCOLS:

- Process directories in batches to manage context
- After each batch: extract patterns, store results, summarize findings
- Track progress in state file for resumability
- Show progress to user during extraction
- Focus on STATISTICAL patterns, not individual judgments

---

## BATCHING STRATEGY:

For each directory in `directories_to_scan`:
1. Load files according to scan depth (20%, 50%, or 100%)
2. Extract patterns for all 12 categories
3. Aggregate statistics with previous batches
4. Update state file with batch completion
5. Show progress: "Analyzed {{directory}} - Found {{patterns}} patterns"
6. Purge raw file content from context (keep only statistics)

---

## PATTERN EXTRACTION BY CATEGORY

### 1. Naming Conventions

**Variables:**
- Scan variable declarations: `const`, `let`, `var`, `def`, `:=`, etc.
- Classify: camelCase, snake_case, PascalCase, SCREAMING_SNAKE_CASE
- Track boolean prefixes: `is`, `has`, `can`, `should`, `will`
- Note: Hungarian notation, type prefixes

**Functions/Methods:**
- Scan function declarations and method definitions
- Classify case style
- Track verb patterns: `get`, `set`, `fetch`, `handle`, `create`, `update`, `delete`, `on`, `before`, `after`
- Track async naming: `Async` suffix, `Promise` types

**Classes/Components:**
- Scan class declarations, React components, Vue components
- Classify case style
- Track suffixes: `Service`, `Controller`, `Repository`, `Component`, `Provider`, `Factory`, `Wrapper`

**Files:**
- Analyze file names in source directories
- Classify: kebab-case, snake_case, PascalCase, camelCase
- Track patterns: `*.service.ts`, `*.test.ts`, `use*.ts`, `index.ts`

**Constants:**
- Scan constant declarations (uppercase patterns)
- Track grouping (enums, objects, flat constants)

**Types/Interfaces (if applicable):**
- Scan type and interface declarations
- Track prefixes: `I`, `T`, none
- Track suffixes: `Type`, `Interface`, `DTO`, `Request`, `Response`

---

### 2. Code Formatting

**Indentation:**
- Sample file beginnings to detect leading whitespace
- Classify: 2 spaces, 4 spaces, tabs
- Check consistency across files

**Line Length:**
- Calculate max line lengths across files
- Determine soft limit (most lines under X)
- Note any `.editorconfig` or linter rules

**Bracket Style:**
- Scan `if`, `function`, `class` declarations
- Classify: K&R (same line), Allman (new line), other

**Semicolons (JS/TS):**
- Scan statement endings
- Calculate: always, never, inconsistent

**Quotes (JS/TS/Python):**
- Scan string literals
- Classify: single, double, backtick usage patterns

**Trailing Commas:**
- Scan multiline arrays and objects
- Classify: always, multiline only, never

---

### 3. Comment Style

**Comment Frequency:**
- Calculate comment-to-code ratio
- Note: heavy, moderate, minimal, none

**Comment Format:**
- Scan for JSDoc `/** */`, docstrings `"""`, inline `//`, block `/* */`
- Identify dominant format for documentation

**TODO/FIXME Patterns:**
- Search for TODO, FIXME, HACK, NOTE comments
- Extract format patterns: `TODO:`, `TODO(name):`, `TODO [JIRA-123]:`

**Documentation Coverage:**
- Check if public functions have docs
- Check if classes have docs
- Note undocumented areas

---

### 4. Design Patterns

**Repository/Service Pattern:**
- Search for `*Repository`, `*Service` classes
- Analyze separation of concerns

**Factory Pattern:**
- Search for `create*`, `*Factory`, factory functions
- Note: when used, how structured

**Observer/Event Pattern:**
- Search for `EventEmitter`, `on(`, `emit(`, `subscribe(`
- Note event naming conventions

**Dependency Injection:**
- Search for DI decorators: `@Injectable`, `@Inject`
- Search for constructor injection patterns

**State Machine:**
- Search for state enums, transition patterns
- Note: explicit vs implicit state management

**Framework-Specific Patterns:**
- React: hooks, HOCs, render props, context patterns
- Angular: services, modules, observables
- Vue: composables, mixins, provide/inject
- NestJS: modules, controllers, pipes, guards

---

### 5. Error Handling

**Error Classes:**
- Search for `extends Error`, custom error classes
- Note naming: `*Error`, `*Exception`
- Track error properties: `code`, `status`, `message`

**Try/Catch Patterns:**
- Scan try/catch blocks
- Note: catch all vs specific, rethrow patterns, finally usage

**Error Responses (API):**
- Search for error response structures
- Note: envelope format, error codes, messages

**Logging:**
- Search for `console.*`, `logger.*`, logging frameworks
- Note: log levels used, what gets logged

---

### 6. Import Organization

**Import Order:**
- Analyze import statement groupings
- Common patterns: builtin → external → internal → relative
- Note: blank lines between groups

**Import Style:**
- Named imports: `import { x } from`
- Default imports: `import x from`
- Namespace imports: `import * as x from`
- Side effect imports: `import 'x'`

**Path Aliases:**
- Search for `@/`, `~/`, `@company/` patterns
- Check tsconfig/jsconfig for alias definitions

**Barrel Files:**
- Check for `index.ts` re-export patterns
- Note: what gets re-exported, depth of barrels

---

### 7. File Structure

**Section Ordering:**
- Analyze typical file structure:
  1. Imports
  2. Types/Interfaces
  3. Constants
  4. Utilities/Helpers
  5. Main exports (component, class, function)
  6. Export statements

**Class Member Ordering:**
- For classes, analyze member order:
  - Static properties/methods
  - Public properties
  - Private properties
  - Constructor
  - Public methods
  - Private methods

**Hook Ordering (React):**
- For React components, analyze hook order:
  - useState
  - useRef
  - useMemo/useCallback
  - useEffect
  - Custom hooks

---

### 8. Function Patterns

**Parameter Ordering:**
- Analyze function signatures
- Note: required first, optional last, options object patterns

**Return Patterns:**
- Early returns vs single exit point
- Return type consistency (explicit vs inferred)

**Async Patterns:**
- async/await vs .then() chains
- Error handling in async code
- Promise.all, Promise.race usage

**Function Length:**
- Calculate average and max function lengths
- Note: decomposition patterns for long functions

**Arrow vs Function:**
- Track `=>` vs `function` usage
- Note: when each is used

---

### 9. Type Annotations

**Annotation Style:**
- Explicit types: `const x: string = 'foo'`
- Inferred types: `const x = 'foo'`
- Track when explicit is used vs inferred

**Generic Naming:**
- Single letter: `T`, `U`, `K`, `V`
- Descriptive: `TData`, `TResponse`, `TConfig`

**Null Handling:**
- Optional: `x?: string`
- Nullable: `x: string | null`
- Non-null assertion: `x!`
- Optional chaining: `x?.y`
- Nullish coalescing: `x ?? default`

**Type Location:**
- Inline in files
- Separate `types.ts` files
- Central `types/` directory

---

### 10. Testing Style

**Test Naming:**
- Describe blocks: class name, function name, scenario
- It/test blocks: "should...", "when...then...", descriptive

**Test Structure:**
- AAA: Arrange, Act, Assert
- Given/When/Then
- Setup/Exercise/Verify

**Mocking Patterns:**
- Mock framework: jest.mock, vi.mock, sinon
- Mock style: manual, auto, spies
- Mock reset: beforeEach, afterEach

**Fixture/Factory Patterns:**
- Test data factories
- Fixture files
- Builder patterns for test objects

**Assertion Style:**
- expect().toBe() vs assert()
- Chaining: `.to.be.true` vs `.toBeTruthy()`

---

### 11. Documentation Conventions

**README Structure:**
- Sections present: Installation, Usage, API, Contributing, License
- Format: Markdown conventions

**API Documentation:**
- JSDoc, TSDoc, docstrings
- Generated docs: TypeDoc, Sphinx, etc.

**Inline Documentation:**
- When comments are required
- Level of detail

---

### 12. Anti-Patterns (Detect by Absence or Anomaly)

**Inconsistencies:**
- Files that deviate from dominant patterns
- Mixed naming conventions in same file
- Inconsistent error handling

**Code Smells:**
- `any` type usage (TypeScript)
- `console.log` in production code
- Deeply nested callbacks
- Magic numbers without constants
- Commented-out code

**Security Anti-Patterns:**
- Hardcoded secrets
- Unsafe type assertions
- Missing input validation

---

## EXTRACTION OUTPUT FORMAT

Store in state file `extraction_results`:

```json
{
  "naming_conventions": {
    "variables": {
      "dominant_pattern": "camelCase",
      "statistics": { "camelCase": 847, "snake_case": 42, "PascalCase": 10 },
      "percentage": 94.2,
      "boolean_prefixes": ["is", "has", "can"],
      "anomalies": [{ "file": "legacy/old.ts", "count": 12, "pattern": "snake_case" }]
    },
    "functions": { ... },
    "classes": { ... },
    "files": { ... },
    "constants": { ... },
    "types": { ... }
  },
  "code_formatting": {
    "indentation": { "dominant": "2 spaces", "percentage": 99.1 },
    "bracket_style": { "dominant": "K&R", "percentage": 97.3 },
    ...
  },
  ...
}
```

---

## PROGRESS REPORTING

After each directory batch, show:
"**Progress:** Analyzed {{completed}}/{{total}} directories

**Patterns emerging:**
- Variables: {{dominant_pattern}} ({{percentage}}%)
- Functions: {{dominant_pattern}} ({{percentage}}%)
- Files: {{dominant_pattern}} ({{percentage}}%)

Continue extraction?"

**HALT only if user wants to pause. Otherwise continue automatically.**

---

## EXTRACTION COMPLETION

When all directories are analyzed, present summary:

"**Extraction Complete**

**Files Analyzed:** {{file_count}}
**Patterns Identified:** {{pattern_count}} across 12 categories

**High Confidence Patterns (>90%):**
{{list_of_very_consistent_patterns}}

**Moderate Confidence Patterns (70-90%):**
{{list_of_moderately_consistent_patterns}}

**Low Confidence / Inconsistent (<70%):**
{{list_of_inconsistent_areas}}

**Notable Anomalies:**
{{list_of_significant_deviations}}

Ready to review and refine these patterns?"

**HALT AND WAIT for user confirmation before proceeding.**

---

## STATE FILE UPDATE

Update `code-style-analysis-state.json`:
```json
{
  "current_step": "step-02",
  "extraction_complete": true,
  "extraction_results": { ... },
  "statistics": {
    "files_analyzed": 423,
    "patterns_identified": 47,
    "high_confidence": 31,
    "moderate_confidence": 12,
    "low_confidence": 4
  }
}
```

---

## SUCCESS METRICS:

- All configured directories scanned
- All 12 categories have extraction data
- Dominant patterns identified with percentages
- Anomalies flagged for user review
- State file updated for resumability
- Summary presented to user

## FAILURE MODES:

- Skipping directories without logging
- Not calculating percentages for patterns
- Missing categories in extraction
- Context overflow (not batching properly)
- Not saving state between batches
- Proceeding without user confirmation at end

---

## NEXT STEP:

Load `./step-03-refine.md` ONLY after user confirms extraction results and is ready to refine patterns.
