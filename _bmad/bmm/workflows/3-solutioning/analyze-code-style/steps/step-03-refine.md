# Step 3: Collaborative Pattern Refinement

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER skip a category without user acknowledgment
- ALWAYS present A/P/C menu after each category
- YOU ARE A FACILITATOR presenting findings for validation
- FOCUS on getting user confirmation of patterns
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

---

## STEP GOAL:

Present extracted patterns to user for validation and refinement:
1. Present each category with statistics and findings
2. Flag anomalies and inconsistencies
3. Get user confirmation or modifications
4. Use A/P/C menu for deeper exploration if needed
5. Write confirmed patterns to code-style-guide.md

---

## EXECUTION PROTOCOLS:

- Present ONE category at a time
- Show statistics with percentages
- Highlight anomalies (deviations from dominant pattern)
- Offer A/P/C menu for refinement
- ONLY proceed to next category when user selects 'C'
- Write to document after each confirmed category

---

## COLLABORATION MENUS (A/P/C):

After presenting each category:

- **A (Advanced Elicitation)**: Use discovery protocols to explore edge cases and nuances
- **P (Party Mode)**: Get multiple agent perspectives on controversial patterns
- **C (Continue)**: Accept patterns and proceed to next category

---

## PROTOCOL INTEGRATION:

- When 'A' selected: Execute `{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml`
- When 'P' selected: Execute `{project-root}/_bmad/core/workflows/party-mode/workflow.md`
- PROTOCOLS always return to display this step's A/P/C menu after completion
- User accepts/rejects protocol changes before proceeding

---

## CATEGORY REFINEMENT SEQUENCE

Process categories in this order:

1. Naming Conventions
2. Code Formatting
3. Comment Style
4. Design Patterns
5. Error Handling
6. Import Organization
7. File Structure
8. Function Patterns
9. Type Annotations
10. Testing Style
11. Documentation Conventions
12. Anti-Patterns

---

## CATEGORY PRESENTATION FORMAT

For each category, present:

```markdown
## Category: {{category_name}}

### Extracted Patterns

**{{sub_category_1}}:**
- Dominant pattern: {{pattern}} ({{percentage}}% of {{count}} instances)
- Alternative patterns found: {{alternatives_with_counts}}

**{{sub_category_2}}:**
- Dominant pattern: {{pattern}} ({{percentage}}% of {{count}} instances)
- Alternative patterns found: {{alternatives_with_counts}}

[... repeat for all sub-categories ...]

### Anomalies Detected

{{if anomalies}}
**Files with non-standard patterns:**
- {{file_path}}: {{pattern}} ({{count}} instances) - likely {{reason: legacy, third-party, inconsistency}}

**Recommendation:** {{include_in_guide | exclude_as_legacy | flag_for_cleanup}}
{{else}}
No significant anomalies detected. Patterns are consistent.
{{endif}}

### Proposed Documentation

I'll document these patterns as:

```markdown
## {{Category Name}}

### {{Sub-category}}

**Pattern**: {{description}}

**Details:**
- {{specific_rule_1}}
- {{specific_rule_2}}
```

---

**What would you like to do?**
[A] Advanced Elicitation - Explore nuances and edge cases
[P] Party Mode - Get multiple perspectives on these patterns
[C] Continue - Accept and save, move to next category
```

**HALT AND WAIT for user selection.**

---

## CATEGORY-SPECIFIC PRESENTATION

### 1. Naming Conventions

Present:
```
## Category: Naming Conventions

### Variables
- Dominant: {{pattern}} ({{%}} of {{count}})
- Boolean prefixes found: {{list}}
- Anomalies: {{count}} files using non-standard patterns

### Functions/Methods
- Dominant: {{pattern}} ({{%}} of {{count}})
- Verb patterns: {{common_verbs}}
- Async naming: {{pattern}}

### Classes/Components
- Dominant: {{pattern}} ({{%}} of {{count}})
- Common suffixes: {{suffixes}}

### Files
- Dominant: {{pattern}} ({{%}} of {{count}})
- Test files: {{test_pattern}}
- Index files: {{barrel_pattern}}

### Constants
- Dominant: {{pattern}} ({{%}} of {{count}})
- Grouping: {{enum_vs_object_vs_flat}}

### Types/Interfaces (if applicable)
- Dominant: {{pattern}} ({{%}} of {{count}})
- Prefix convention: {{I_prefix_or_none}}
- Suffix patterns: {{suffixes}}

[A/P/C menu]
```

