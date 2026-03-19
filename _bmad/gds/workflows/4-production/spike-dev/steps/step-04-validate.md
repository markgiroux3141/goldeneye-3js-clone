# Step 4: Validate Success Criteria (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER skip a success criterion
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- Frame budget validation is FIRST-CLASS - treat it with rigor
- Each criterion must be explicitly validated - no assumptions
- Record measurements for all criteria
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Implementation is complete from step-03
- Frame timing has been instrumented
- Visual debugging is in place
- Focus ONLY on validation - learnings documented in step-05

## YOUR TASK:

Systematically validate each success criterion, with special attention to frame budget validation.

## EXECUTION SEQUENCE:

### 1. Load Validation Guidance

From `{data_files_path}/isolation-guidance.yaml`, understand validation approaches:
- Automated test
- Manual inspection
- Frame profiling (game-specific)
- GPU profiling (game-specific)
- Visual diff

### 2. Present Validation Plan

"**Validating Spike: {spike_name}**
**Engine: {game_engine}**
**Frame Budget: {frame_budget_ms}ms**

**Success Criteria to Validate:**

| # | Criterion | Type | Status |
|---|-----------|------|--------|
| 1 | {criterion_1} | {type} | Pending |
| 2 | Frame time < Xms | Frame Budget | Pending |
...

{If frame budget criterion exists:}
⚠️ Frame budget validation will use profiler, not just frame time display.

Let's validate each criterion. Ready?

[C] Continue with validation"

### 3. Frame Budget Validation (Priority)

If any criterion involves frame budget/performance:

"**FRAME BUDGET VALIDATION**

**Criterion:** {frame budget criterion}
**Target:** {target}ms
**Frame Budget Context:** {target_fps}fps = {frame_budget_ms}ms total

**Validation Protocol:**

1. **Setup:**
{engine-specific}
   - Unity: Open Profiler (Window > Analysis > Profiler)
   - Unreal: Enable stat unit, stat gpu
   - Godot: Open Debugger > Monitors

2. **Measurement:**
   - Run spike for at least 100 frames
   - Capture AVERAGE frame time (not min or max)
   - Note any spikes/stutters

3. **Record:**
   - Average CPU time: ___ms
   - Average GPU time: ___ms (if applicable)
   - Spike count: ___

Please run the profiler and report measurements:

Average frame time: [user input]ms
Any major spikes? [Y/N]

**Evaluation:**
Target: {target}ms
Actual: {user_input}ms
Result: {PASS/FAIL}

{If FAIL}
Over budget by: {amount}ms ({percentage}%)

Options:
[A] Accept failure - document in learnings
[O] Attempt optimization and re-measure
[N] Add notes about the failure"

### 4. Validate Each Criterion

For each criterion in `spike_success_criteria`:

---

**Type: Automated Test**
```
**Criterion {N}:** {criterion_text}
**Validation:** Automated Test

Running test...

Result: {PASS/FAIL}
Details: {test output or error}
```

---

**Type: Visual Inspection**
```
**Criterion {N}:** {criterion_text}
**Validation:** Visual Inspection

Using your debug visualization, verify:
- {what to look for}

Does the visual output meet the criterion?

[P] Pass - looks correct
[F] Fail - visual issues observed
[N] Notes - describe what you see
```

---

**Type: Manual Profiling**
```
**Criterion {N}:** {criterion_text}
**Validation:** Profiling

Please measure using {engine-specific tool}:
- {specific measurement}

Enter measurement: [user input]

Threshold: {from criterion}
Actual: {user input}
Result: {PASS/FAIL}
```

---

**Type: Visual Diff**
```
**Criterion {N}:** {criterion_text}
**Validation:** Visual Diff

Compare spike output against reference:
1. Capture screenshot of spike output
2. Compare to expected appearance

Does it match expectations?

[P] Pass - matches reference
[F] Fail - visual differences
[N] Notes - describe differences
```

### 5. Record Results

For each criterion, record to `criteria_results`:
```yaml
criteria_results:
  - criterion: "{criterion_text}"
    passed: true/false
    measurement: "{actual value if applicable}"
    notes: "{any observations}"
```

Track frame budget specifically:
```yaml
frame_budget_used: {measured_ms}
```

### 6. Determine Overall Outcome

**Calculate outcome:**
- All pass → `spike_outcome: "success"`
- Some pass → `spike_outcome: "partial"`
- All fail → `spike_outcome: "failed"`

**Special consideration for frame budget:**
- If frame budget was the ONLY failure, note this specifically
- Frame budget failure often means "approach works but needs optimization"

### 7. Present Validation Summary

"**Validation Complete**

**Spike: {spike_name}**
**Outcome: {spike_outcome}**

**Results:**
| # | Criterion | Result | Measurement |
|---|-----------|--------|-------------|
| 1 | {criterion_1} | {PASS/FAIL} | {measurement} |
| 2 | Frame budget | {PASS/FAIL} | {actual}ms / {target}ms |
...

**Frame Budget Summary:**
- Target: {target_fps}fps ({frame_budget_ms}ms)
- Measured: {frame_budget_used}ms
- Status: {UNDER/OVER by X%}

**Summary:**
- Passed: {count}
- Failed: {count}

{If partial with only frame budget failure}
**Note:** Algorithm works correctly but exceeds frame budget.
This suggests the approach is valid but needs optimization,
or a performance tradeoff decision is needed.

[C] Continue to document learnings
[R] Re-validate a criterion"

### 8. Set State Variables

```yaml
criteria_results: [{...}, {...}]
spike_outcome: "{success|partial|failed}"
frame_budget_used: {measured_ms}
```

## SUCCESS METRICS:

- Every criterion explicitly validated
- Frame budget measured with profiler (not just frame time)
- Measurements recorded
- Overall outcome correctly determined
- User confirmed validation results

## FAILURE MODES:

- Skipping frame budget validation
- Using frame time display instead of profiler
- Not recording actual measurements
- Assuming criteria pass without validation

## NEXT STEP:

After user selects [C], load `./step-05-learnings.md` to document what was learned.

Remember: Do NOT proceed until user confirms validation is complete!
