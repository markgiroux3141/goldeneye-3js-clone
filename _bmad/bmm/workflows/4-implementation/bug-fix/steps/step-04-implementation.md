---
name: 'step-04-implementation'
description: 'Execute the fix plan using red-green-refactor and write regression tests'

nextStepFile: './step-05-verification.md'
---

# Step 4: Implementation

**Goal:** Execute the fix plan: write the failing regression test first, implement the fix, then verify all tests pass.

---

## AVAILABLE STATE

From prior steps: `{bug_id}`, `{severity}`, `{root_cause}`, `{affected_files}`, `{fix_approach}`, `{fix_plan}`, `{risk_assessment}`, `{baseline_commit}`, `{project_context}`

## STATE VARIABLES (set in this step)

- `{files_modified}` - List of source files actually changed
- `{tests_added}` - List of test files created or modified

---

## MANDATORY EXECUTION RULES

- Write the failing regression test BEFORE writing the fix. This is non-negotiable.
- Follow `{fix_plan}` from step-03. Do not deviate without returning to step-03.
- If `{project_context}` was loaded, follow its coding patterns and conventions.
- Execute continuously without stopping between tasks unless a HALT condition is hit.
- Track every file modified and every test added.

---

## EXECUTION SEQUENCE

### 1. RED Phase - Write Failing Regression Test

Create a test that reproduces the bug:

- The test should exercise the exact scenario from `{reproduction_steps}`
- The test MUST fail before the fix is applied (proving it catches the bug)
- If the test passes before the fix, it does not actually test the bug - revise it

```
Writing regression test for {bug_id}...
Test file: {path}
Test name: {descriptive name matching the bug scenario}
Expected: FAIL (bug not yet fixed)
Actual: {FAIL = correct / PASS = test doesn't catch the bug, revise}
```

### 2. GREEN Phase - Implement the Fix

Execute changes from `{fix_plan}` in order:

For each planned change:
1. Read the target file
2. Make the specified change
3. Run the regression test to track progress
4. Note: test may not pass until all changes are complete

After all changes:
- Confirm the regression test now passes

```
Implementing fix for {bug_id}...
Change 1: {file} - {description} ... done
Change 2: {file} - {description} ... done
Regression test: {PASS / FAIL}
```

**If regression test still fails after all planned changes:**
- Analyze why. Is the fix plan incomplete?
- If minor adjustment needed: make it and note the deviation
- If significant changes needed: HALT and return to step-03 for replanning

### 3. Write Additional Edge Case Tests

From the test plan in `{fix_plan}`, write the additional edge case tests:

- Each test should cover a related scenario that could break
- All edge case tests should pass (they test correct behavior, not the bug)
- If an edge case test fails: you may have found an additional issue - evaluate if it's in scope

### 4. Run Full Test Suite

Execute ALL existing tests (not just the new ones):

```
Running full test suite...
Total: {count}
Passed: {count}
Failed: {count}
New tests: {count passed} / {count total}
```

**If existing tests fail:**
1. Check if the failure is expected (the fix intentionally changes behavior that old tests validated)
   - If yes: update the old test to match new correct behavior. Document why.
2. Check if the fix introduced a new bug
   - If yes: fix it within scope, or HALT if it requires out-of-scope changes
3. Check if the failure is unrelated (flaky test, environment issue)
   - If yes: note it but do not fix unrelated tests

### 5. REFACTOR Phase (conditional)

**Only execute if `{fix_approach}` is "comprehensive" or "refactor-required":**

- Clean up only within the approved scope from step-03
- Keep ALL tests green throughout refactoring
- If refactoring breaks a test, revert and reconsider

**Skip if `{fix_approach}` is "minimal".**

### 6. Record Changes

Update state variables:

```
{files_modified}: [list of all source files changed]
{tests_added}: [list of all test files created or modified]
```

---

## HALT CONDITIONS

Stop execution and communicate to the user if:

- 3 consecutive failures on the same issue
- Regression test fails after all planned changes and fix is not obvious
- Fix requires changes outside the approved scope (return to step-03)
- Blocking dependency discovered (missing library, service unavailable)
- Existing tests fail in a way that suggests the fix plan is wrong

On HALT: explain the situation, present options, wait for user decision.

---

## NEXT STEP DIRECTIVE

**CRITICAL:** When implementation is complete and all tests pass: "**NEXT:** Loading `step-05-verification.md`"

Load `{nextStepFile}` automatically (no menu - this is a continuous execution step).

---

## SUCCESS METRICS

- Regression test written BEFORE fix (red phase)
- Regression test fails before fix, passes after (proves the fix works)
- Fix implemented per plan
- All tests pass (new and existing)
- Changes confined to approved scope
- `{files_modified}` and `{tests_added}` recorded

## FAILURE MODES

- Writing fix before regression test
- Regression test that passes before the fix (doesn't actually catch the bug)
- Going outside approved scope without returning to step-03
- Not running existing tests after the fix
- Claiming tests pass without actually running them
- Silently changing existing test expectations without documenting why
