# Step 7: Completion & Next Steps

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER skip the completion summary
- CRITICAL: ALWAYS read the complete step file before taking any action
- Provide clear next step recommendations
- Offer cleanup guidance for isolation environment
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Spike plan has been updated in step-06
- All spike work is complete
- Focus on summary, cleanup, and next steps

## YOUR TASK:

Summarize the completed spike, recommend next steps, and guide cleanup of the isolation environment.

## EXECUTION SEQUENCE:

### 1. Present Completion Summary

"**Spike Complete!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Spike:** {spike_name}
**Outcome:** {spike_outcome}

**Isolation:**
- Type: {isolation_type}
- Location: {isolation_path}

**Criteria Results:**
{list each criterion with pass/fail}

**Key Learnings:**
{brief summary of main learnings}

**Spike Plan Updated:** {spike_plan_path}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

### 2. Analyze Next Steps

Load spike-plan.md and analyze:
- How many spikes remain?
- Which spikes now have satisfied dependencies?
- What's the recommended next spike?

### 3. Present Recommendations

**If more spikes pending:**

"**Recommended Next Steps:**

**Option 1: Continue with Next Spike**
Based on the dependency graph, you can now execute:

| # | Spike | Dependencies | Status |
|---|-------|--------------|--------|
| {N} | {name} | {deps} ✓ satisfied | Ready |
| {M} | {name} | {deps} ✓ satisfied | Ready |

Recommended: Spike {N} ({rationale})

**Option 2: Process Results First**
Take time to:
- Review the learnings from this spike
- Discuss with team if needed
- Update architecture if spike outcome suggests changes

[N] Execute next spike (Spike {N})
[S] Select different spike
[P] Pause - will return later
[E] Exit spike-dev workflow"

---

**If all spikes complete:**

"**All Spikes Complete! 🎉**

**Summary:**
- Total spikes: {count}
- Successful: {count}
- Partial: {count}
- Failed: {count}

**Recommended Next Steps:**

1. **Review Spike Plan** - Review all learnings as a whole
2. **Update Architecture** - If any failed/partial spikes suggest changes
3. **Create Epics & Stories** - Run `create-epics-and-stories` workflow
   - Spike learnings will inform story details
   - Failed spikes may need alternative approaches in stories

[R] Review complete spike plan
[A] Proceed to create-epics-and-stories
[E] Exit"

---

**If spike failed:**

"**Spike Failed - Action Needed**

The spike '{spike_name}' did not validate successfully.

**Recommendation from learnings:** {recommendation}

**Options:**

[T] Try alternative approach (create new spike)
[R] Revise architecture for this component
[A] Accept risk and proceed (document in architecture)
[D] Defer this functionality
[E] Exit and consider options"

### 4. Handle Isolation Cleanup

"**Isolation Cleanup**

Your spike code is at: {isolation_path}

**Options:**

[K] **Keep** - Preserve spike code for reference
    Useful if: You may want to reference the implementation later

[D] **Delete** - Remove spike isolation
    Recommended for: Console/script and test projects
    {Show delete command if applicable}

[M] **Merge learnings** - Extract useful code patterns
    For sandbox branches: Cherry-pick specific commits
    {Show git commands if applicable}

What would you like to do with the spike code?"

### 5. Handle User Selection

**If [N] Next Spike:**
- Clear current spike state variables
- Load step-01-init.md with pre-selected spike

**If [S] Select Different:**
- Clear current spike state
- Load step-01-init.md for fresh selection

**If [P] Pause:**
- Note: Spike is complete, no state to save
- Output: "You can continue later. **Start a fresh context** and run:"
  ```
  /bmad_bmm_spike-dev
  ```
- Exit workflow

**If [E] Exit:**
- Output: "Spike development complete. When ready for the next spike, **start a fresh context** and run:"
  ```
  /bmad_bmm_spike-dev
  ```
- Exit workflow

**If [A] Proceed to Epics (all complete):**
- Output: "Ready to create epics and stories. **Start a fresh context** and run:"
  ```
  /bmad_bmm_create-epics-and-stories
  ```
- Exit workflow

### 6. Cleanup Execution

**If [D] Delete selected:**

For console/script:
```
rm -rf {isolation_path}
```

For test project:
```
rm -rf {isolation_path}
```

For sandbox branch:
```
git checkout main
git branch -D spike/{spike_name}
```

Confirm: "Isolation cleaned up."

**If [K] Keep:**
"Spike code preserved at {isolation_path}"

**If [M] Merge:**
Guide through extraction process based on isolation type.

### 7. Final Message

"**Thank you for completing spike development!**

**What you accomplished:**
- Validated technical risk: {spike_name}
- Outcome: {spike_outcome}
- Learnings documented in spike plan

**Spike plan location:** {spike_plan_path}

{Appropriate next step guidance based on selection}"

## SUCCESS METRICS:

- Clear completion summary provided
- Next steps recommended based on spike plan state
- Cleanup options presented and handled
- User knows what to do next
- Workflow exits cleanly

## FAILURE MODES:

- Not analyzing remaining spikes
- Not offering cleanup options
- Unclear next step guidance
- Not handling all exit paths
- Leaving state variables in inconsistent state

## WORKFLOW COMPLETE

This is the final step of the spike-dev workflow. The spike is complete and spike-plan.md has been updated.
