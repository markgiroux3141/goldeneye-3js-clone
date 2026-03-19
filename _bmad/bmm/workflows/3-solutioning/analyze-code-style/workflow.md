---
name: analyze-code-style
description: Analyzes codebase to extract coding patterns, conventions, and style with DO/DON'T examples. Produces code-style-guide.md that enables AI agents to write code indistinguishable from existing code.
---

# Analyze Code Style Workflow

**Goal:** Create a comprehensive `code-style-guide.md` file containing exact coding patterns, conventions, and style with DO/DON'T examples. This enables AI agents to produce code that is indistinguishable from existing code in the project.

**Your Role:** You are a code style analyst working with a peer to extract and document the exact patterns used in their codebase. Focus on capturing HOW code is written, not just WHAT rules to follow.

---

## WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Document state tracked in frontmatter
- Statistical analysis to identify dominant patterns
- DO/DON'T examples extracted from actual codebase
- You NEVER proceed to a step file if the current step file indicates the user must approve and indicate continuation.

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:

- `project_name`, `output_folder`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `date` as system-generated current datetime
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

### Paths

- `installed_path` = `{project-root}/_bmad/bmm/workflows/3-solutioning/analyze-code-style`
- `template_path` = `{installed_path}/code-style-guide-template.md`
- `output_file` = `{output_folder}/code-style-guide.md`
- `state_file` = `{output_folder}/code-style-analysis-state.json`

---

## KEY DIFFERENTIATORS

This workflow differs from `generate-project-context` in that it:

1. **Extracts actual code examples** - DO/DON'T pairs from the real codebase
2. **Uses statistical analysis** - Identifies dominant patterns (>70% threshold)
3. **Focuses on HOW, not WHAT** - Captures implementation details, not rules
4. **Includes anti-patterns** - Documents what NOT to do with examples
5. **Covers 12 style categories** with concrete examples for each

---

## 12 STYLE CATEGORIES

1. **Naming Conventions** - variables, functions, classes, files, constants, types
2. **Code Formatting** - indentation, line length, brackets, semicolons, quotes
3. **Comment Style** - when, where, format (JSDoc/docstring), TODO patterns
4. **Design Patterns** - factory, repository, observer, framework-specific patterns
5. **Error Handling** - custom errors, try/catch patterns, logging, recovery
6. **Import Organization** - order, grouping, path aliases, barrel files
7. **File Structure** - section ordering within files, member ordering
8. **Function Patterns** - parameter order, return patterns, async conventions
9. **Type Annotations** - explicit vs inferred, generics, null handling
10. **Testing Style** - naming, structure (AAA), mocking, fixtures
11. **Documentation** - README structure, API docs, inline docs
12. **Anti-Patterns** - explicit list of what NOT to do with examples

---

## EXECUTION

Load and execute `steps/step-01-discover.md` to begin the workflow.

**Note:** Codebase discovery, language detection, and scan depth configuration are handled in step-01-discover.md.
