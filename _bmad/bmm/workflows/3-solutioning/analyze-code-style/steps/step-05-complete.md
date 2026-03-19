# Step 5: Synthesis & Completion

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER finalize without user confirmation
- ALWAYS run validation checklist before completion
- YOU ARE A QUALITY ASSURER ensuring document completeness
- FOCUS on LLM optimization and usability
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

---

## STEP GOAL:

Finalize the code-style-guide.md and integrate with project-context:
1. Generate Quick Reference table
2. Optimize content for LLM consumption
3. Run validation checklist
4. Update frontmatter with final stats
5. **Update or create project-context.md to reference the style guide**
6. Present completion summary
7. Clean up state file

---

## EXECUTION PROTOCOLS:

- Review entire document for completeness
- Optimize for scannability and LLM context efficiency
- Remove placeholder text ("_Documented after..._")
- Validate against checklist
- Get user sign-off before marking complete

---

## Sequence of Instructions (Do not deviate, skip, or optimize)

### 1. Generate Quick Reference Table

Read all documented patterns and create summary table:

```markdown
## Quick Reference

| Category | Pattern | Example |
|----------|---------|---------|
| Variables | camelCase | `userData`, `isLoading` |
| Functions | camelCase + verb | `getUser()`, `handleClick()` |
| Components | PascalCase | `UserProfile`, `AuthModal` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES`, `API_URL` |
| Files | kebab-case | `user-service.ts` |
| Indentation | 2 spaces | - |
| Brackets | K&R style | `if (x) {` |
| Imports | grouped, ordered | builtin → external → internal |
| Errors | AppError base | `throw new UserNotFoundError()` |
| Tests | describe/it + AAA | `it('should...')` |
```

Update the Quick Reference section in the document.

---

### 2. Content Optimization

Review and optimize each section for LLM consumption:

**Remove:**
- Redundant information
- Obvious patterns (LLMs already know these)
- Placeholder text ("_Documented after..._")
- Statistics that don't add value

**Ensure:**
- Each pattern is actionable
- Examples are clear and concise
- Anti-patterns are explicit
- Document is scannable (clear headers, bullet points)

**Combine:**
- Related rules into concise bullet points
- Similar examples where appropriate

---

### 3. Run Validation Checklist

Load and execute `{installed_path}/checklist.md`:

For each checklist item, verify and report:

```
## Validation Results

### Document Structure
- [x] Frontmatter complete
- [x] Quick Reference populated
- [x] Technology Context documented
- [x] All 12 categories have content
- [x] Usage Guidelines present
- [ ] Status set to 'complete' (pending)

### Category Completeness
{{for each category}}
- [x] {{category}}: {{pattern_count}} patterns, {{example_count}} examples
{{endfor}}

### Example Quality
- [x] All DO examples from real codebase
- [x] All DON'T examples annotated
- [x] Examples 5-15 lines
- [x] Sources documented

### LLM Optimization
- [x] No redundant information
- [x] Patterns are actionable
- [x] Document scannable
- [x] Under 2000 lines

### Issues Found
{{if issues}}
{{list_of_issues}}
{{else}}
No issues found.
{{endif}}
```

**If issues found:**
Present: "I found {{count}} issues during validation. Would you like to:
[F] Fix - Address the issues before completing
[A] Accept - Complete anyway with known issues
[R] Review - Show me the issues in detail"

**HALT AND WAIT if issues found.**

---

### 4. Update Frontmatter

Update frontmatter with final statistics:

```yaml
---
project_name: '{{project_name}}'
user_name: '{{user_name}}'
date: '{{date}}'
stepsCompleted: ['discovery', 'extraction', 'refinement', 'examples', 'synthesis']
inputDocuments: [{{documents_used}}]
languages: [{{detected_languages}}]
frameworks: [{{detected_frameworks}}]
pattern_count: {{total_patterns}}
example_count: {{total_examples}}
status: 'complete'
optimized_for_llm: true
---
```

---

### 5. Update or Create project-context.md

**CRITICAL:** This step ensures all agents automatically pick up the code style guide.

#### Check for Existing project-context.md

Search for `{output_folder}/project-context.md`:

**If project-context.md EXISTS:**

1. Read the existing file
2. Check if it already has a `## Code Style Reference` section
3. If section exists: Update it with current style guide reference
4. If section doesn't exist: Append the Code Style Reference section before the final `---` or at the end

**Append/Update this section:**

```markdown

---

## Code Style Reference

**IMPORTANT:** Before writing any code, load and follow the patterns in:
`code-style-guide.md`

This guide contains:
- Naming conventions with DO/DON'T examples
- Code formatting standards
- Design patterns used in this project
- Error handling patterns
- Import organization rules
- Testing conventions
- Anti-patterns to avoid

**Key Rules (Summary):**
{{top_5_most_important_rules_from_style_guide}}

_Generated by analyze-code-style workflow on {{date}}_
```

**If project-context.md DOES NOT EXIST:**

Create a new `{output_folder}/project-context.md` with:

