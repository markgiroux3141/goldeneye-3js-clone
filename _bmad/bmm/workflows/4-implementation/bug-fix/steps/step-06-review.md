---
name: 'step-06-review'
description: 'Adversarial review of the bug fix to catch issues before completion'

nextStepFile: './step-07-complete.md'
---

# Step 6: Adversarial Review

**Goal:** Critically review the fix to catch issues the implementation may have missed.

---

## AVAILABLE STATE

From prior steps: `{bug_id}`, `{severity}`, `{root_cause}`, `{fix_approach}`, `{fix_plan}`, `{baseline_commit}`, `{files_modified}`, `{tests_added}`, `{fix_verified}`

## STATE VARIABLES (set in this step)

- `{review_findings}` - List of findings with severity and resolution status

---

## EXECUTION SEQUENCE

### 1. Construct Diff

**If `{baseline_commit}` is NOT "NO_GIT":**
- Run `git diff {baseline_commit}` to see all changes
- Run `git diff {baseline_commit} --stat` for a summary
- Check for any new untracked files created during the workflow

**If `{baseline_commit}` is "NO_GIT":**
- Use `{files_modified}` and `{tests_added}` to read the changed files
- Review changes based on knowledge of what was modified

### 2. Adversarial Review

Review the diff with an adversarial mindset. For each changed file, evaluate:

**Bug-Fix Specific Checks:**
- Does the fix address the **root cause** (`{root_cause}`), not just the symptom?
- Is the fix **minimal** and within the scope defined in step-03?
- Do the regression tests actually test the **reported bug scenario**?
- Is the same bug pattern present **elsewhere** in the codebase that wasn't addressed? (note for follow-up, not scope creep)

**Code Quality Checks:**
- Are there any introduced security vulnerabilities?
- Are there any performance regressions?
- Is error handling appropriate?
- Are edge cases covered?

**Test Quality Checks:**
- Do the tests assert the right things (not just "no error thrown")?
- Would the tests catch a regression if someone reverted part of the fix?
- Are test names descriptive of what they verify?

### 3. Classify Findings

For each finding, assign:

- **Number:** Sequential ID
- **Severity:** HIGH (must fix) | MEDIUM (should fix) | LOW (nice to have)
- **Classification:** "real" (actual issue) | "noise" (false positive or style preference) | "undecided"
- **Description:** What the issue is and where

### 4. Present Findings

```
**Adversarial Review for {bug_id}:**

Found {count} findings:

{#} [{severity}] [{classification}] {description}
  File: {file:line}
  Suggestion: {what to do}

...
```

If zero findings: Still present the review summary. Zero findings is unusual and worth noting.

### 5. Resolution Options

```
How would you like to handle these findings?

**[1] Walk through** - Discuss each finding individually
**[2] Auto-fix** - Fix all findings classified as "real"
**[3] Skip** - Acknowledge findings and proceed to completion
```

#### IF [1] Walk through:
For each finding, present it and ask:
- "Fix this? (y/n/discuss)"
- If y: apply the fix
- If n: mark as skipped with reason
- If discuss: explain the finding in detail, then re-ask

#### IF [2] Auto-fix:
- Fix all findings classified as "real" (HIGH and MEDIUM severity)
- Skip findings classified as "noise"
- Ask about "undecided" findings individually
- Run tests after fixes to confirm nothing broke

#### IF [3] Skip:
- Acknowledge all findings
- Record them in `{review_findings}` with status "skipped"
- Proceed to completion

### 6. Record Results

Store `{review_findings}` with resolution status for each:
- "fixed" - issue was addressed
- "skipped" - acknowledged but not fixed (with reason)
- "noise" - classified as false positive

---

## NEXT STEP DIRECTIVE

**CRITICAL:** After resolution is complete: "**NEXT:** Loading `step-07-complete.md`"

Load `{nextStepFile}` after findings are resolved.

---

## SUCCESS METRICS

- Diff constructed accurately from baseline
- Adversarial review performed with bug-specific focus
- Findings classified by severity
- Resolution approach executed
- All "real" findings addressed (fixed or explicitly skipped with reason)
- If auto-fix chosen, tests still pass after fixes

## FAILURE MODES

- Missing baseline commit for diff construction
- Not including bug-specific review focus (just generic code review)
- Accepting zero findings without noting it's unusual
- Auto-fixing "noise" findings
- Not running tests after auto-fix
