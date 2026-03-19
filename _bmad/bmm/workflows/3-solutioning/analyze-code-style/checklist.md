# Code Style Guide Validation Checklist

Use this checklist to validate the completeness and quality of the generated code-style-guide.md.

---

## Document Structure

- [ ] Frontmatter includes all required fields (project_name, date, status, pattern_count, example_count)
- [ ] Quick Reference table is populated with key patterns
- [ ] Technology Context section documents languages and frameworks
- [ ] All 12 style categories have content
- [ ] Usage Guidelines section is complete
- [ ] Status is set to 'complete' in frontmatter

---

## Category Completeness

### Naming Conventions
- [ ] Variable naming pattern documented with examples
- [ ] Function/method naming pattern documented with examples
- [ ] Class/component naming pattern documented with examples
- [ ] File naming pattern documented with examples
- [ ] Constant naming pattern documented with examples
- [ ] Type/interface naming pattern documented with examples (if applicable)
- [ ] At least one DO/DON'T pair provided

### Code Formatting
- [ ] Indentation style documented (spaces/tabs, count)
- [ ] Line length preference documented
- [ ] Bracket style documented (K&R, Allman, etc.)
- [ ] Semicolon usage documented (if applicable)
- [ ] Quote style documented (if applicable)
- [ ] At least one DO/DON'T pair provided

### Comment Style
- [ ] When to comment documented
- [ ] Comment format documented (JSDoc, docstring, inline)
- [ ] TODO/FIXME patterns documented
- [ ] At least one DO/DON'T pair provided

### Design Patterns
- [ ] At least 2 design patterns documented (or noted as N/A)
- [ ] Each pattern has usage context
- [ ] At least one DO/DON'T pair provided (or noted as N/A)

### Error Handling
- [ ] Error class/type patterns documented
- [ ] Try/catch patterns documented
- [ ] Logging patterns documented
- [ ] At least one DO/DON'T pair provided

### Import Organization
- [ ] Import order documented
- [ ] Import grouping documented
- [ ] Path aliases documented (if applicable)
- [ ] Barrel file usage documented (if applicable)
- [ ] At least one DO/DON'T pair provided

### File Structure
- [ ] Section ordering within files documented
- [ ] Class member ordering documented (if applicable)
- [ ] At least one DO/DON'T pair provided

### Function Patterns
- [ ] Parameter ordering patterns documented
- [ ] Return patterns documented
- [ ] Async/await patterns documented
- [ ] At least one DO/DON'T pair provided

### Type Annotations
- [ ] Type annotation style documented (explicit vs inferred)
- [ ] Generic naming conventions documented (if applicable)
- [ ] Null/undefined handling documented
- [ ] At least one DO/DON'T pair provided (or noted as N/A for untyped languages)

### Testing Style
- [ ] Test naming patterns documented
- [ ] Test structure documented (AAA, BDD, etc.)
- [ ] Mocking patterns documented
- [ ] At least one DO/DON'T pair provided

### Documentation Conventions
- [ ] Documentation requirements documented
- [ ] At least one DO/DON'T pair provided

### Anti-Patterns
- [ ] At least 3 anti-patterns documented
- [ ] Each anti-pattern has explanation of WHY it's wrong
- [ ] Each anti-pattern has example of what NOT to do

---

## Example Quality

- [ ] All DO examples are extracted from actual codebase (not synthesized)
- [ ] All DON'T examples clearly show what's wrong
- [ ] Each DON'T example has inline comment explaining the issue
- [ ] Examples are concise (5-15 lines max)
- [ ] Examples are representative (not edge cases)
- [ ] Code in examples compiles/runs (no syntax errors)

---

## LLM Optimization

- [ ] No redundant or obvious information
- [ ] Patterns are specific and actionable
- [ ] Quick Reference table enables fast lookup
- [ ] Document is scannable with clear headers
- [ ] Total document length is reasonable (under 2000 lines)
- [ ] No placeholder text remains (e.g., "Documented after...")

---

## Integration Readiness

- [ ] Document can be loaded by dev-story workflow
- [ ] Patterns are clear enough for automated enforcement
- [ ] Anti-patterns are specific enough to detect violations
- [ ] Document is self-contained (no external dependencies)

---

## Final Validation

- [ ] User has reviewed and approved all categories
- [ ] Pattern statistics are documented (e.g., "94% compliance")
- [ ] Anomalies have been addressed or acknowledged
- [ ] Frontmatter `status` is 'complete'
- [ ] Frontmatter `pattern_count` and `example_count` are accurate

---

## Validation Result

**Status:** [ ] PASS / [ ] FAIL

**Issues Found:**
1.
2.
3.

**Recommended Actions:**
1.
2.
3.