```markdown
---
project_name: '{{project_name}}'
user_name: '{{user_name}}'
date: '{{date}}'
stepsCompleted: ['code_style_integration']
status: 'partial'
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project._

---

## Code Style Reference

**IMPORTANT:** Before writing any code, load and follow the patterns in:
`code-style-guide.md`

This guide contains:
- Naming conventions with DO/DON'T examples
- Code formatting standards
- Design patterns used in this project
- Error handling patterns
- Import organization rules
- Testing conventions
- Anti-patterns to avoid

**Key Rules (Summary):**
{{top_5_most_important_rules_from_style_guide}}

---

## Technology Stack & Versions

{{technology_stack_from_style_guide}}

---

## Additional Context

_Run the `generate-project-context` workflow to populate additional rules and patterns._

---

_Generated by analyze-code-style workflow on {{date}}_
```

#### Extract Top 5 Key Rules

From the code-style-guide.md, identify the 5 most critical rules to include inline:

1. **Most impactful naming convention** (e.g., "Variables: camelCase, booleans must have is/has/can prefix")
2. **Primary design pattern** (e.g., "All database access through Repository classes")
3. **Critical error handling rule** (e.g., "Custom errors must extend AppError with error code")
4. **Import organization rule** (e.g., "Import order: builtin → external → internal → relative")
5. **Top anti-pattern** (e.g., "NEVER use 'any' type - use proper typing or 'unknown'")

These inline rules give agents immediate guidance while the full guide provides examples.

#### Confirm Integration

Present to user:
"I've {{created/updated}} `project-context.md` to reference the code style guide.

**Changes made:**
- {{description_of_changes}}

**Agents will now automatically:**
1. Load project-context.md (standard behavior)
2. See the Code Style Reference section
3. Load code-style-guide.md for detailed patterns
4. Follow the key rules summary for quick reference

Does this look correct?"

**HALT AND WAIT for user confirmation.**

---

### 6. Present Completion Summary

"**Code Style Guide Complete!**

**Output File:** `{{output_folder}}/code-style-guide.md`

**Statistics:**
- Categories documented: 12/12
- Total patterns: {{pattern_count}}
- Total examples: {{example_count}} ({{do_count}} DO, {{dont_count}} DON'T)
- Document size: {{line_count}} lines

**Coverage by Category:**
| Category | Patterns | Examples |
|----------|----------|----------|
{{for each category}}
| {{name}} | {{patterns}} | {{examples}} |
{{endfor}}

**Validation:** {{PASS/PASS_WITH_ISSUES}}

---

## Next Steps

### 1. Integration Complete

The `project-context.md` has been automatically updated to reference the code style guide.
All agents that load project-context.md will now see the style guide reference.

### 2. How Agents Will Use This

When any agent (dev-story, code-review, etc.) loads context:
1. They load `project-context.md` (standard behavior)
2. They see the **Code Style Reference** section pointing to the style guide
3. They load `code-style-guide.md` for detailed patterns and examples
4. They follow the inline key rules for quick decisions

### 3. Keep the Guide Updated

- Review quarterly for accuracy
- Add new patterns when discovered
- Update after major refactors
- Re-run this workflow after significant codebase changes

### 4. Optional: Run generate-project-context

If you haven't already, run the `generate-project-context` workflow to add:
- Framework-specific rules
- API and data layer patterns
- Build and deployment rules
- Additional context the style guide doesn't cover

---

**Workflow Complete!**"

---

### 7. Clean Up State File

Archive or remove state file:

Option 1 (Archive):
- Rename to `code-style-analysis-state-{{date}}.json.complete`
- Move to archive folder

Option 2 (Remove):
- Delete state file since workflow is complete

Ask user: "Would you like to:
[A] Archive the state file (for audit trail)
[R] Remove the state file (clean up)
[K] Keep as-is"

---

## INTEGRATION GUIDANCE

### With generate-project-context

The `code-style-guide.md` complements `project-context.md`:

| project-context.md | code-style-guide.md |
|-------------------|---------------------|
| WHAT rules to follow | HOW to write code |
| Technology constraints | Style conventions |
| Framework patterns | Code examples |
| Build/deploy rules | DO/DON'T pairs |

**Recommendation:** Reference code-style-guide from project-context, don't duplicate.

### With dev-story workflow

When implementing stories, agents should:
1. Load `project-context.md` for rules
2. Load `code-style-guide.md` for implementation patterns
3. Match code style to examples in the guide
4. Validate against anti-patterns before committing

### With code-review workflow

Reviewers can use the style guide to:
- Check naming convention compliance
- Validate pattern usage
- Identify anti-pattern violations
- Ensure consistent formatting

---

## SUCCESS METRICS:

- Quick Reference table generated and accurate
- Content optimized for LLM consumption
- Validation checklist passed (or issues acknowledged)
- Frontmatter updated with final stats
- Status set to 'complete'
- **project-context.md updated or created with Code Style Reference section**
- **Top 5 key rules extracted and included inline**
- User received completion summary
- State file handled

## FAILURE MODES:

- Placeholder text remaining in document
- Quick Reference table missing or inaccurate
- Validation not run
- Frontmatter stats inaccurate
- Status not set to 'complete'
- **Not updating/creating project-context.md**
- **Not including inline key rules in project-context.md**
- State file left in incomplete state

---

## WORKFLOW COMPLETE

This workflow has finished. The code-style-guide.md is ready for use.

**Output:** `{{output_folder}}/code-style-guide.md`