### 2. Code Formatting

Present:
```
## Category: Code Formatting

### Indentation
- Dominant: {{spaces_or_tabs}} ({{%}} consistency)
- Configured in: {{eslint_prettier_editorconfig}}

### Line Length
- Typical max: {{length}} characters
- Configured limit: {{configured_limit}}

### Bracket Style
- Dominant: {{K&R_or_Allman}} ({{%}} of {{count}})

### Semicolons (JS/TS)
- Usage: {{always_never_mixed}} ({{%}})

### Quotes
- Dominant: {{single_double}} ({{%}})

### Trailing Commas
- Usage: {{always_multiline_never}} ({{%}})

[A/P/C menu]
```

### 3. Comment Style

Present:
```
## Category: Comment Style

### Documentation Format
- Primary: {{JSDoc_docstring_inline}} ({{%}})
- Coverage: {{percentage}} of public APIs documented

### Inline Comments
- Frequency: {{high_moderate_minimal}}
- Style: {{format}}

### TODO/FIXME
- Format: {{pattern}}
- Count found: {{count}}

[A/P/C menu]
```

### 4. Design Patterns

Present:
```
## Category: Design Patterns

### Identified Patterns

{{for each pattern found}}
**{{Pattern Name}}**
- Usage: {{where_used}}
- Implementation: {{how_implemented}}
- Files: {{example_files}}
{{endfor}}

### Framework-Specific Patterns
{{framework_specific_findings}}

### Pattern Recommendations
Based on codebase analysis:
- Document: {{patterns_to_document}}
- Note as optional: {{occasionally_used_patterns}}

[A/P/C menu]
```

### 5. Error Handling

Present:
```
## Category: Error Handling

### Custom Error Classes
- Found: {{count}} custom error classes
- Naming: {{pattern}}
- Properties: {{common_properties}}

### Try/Catch Usage
- Pattern: {{catch_all_vs_specific}}
- Rethrow: {{yes_no}}
- Finally: {{usage}}

### Error Responses (API)
- Format: {{envelope_structure}}
- Error codes: {{pattern}}

### Logging
- Framework: {{logger_used}}
- Levels: {{levels_used}}
- What's logged: {{patterns}}

[A/P/C menu]
```

### 6. Import Organization

Present:
```
## Category: Import Organization

### Import Order
- Groups: {{group_order}}
- Blank lines between groups: {{yes_no}}

### Import Style
- Named: {{percentage}}%
- Default: {{percentage}}%
- Namespace: {{percentage}}%

### Path Aliases
- Used: {{yes_no}}
- Patterns: {{alias_list}}

### Barrel Files
- Usage: {{percentage}} of directories
- Pattern: {{what_gets_exported}}

[A/P/C menu]
```

### 7. File Structure

Present:
```
## Category: File Structure

### Section Ordering
- Typical order: {{section_list}}
- Consistency: {{percentage}}%

### Class Member Ordering (if applicable)
- Order: {{member_order}}
- Consistency: {{percentage}}%

### Component Structure (React/Vue)
- Hook order: {{hook_order}}
- Section order: {{section_order}}

[A/P/C menu]
```

### 8. Function Patterns

Present:
```
## Category: Function Patterns

### Parameter Patterns
- Options objects: {{usage}}
- Required/optional ordering: {{pattern}}

### Return Patterns
- Early returns: {{usage}}
- Explicit return types: {{percentage}}%

### Async Patterns
- async/await: {{percentage}}%
- Promise chains: {{percentage}}%
- Error handling: {{pattern}}

### Function Length
- Average: {{lines}} lines
- Max: {{lines}} lines
- Long function pattern: {{decomposition_approach}}

### Arrow vs Function
- Arrow functions: {{percentage}}%
- Function declarations: {{percentage}}%
- Usage pattern: {{when_each_is_used}}

[A/P/C menu]
```

### 9. Type Annotations

Present:
```
## Category: Type Annotations

### Annotation Style
- Explicit: {{percentage}}%
- Inferred: {{percentage}}%
- Pattern: {{when_explicit_used}}

### Generic Naming
- Style: {{single_letter_vs_descriptive}}
- Common names: {{T_TData_etc}}

### Null Handling
- Optional properties: {{pattern}}
- Nullable types: {{pattern}}
- Assertions: {{usage}}

### Type Location
- Inline: {{percentage}}%
- Separate files: {{percentage}}%
- Pattern: {{where_types_live}}

[A/P/C menu]
```

