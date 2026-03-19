---
name: 'step-03-fix-planning'
description: 'Determine the fix approach and create a concrete plan of changes'

nextStepFile: './step-04-implementation.md'
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
sprintStatusFile: '{implementation_artifacts}/sprint-status.yaml'
---

# Step 3: Fix Planning

**Goal:** Determine the fix approach and create a concrete, scoped plan of changes.

---

## AVAILABLE STATE

From prior steps: `{bug_id}`, `{bug_description}`, `{severity}`, `{root_cause}`, `{affected_files}`, `{affected_components}`, `{reproduction_steps}`, `{error_evidence}`, `{entry_mode}`

## STATE VARIABLES (set in this step)

- `{fix_approach}` - "minimal" | "comprehensive" | "refactor-required"
- `{fix_plan}` - Ordered list of specific changes to make
- `{risk_assessment}` - What could go wrong with this fix
- `{related_story_key}` - Story key if bug relates to a sprint story (optional)

---

## MANDATORY EXECUTION RULES

- Scope discipline is paramount. Fix the bug, not the neighborhood.
- Every fix plan MUST include regression tests. This is non-negotiable.
- Prefer the minimal fix for critical and high severity bugs.
- Be explicit about what is IN scope and OUT of scope.

---

## EXECUTION SEQUENCE

### 1. Evaluate Fix Approach

Based on root cause and severity, recommend an approach:

**Minimal fix** (preferred for critical/high severity):
- Smallest change that fixes the root cause
- Only touch the files directly involved
- No cleanup, no refactoring, no "while I'm here" improvements

**Comprehensive fix** (suitable for medium/low severity):
- Fix the root cause AND clean up immediately related code smells
- Only within the same function/module as the bug
- Must be justified: "fixing X also requires cleaning Y because..."

**Refactor required** (when minimal fix isn't viable):
- Root cause is in poorly structured code that must be restructured to fix properly
- Scope the refactor tightly — only what's needed for the fix
- Requires explicit user agreement before proceeding

Present recommendation:

```
**Recommended approach:** {approach}
**Rationale:** {why this approach for this severity and root cause}

Agree? (y / prefer [minimal|comprehensive|refactor-required])
```

### 2. Scope Guard

Explicitly state what is and is not in scope:

```
**SCOPE DEFINITION for {bug_id}:**

IN SCOPE:
- {specific change 1}
- {specific change 2}
- Regression test for the reported bug scenario
- Edge case tests for related scenarios

OUT OF SCOPE:
- {tempting improvement 1 — why it's out}
- {tempting improvement 2 — why it's out}
- {related pattern found elsewhere — separate bug fix}
```

This is a commitment. If implementation reveals scope needs to expand, return to this step.

### 3. Create Fix Plan

Produce an ordered list of specific changes:

```
**Fix Plan for {bug_id}:**

**Code Changes:**
1. {file:function} - {what to change and why}
2. {file:function} - {what to change and why}
...

**Regression Tests to Add:**
1. {test file} - Test that reproduces the original bug (proves fix works)
2. {test file} - Edge case: {scenario description}
3. {test file} - Edge case: {scenario description}

**Files to Touch:** {count} source files + {count} test files
```

### 4. Risk Assessment

Evaluate what could go wrong:

```
**Risk Assessment:**
- {risk 1}: {what could happen and how likely}
- {risk 2}: {what could happen and how likely}
- Mitigation: {baseline_commit} allows full rollback via git
```

Consider: side effects on other features, behavior changes consumers depend on, performance implications, edge cases not covered.

### 5. Sprint Integration Check

Check if `{sprintStatusFile}` exists:

**If exists:**
- Ask: "Is this bug related to a current sprint story? If so, which one?"
- If yes, store `{related_story_key}`. The completion step will note the fix there.
- If no, note this is an out-of-sprint fix.

**If not exists:**
- Skip. No sprint tracking in this project.

### 6. User Approval

Present the complete plan for review:

```
**Bug Fix Plan Summary:**
Bug: {bug_id} ({severity})
Root Cause: {root_cause}
Approach: {fix_approach}
Changes: {count} files
Tests: {count} regression tests planned
Risk: {summary}

Ready to implement?
```

---

### 7. Present MENU OPTIONS

Display: "**Select:** [A] Advanced Elicitation [P] Party Mode [C] Continue to Implementation"

#### Menu Handling Logic:

- IF A: Execute `{advancedElicitationTask}`, then redisplay menu
- IF P: Execute `{partyModeWorkflow}`, then redisplay menu
- IF C: Store `{fix_approach}`, `{fix_plan}`, `{risk_assessment}`, then load `{nextStepFile}`
- IF Any other: help user, then redisplay menu

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
- After other menu items execution, return to this menu

---

## NEXT STEP DIRECTIVE

**CRITICAL:** When user selects C: "**NEXT:** Loading `step-04-implementation.md`"

---

## SUCCESS METRICS

- Fix approach selected with rationale
- Scope explicitly bounded (IN/OUT)
- Fix plan is specific (files + changes + functions)
- Regression tests planned (minimum: 1 that reproduces the bug)
- Risk assessed
- User approved the plan
- Explicit NEXT directive provided

## FAILURE MODES

- Not bounding scope ("fix everything while we're here")
- Missing regression test in the plan
- Not assessing risk
- Plan too vague ("fix the auth module" instead of "auth.js:42 - add email field to OAuth query")
- Proceeding without user approval
