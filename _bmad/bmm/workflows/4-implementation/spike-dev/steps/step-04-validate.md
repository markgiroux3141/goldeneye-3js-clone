# Step 4: Validate Success Criteria

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER skip a success criterion
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- Each criterion must be explicitly validated - no assumptions
- Record measurements and observations for all criteria
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Implementation is complete from step-03
- `spike_success_criteria` contains the criteria to validate
- Focus ONLY on validation - learnings documented in step-05

## YOUR TASK:

Systematically validate each success criterion from the spike definition and record results.

## EXECUTION SEQUENCE:

### 1. Load Validation Guidance

From `{data_files_path}/isolation-guidance.yaml`, understand validation approaches:
- Automated test
- Manual inspection
- Profiling
- Log analysis

### 2. Present Validation Plan

"**Validating Spike: {spike_name}**

**Success Criteria to Validate:**

| # | Criterion | Validation Type | Status |
|---|-----------|-----------------|--------|
| 1 | {criterion_1} | {type} | Pending |
| 2 | {criterion_2} | {type} | Pending |
...

Let's validate each criterion. Ready?

[C] Continue with validation"

### 3. Validate Each Criterion

For each criterion in `spike_success_criteria`:

**Determine validation type:**
- If has threshold/number → Profiling
- If deterministic output → Automated test
- If visual/subjective → Manual inspection
- If behavior/sequence → Log analysis

**Execute validation based on type:**

---

**Type: Automated Test**
```
**Criterion {N}:** {criterion_text}
**Validation:** Automated Test

Running test...

Result: {PASS/FAIL}
Details: {test output or error}

{If FAIL}
Would you like to:
[R] Retry after fix
[A] Accept failure and continue
[N] Add notes about this failure
```

---

**Type: Profiling**
```
**Criterion {N}:** {criterion_text}
**Validation:** Profiling

Please run the profiler/timing and report:
- {specific measurement needed}

Enter measurement: [user input]

Threshold: {from criterion, e.g., "< 100ms"}
Actual: {user input}
Result: {PASS if meets threshold, FAIL otherwise}

[C] Continue to next criterion
[R] Re-measure
```

---

**Type: Manual Inspection**
```
**Criterion {N}:** {criterion_text}
**Validation:** Manual Inspection

Please verify: {what to look for}

Does the spike meet this criterion?

[P] Pass - criterion is satisfied
[F] Fail - criterion is NOT satisfied
[N] Notes - add observation before deciding
```

---

**Type: Log Analysis**
```
**Criterion {N}:** {criterion_text}
**Validation:** Log Analysis

Please check logs for: {what to look for}

Expected: {expected log entries or patterns}

Are the expected entries present?

[P] Pass - logs show expected behavior
[F] Fail - logs do not match expected
[N] Notes - add observation
```

### 4. Record Results

For each criterion, record to `criteria_results`:
```yaml
criteria_results:
  - criterion: "{criterion_text}"
    passed: true/false
    measurement: "{actual value if applicable}"
    notes: "{any observations}"
```

### 5. Determine Overall Outcome

After all criteria validated:

**Calculate outcome:**
- All pass → `spike_outcome: "success"`
- Some pass → `spike_outcome: "partial"`
- All fail → `spike_outcome: "failed"`

### 6. Present Validation Summary

"**Validation Complete**

**Spike: {spike_name}**
**Outcome: {spike_outcome}**

**Results:**
| # | Criterion | Result | Measurement |
|---|-----------|--------|-------------|
| 1 | {criterion_1} | {PASS/FAIL} | {measurement} |
| 2 | {criterion_2} | {PASS/FAIL} | {measurement} |
...

**Summary:**
- Passed: {count}
- Failed: {count}

{If partial or failed}
**Note:** Partial success or failure is valuable information.
This tells us what works and what doesn't.

[C] Continue to document learnings
[R] Re-validate a criterion"

### 7. Set State Variables

```yaml
criteria_results: [{...}, {...}]
spike_outcome: "{success|partial|failed}"
```

## SUCCESS METRICS:

- Every criterion explicitly validated
- No criteria skipped or assumed
- Measurements recorded for quantitative criteria
- Notes captured for qualitative criteria
- Overall outcome correctly determined
- User confirmed validation results

## FAILURE MODES:

- Skipping criteria
- Assuming criteria pass without validation
- Not recording measurements
- Incorrect outcome determination
- Marking pass when actually failed (or vice versa)

## NEXT STEP:

After user selects [C], load `./step-05-learnings.md` to document what was learned.

Remember: Do NOT proceed until user confirms validation is complete!
