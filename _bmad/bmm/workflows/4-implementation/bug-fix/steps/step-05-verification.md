---
name: 'step-05-verification'
description: 'Verify the fix solves the reported problem with no regressions'

nextStepFile: './step-06-review.md'
prevStepFile_implementation: './step-04-implementation.md'
prevStepFile_investigation: './step-02-investigation.md'
---

# Step 5: Verification

**Goal:** Verify the fix actually solves the reported problem and no regressions were introduced.

---

## AVAILABLE STATE

From prior steps: `{bug_id}`, `{severity}`, `{root_cause}`, `{fix_approach}`, `{reproduction_steps}`, `{files_modified}`, `{tests_added}`, `{baseline_commit}`

## STATE VARIABLES (set in this step)

- `{fix_verified}` - true | false

---

## EXECUTION SEQUENCE

### 1. Reproduce Original Scenario

If `{reproduction_steps}` were provided (not "unknown"):
- Re-execute the reproduction steps
- Confirm the bug no longer manifests
- Document the result

If reproduction steps are "unknown":
- Use the regression test as the verification proxy
- Note that manual verification was not possible

### 2. Regression Test Confirmation

Run the primary regression test written in step-04:
- Confirm it passes
- This test proves the specific bug scenario is fixed

### 3. Full Test Suite

Run the complete test suite:

```
Full test suite results:
Total: {count}
Passed: {count}
Failed: {count}
Skipped: {count}
```

All tests must pass. If any fail, evaluate per step-04's rules.

### 4. Verification Checklist

Walk through each item:

```
**Verification Checklist for {bug_id}:**

- [ ] Original bug no longer reproducible (or regression test passes as proxy)
- [ ] Primary regression test passes
- [ ] All edge case tests pass
- [ ] All existing tests pass (no regressions)
- [ ] Changes are within approved scope from step-03
- [ ] No new warnings or errors introduced in test output
```

### 5. Verification Report

Present the report:

```
**Verification Report:**

Bug ID: {bug_id}
Severity: {severity}
Root Cause: {root_cause}
Fix Approach: {fix_approach}
Files Modified: {count} ({list})
Tests Added: {count} ({list})
Test Suite: {total passed} / {total tests}
Scope Check: {within scope / note any deviations}

**Verification: {PASS / FAIL}**
```

### 6. Handle Result

**IF PASS:**
- Set `{fix_verified}` = true
- Proceed to review

**IF FAIL - tests failing:**
- Identify which tests fail and why
- Route back to `{prevStepFile_implementation}` (step-04) for fixes
- "**RETURNING:** Loading `step-04-implementation.md` to address test failures"

**IF FAIL - root cause was wrong:**
- If the fix doesn't actually resolve the original bug, the root cause analysis was incorrect
- Route back to `{prevStepFile_investigation}` (step-02) for re-investigation
- "**RETURNING:** Loading `step-02-investigation.md` - root cause needs re-analysis"

---

### 7. Present Continuation

If verification PASSED:

Display: "**Verification PASSED.** [C] Continue to Adversarial Review"

- IF C: Load `{nextStepFile}`
- ALWAYS halt and wait for user input

---

## NEXT STEP DIRECTIVE

**CRITICAL:** On PASS + user selects C: "**NEXT:** Loading `step-06-review.md`"

---

## SUCCESS METRICS

- Original bug confirmed fixed (or regression test passes as proxy)
- All tests pass with zero failures
- Scope confirmed within plan
- Verification status recorded
- Clear PASS/FAIL determination

## FAILURE MODES

- Not re-running the original reproduction scenario
- Claiming verification without running tests
- Proceeding to review when verification fails
- Not routing back when tests fail
