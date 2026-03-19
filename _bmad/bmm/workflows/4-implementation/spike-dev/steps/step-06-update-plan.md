# Step 6: Update Spike Plan

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER skip updating the spike plan
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- The spike plan is the source of truth for spike status
- All updates must be saved to spike-plan.md
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Learnings documented in step-05
- All state variables are set: `spike_outcome`, `criteria_results`, `learnings`
- Focus on updating spike-plan.md - completion summary is step-07

## YOUR TASK:

Update spike-plan.md with the spike's completion status, criteria results, and learnings.

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
- [x] Spike {N}: {spike_name} ✓ {outcome}
```

Where `{outcome}` is:
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

**Criteria Results:**
- [{x or space}] {criterion_1} - {measurement or note}
- [{x or space}] {criterion_2} - {measurement or note}
...

**What Worked:**
{from learnings}

**What Didn't Work:**
{from learnings}

**Key Learnings:**
{from learnings}

**Implications for Implementation:**
{from learnings}

{If failed/partial}
**Recommendation:** {recommendation from failure analysis}

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
spikes_in_progress: []  # Clear this spike from in-progress
---
```

### 5. Save Changes

Save the updated spike-plan.md.

### 6. Confirm Update

"**Spike Plan Updated**

**File:** {spike_plan_path}

**Changes Made:**

1. ✓ Integration Roadmap: Marked Spike {N} as {outcome}

2. ✓ Learnings Section: Added below spike definition
   - Outcome recorded
   - Criteria results recorded
   - Learnings documented

3. ✓ Frontmatter Updated:
   - spikes_completed: {old} → {new}
   - last_spike_completed: {spike_name}

**Preview of learnings section:**
{show first few lines of learnings section}

[C] Continue to completion summary
[V] View full updated spike plan
[E] Edit learnings before finalizing"

## SUCCESS METRICS:

- Integration Roadmap checkbox marked
- Learnings section added in correct location
- Frontmatter updated with completion count
- In-progress cleared
- File saved successfully
- User confirmed updates

## FAILURE MODES:

- Not marking the roadmap checkbox
- Adding learnings in wrong location
- Not updating frontmatter
- Not clearing in-progress status
- Not saving the file
- Corrupting existing spike plan content

## NEXT STEP:

After user selects [C], load `./step-07-complete.md` for completion summary and next steps.

Remember: Do NOT proceed until spike plan is saved and user confirms!
