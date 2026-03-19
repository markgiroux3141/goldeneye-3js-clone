# Step 6: Update Spike Plan (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER skip updating the spike plan
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- The spike plan is the source of truth for spike status
- Frame budget results are CRITICAL data - preserve them
- All updates must be saved to spike-plan.md
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Learnings documented in step-05
- All state variables are set: `spike_outcome`, `criteria_results`, `learnings`, `frame_budget_used`
- Focus on updating spike-plan.md - completion summary is step-07

## YOUR TASK:

Update spike-plan.md with the spike's completion status, criteria results (including frame budget), and learnings.

## EXECUTION SEQUENCE:

### 1. Load Spike Plan

Load the spike plan from `{spike_plan_path}`.

### 2. Update Integration Roadmap

Find the spike in the Integration Roadmap section and mark complete:

**Before:**
```markdown
### Phase {N}: {Phase Name}
- [ ] Spike {N}: {spike_name}
```

**After:**
```markdown
### Phase {N}: {Phase Name}
- [x] Spike {N}: {spike_name} {outcome_symbol} ({frame_budget_used}ms)
```

Where `{outcome_symbol}` is:
- ✓ Success
- ◐ Partial
- ✗ Failed

### 3. Add Learnings Section

Below the spike definition, add the learnings section:

**Locate:**
```markdown
### Spike {N}: {spike_name}

{existing spike definition...}

---
```

**Add after the spike definition:**
```markdown
---

#### Spike Learnings (Completed {date})

**Outcome:** {spike_outcome}

**Frame Budget:**
- Target: {frame_budget_ms}ms
- Actual: {frame_budget_used}ms
- Status: {UNDER/OVER by X%}

**Criteria Results:**
- [{x or space}] {criterion_1} - {measurement or note}
- [{x or space}] {criterion_2} - {measurement or note}
- [{x or space}] Frame budget < {target}ms - {actual}ms {PASS/FAIL}
...

**What Worked:**
{from learnings}

**What Didn't Work:**
{from learnings}

**Visual Debugging Notes:**
{from learnings - what viz helped, what to add}

**Platform Considerations:**
{from learnings - any platform-specific notes}

**Key Learnings:**
{from learnings}

**Implications for Implementation:**
{from learnings}

{If failed/partial}
**Recommendation:** {recommendation from failure analysis}
- Root Cause: {cause}
- Category: {Performance/Correctness/Engine Limitation/Approach Flawed}

---
```

### 4. Update Frontmatter

Update the spike plan frontmatter:

```yaml
---
# Existing fields...
spikes_completed: {increment by 1}
last_spike_completed: "{spike_name}"
last_spike_outcome: "{spike_outcome}"
last_spike_frame_budget: "{frame_budget_used}ms"
spikes_in_progress: []  # Clear this spike from in-progress
---
```

### 5. Update Frame Budget Summary (if exists)

If the spike plan has a Frame Budget Summary section, update it:

```markdown
## Frame Budget Summary

| Spike | Target | Actual | Status |
|-------|--------|--------|--------|
| {spike_name} | {target}ms | {actual}ms | {✓/✗} |
...

**Total Allocated:** {sum}ms / {total_budget}ms
```

### 6. Save Changes

Save the updated spike-plan.md.

### 7. Confirm Update

"**Spike Plan Updated**

**File:** {spike_plan_path}

**Changes Made:**

1. ✓ Integration Roadmap: Marked Spike {N} as {outcome}

2. ✓ Learnings Section: Added below spike definition
   - Outcome recorded
   - Frame budget recorded: {actual}ms / {target}ms
   - Criteria results recorded
   - Visual debugging notes preserved
   - Learnings documented

3. ✓ Frontmatter Updated:
   - spikes_completed: {old} → {new}
   - last_spike_completed: {spike_name}
   - last_spike_frame_budget: {frame_budget_used}ms

{If frame budget section exists}
4. ✓ Frame Budget Summary Updated

**Preview of learnings section:**
{show first few lines of learnings section}

[C] Continue to completion summary
[V] View full updated spike plan
[E] Edit learnings before finalizing"

## SUCCESS METRICS:

- Integration Roadmap checkbox marked with frame budget
- Learnings section added in correct location
- Frame budget data preserved
- Visual debugging notes captured
- Platform considerations documented
- Frontmatter updated with completion count
- In-progress cleared
- File saved successfully
- User confirmed updates

## FAILURE MODES:

- Not marking the roadmap checkbox
- Losing frame budget measurements
- Not preserving visual debugging notes
- Adding learnings in wrong location
- Not updating frontmatter
- Not clearing in-progress status
- Not saving the file
- Corrupting existing spike plan content

## NEXT STEP:

After user selects [C], load `./step-07-complete.md` for completion summary and next steps.

Remember: Do NOT proceed until spike plan is saved and user confirms!
