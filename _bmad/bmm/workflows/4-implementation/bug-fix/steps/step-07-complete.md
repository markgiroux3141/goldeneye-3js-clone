---
name: 'step-07-complete'
description: 'Finalize the bug fix, update sprint tracking if applicable, and provide summary'

sprintStatusFile: '{implementation_artifacts}/sprint-status.yaml'
---

# Step 7: Complete

**Goal:** Finalize the bug fix, update tracking if applicable, and provide a clear summary with next steps.

---

## AVAILABLE STATE

From prior steps: `{bug_id}`, `{bug_description}`, `{severity}`, `{root_cause}`, `{fix_approach}`, `{fix_plan}`, `{files_modified}`, `{tests_added}`, `{fix_verified}`, `{review_findings}`, `{related_story_key}`, `{baseline_commit}`

---

## EXECUTION SEQUENCE

### 1. Sprint Status Integration (conditional)

Check if `{sprintStatusFile}` exists:

**If exists AND `{related_story_key}` is set:**
- Load the sprint status file
- Find the related story entry
- Note the bug fix in the story's context (add to change log or notes if the story format supports it)
- Do NOT change story status — the story has its own lifecycle via dev-story/code-review
- Preserve ALL comments and status definitions in the YAML file

**If exists but no related story:**
- Note this as an out-of-sprint bug fix (informational only, no changes to sprint status)

**If not exists:**
- Skip sprint integration entirely

### 2. Generate Summary

Present the complete bug fix summary:

```
**Bug Fix Complete!**

**Bug ID:** {bug_id}
**Severity:** {severity}
**Root Cause:** {root_cause}
**Fix Approach:** {fix_approach}

**Files Modified:**
{for each file in files_modified: - {file}}

**Tests Added:**
{for each test in tests_added: - {test}}

**Verification:** {PASS}
**Review Findings:** {count fixed} addressed, {count skipped} skipped
{if related_story_key: **Related Story:** {related_story_key}}
```

### 3. Changes Summary

If `{baseline_commit}` is NOT "NO_GIT":

```
**All changes since baseline ({baseline_commit}):**
{git diff --stat {baseline_commit}}

These changes are staged but NOT committed.
```

### 4. Next Steps

Present recommended next steps based on context:

```
**Recommended Next Steps:**

1. **Commit changes** - Review the diff and commit with a descriptive message referencing {bug_id}
2. {if related_story_key: **Update story** - Add bug fix notes to {related_story_key} story file}
3. **Code review** (optional) - Run the full code-review workflow for additional confidence
4. {if related patterns found in step-02: **Follow-up** - Consider filing separate bug fixes for related patterns found during investigation}
```

### 5. Offer Continuation

```
What would you like to do?

- **Commit** - I'll help prepare the commit message
- **Another bug** - Start a new bug fix
- **Done** - Return to agent menu
```

Handle user choice:
- **Commit:** Suggest a commit message in format: `fix({component}): {short description} [{bug_id}]`
- **Another bug:** Restart workflow from step-01
- **Done:** End workflow, return control to agent

---

## SUCCESS METRICS

- Sprint status updated if applicable (without changing story status)
- Complete summary provided with all key details
- Changes clearly shown
- Next steps presented
- User has clear path forward

## FAILURE MODES

- Changing story status in sprint-status.yaml (bug fix should NOT change story lifecycle)
- Incomplete summary (missing files, tests, or verification status)
- Not mentioning uncommitted changes
- Not offering commit assistance