### 10. Testing Style

Present:
```
## Category: Testing Style

### Test Naming
- Describe blocks: {{pattern}}
- It/test blocks: {{pattern}}

### Test Structure
- Style: {{AAA_BDD_other}}
- Setup/teardown: {{pattern}}

### Mocking
- Framework: {{jest_vitest_sinon}}
- Style: {{pattern}}
- Reset: {{when}}

### Test Data
- Pattern: {{factories_fixtures_inline}}
- Location: {{where}}

### Assertions
- Style: {{expect_assert}}
- Matchers: {{common_matchers}}

[A/P/C menu]
```

### 11. Documentation Conventions

Present:
```
## Category: Documentation Conventions

### README
- Sections: {{sections_found}}
- Style: {{format}}

### API Documentation
- Tool: {{jsdoc_typedoc_none}}
- Coverage: {{percentage}}%

### Inline Documentation
- When required: {{pattern}}
- Verbosity: {{level}}

[A/P/C menu]
```

### 12. Anti-Patterns

Present:
```
## Category: Anti-Patterns to Avoid

### Detected Issues

{{for each anti_pattern}}
**{{Anti-pattern name}}**
- Found: {{count}} instances
- Files: {{file_list}}
- Severity: {{high_medium_low}}
- Recommendation: {{fix_or_document}}
{{endfor}}

### Code Smells
{{list_of_code_smells_found}}

### Inconsistencies
{{list_of_inconsistencies}}

### Proposed "Never Do" List
Based on analysis, these should be documented as anti-patterns:
{{proposed_anti_patterns}}

[A/P/C menu]
```

---

## MENU HANDLING

### If 'A' (Advanced Elicitation):

1. Execute `{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml`
2. Pass current category data as context
3. Process enhanced findings that come back
4. Present: "Accept these refinements to {{category}}? (y/n)"
5. If yes: Update category data
6. Return to A/P/C menu for same category

### If 'P' (Party Mode):

1. Execute `{project-root}/_bmad/core/workflows/party-mode/workflow.md`
2. Pass current category data for multi-perspective review
3. Process collaborative insights
4. Present: "Accept these changes to {{category}}? (y/n)"
5. If yes: Update category data
6. Return to A/P/C menu for same category

### If 'C' (Continue):

1. Write confirmed patterns to `{output_folder}/code-style-guide.md`
2. Update section for current category with confirmed patterns
3. Update frontmatter: add category to `stepsCompleted`
4. Update state file: add category to `categories_completed`
5. If more categories remain: Present next category
6. If all categories complete: Proceed to Step 4

---

## DOCUMENT UPDATE FORMAT

When writing to code-style-guide.md, use this format:

```markdown
## {{Category Name}}

### {{Sub-category}}

**Pattern**: {{one_sentence_description}}

{{additional_details_if_needed}}

**Statistics**: {{percentage}}% consistency across {{count}} instances

{{if has_sub_patterns}}
**Specific rules:**
- {{rule_1}}
- {{rule_2}}
{{endif}}
```

---

## REFINEMENT COMPLETION

When all 12 categories are confirmed:

"**Pattern Refinement Complete**

All 12 categories have been reviewed and confirmed:
{{list_of_categories_with_pattern_counts}}

**Total Patterns Documented:** {{count}}
**Ready for Example Extraction**

The next step will extract DO/DON'T code examples from your codebase for each pattern.

Ready to proceed to example extraction?"

**HALT AND WAIT for user confirmation.**

---

## STATE FILE UPDATE

After each category:
```json
{
  "current_step": "step-03",
  "categories_completed": ["naming_conventions", "code_formatting", ...],
  "refined_patterns": {
    "naming_conventions": { ... },
    ...
  }
}
```

---

## SUCCESS METRICS:

- All 12 categories presented with statistics
- User explicitly confirmed each category via 'C'
- Anomalies flagged and addressed
- A/P/C protocols properly invoked when selected
- Document updated after each category
- State file tracks progress

## FAILURE MODES:

- Skipping categories without user acknowledgment
- Not presenting A/P/C menu
- Proceeding without 'C' selection
- Not writing to document after confirmation
- Not handling A/P protocol returns correctly
- Losing refinements between categories

---

## NEXT STEP:

Load `./step-04-examples.md` ONLY after all 12 categories are confirmed and user is ready for example extraction.
