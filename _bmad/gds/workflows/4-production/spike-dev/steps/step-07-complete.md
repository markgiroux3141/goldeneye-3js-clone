# Step 7: Completion & Next Steps (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER skip the completion summary
- CRITICAL: ALWAYS read the complete step file before taking any action
- Include frame budget summary in completion report
- Provide clear next step recommendations
- Offer cleanup guidance for isolation environment
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Spike plan has been updated in step-06
- All spike work is complete
- Focus on summary, cleanup, and next steps

## YOUR TASK:

Summarize the completed spike (including frame budget analysis), recommend next steps, and guide cleanup of the isolation environment.

## EXECUTION SEQUENCE:

### 1. Present Completion Summary

"**Spike Complete!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Spike:** {spike_name}
**Engine:** {game_engine}
**Outcome:** {spike_outcome}

**Frame Budget:**
- Target: {frame_budget_ms}ms ({target_fps}fps)
- Actual: {frame_budget_used}ms
- Status: {UNDER/OVER by X%}

**Isolation:**
- Type: {isolation_type}
- Location: {isolation_path}

**Criteria Results:**
{list each criterion with pass/fail}

**Key Learnings:**
{brief summary of main learnings}

**Visual Debugging Added:**
{list debug visualizations that were useful}

**Spike Plan Updated:** {spike_plan_path}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

### 2. Analyze Next Steps

Load spike-plan.md and analyze:
- How many spikes remain?
- Which spikes now have satisfied dependencies?
- What's the recommended next spike?
- Are there frame budget concerns that affect dependent spikes?

### 3. Present Recommendations

**If more spikes pending:**

"**Recommended Next Steps:**

**Option 1: Continue with Next Spike**
Based on the dependency graph, you can now execute:

| # | Spike | Dependencies | Frame Budget | Status |
|---|-------|--------------|--------------|--------|
| {N} | {name} | {deps} ✓ satisfied | {target}ms | Ready |
| {M} | {name} | {deps} ✓ satisfied | {target}ms | Ready |

{If current spike was GPU-related and next is dependent}
Note: {next_spike} depends on this spike. Frame budget result ({frame_budget_used}ms) should inform its target.

Recommended: Spike {N} ({rationale})

**Option 2: Process Results First**
Take time to:
- Review the learnings from this spike
- Discuss with team if needed
- Update architecture if spike outcome suggests changes
- Review frame budget allocation across remaining spikes

[N] Execute next spike (Spike {N})
[S] Select different spike
[P] Pause - will return later
[E] Exit spike-dev workflow"

---

**If all spikes complete:**

"**All Spikes Complete!**

**Summary:**
- Total spikes: {count}
- Successful: {count}
- Partial: {count}
- Failed: {count}

**Frame Budget Overview:**
| Spike | Target | Actual | Status |
|-------|--------|--------|--------|
{list all spikes with frame budget results}

**Total Frame Budget Used:** {sum}ms / {total_frame_budget}ms
**Headroom:** {remaining}ms

**Recommended Next Steps:**

1. **Review Spike Plan** - Review all learnings as a whole
2. **Verify Frame Budget** - Ensure combined allocations fit target
3. **Update Architecture** - If any failed/partial spikes suggest changes
4. **Create Epics & Stories** - Run `create-epics-and-stories` workflow
   - Spike learnings will inform story details
   - Failed spikes may need alternative approaches in stories
   - Frame budget learnings should inform story acceptance criteria

[R] Review complete spike plan
[A] Proceed to create-epics-and-stories
[E] Exit"

---

**If spike failed:**

"**Spike Failed - Action Needed**

The spike '{spike_name}' did not validate successfully.

**Frame Budget Status:** {frame_budget_used}ms / {frame_budget_ms}ms

{If performance was the issue}
**Note:** This was a performance failure. The algorithm may be correct but too expensive.
Consider: Optimization, GPU acceleration, reduced quality, or different approach.

**Recommendation from learnings:** {recommendation}

**Options:**

[T] Try alternative approach (create new spike)
[O] Attempt optimization of current approach
[R] Revise architecture for this component
[A] Accept risk and proceed (document in architecture)
[D] Defer this functionality
[E] Exit and consider options"

### 4. Handle Isolation Cleanup

"**Isolation Cleanup**

Your spike code is at: {isolation_path}

**Debug Visualizations Created:**
{list debug viz that were added}

**Options:**

[K] **Keep** - Preserve spike code for reference
    Useful if: You may want to reference the implementation or debug viz later

[D] **Delete** - Remove spike isolation
    Recommended for: Console/script and test scenes
    {Show delete command if applicable}

[M] **Merge debug tools** - Extract useful debug visualizations
    For test scenes: Keep debug scripts for main project
    For branches: Cherry-pick debug utilities
    {Show relevant commands}

[P] **Promote to dev branch** - Spike code is solid enough to iterate on
    For sandbox branches: Create PR or merge to dev
    {Show git commands if applicable}

What would you like to do with the spike code?"

### 5. Handle User Selection

**If [N] Next Spike:**
- Clear current spike state variables
- Load step-01-init.md with pre-selected spike

**If [S] Select Different:**
- Clear current spike state
- Load step-01-init.md for fresh selection

**If [O] Optimize (failed spike):**
- Note: Keep isolation environment
- Return to step-03-execute.md for optimization attempt
- Track as retry in spike plan

**If [P] Pause:**
- Note: Spike is complete, no state to save
- Output: "You can continue later. **Start a fresh context** and run:"
  ```
  /bmad_gds_spike-dev
  ```
- Exit workflow

**If [E] Exit:**
- Output: "Spike development complete. When ready for the next spike, **start a fresh context** and run:"
  ```
  /bmad_gds_spike-dev
  ```
- Exit workflow

**If [A] Proceed to Epics (all complete):**
- Output: "Ready to create epics and stories. **Start a fresh context** and run:"
  ```
  /bmad_gds_create-epics-and-stories
  ```
- Exit workflow

### 6. Cleanup Execution

**If [D] Delete selected:**

For console/script:
```
rm -rf {isolation_path}
```

For test scene:
```
# In Unity: Delete spike scene and associated scripts
# In Unreal: Delete spike level and associated Blueprints/C++
# In Godot: Delete spike scene and associated scripts
```

For sandbox branch:
```
git checkout main
git branch -D spike/{spike_name}
```

Confirm: "Isolation cleaned up."

**If [K] Keep:**
"Spike code preserved at {isolation_path}"

**If [M] Merge debug tools:**
Guide through extraction of debug visualization scripts/Blueprints/nodes.

**If [P] Promote:**
Guide through branch merge or PR creation.

### 7. Final Message

"**Thank you for completing spike development!**

**What you accomplished:**
- Validated technical risk: {spike_name}
- Engine: {game_engine}
- Outcome: {spike_outcome}
- Frame budget: {frame_budget_used}ms / {frame_budget_ms}ms
- Learnings documented in spike plan

**Spike plan location:** {spike_plan_path}

{Appropriate next step guidance based on selection}"

## SUCCESS METRICS:

- Clear completion summary with frame budget analysis
- Next steps recommended based on spike plan state
- Frame budget implications analyzed for dependent spikes
- Cleanup options presented and handled
- User knows what to do next
- Workflow exits cleanly

## FAILURE MODES:

- Not including frame budget in completion summary
- Not analyzing remaining spikes
- Not considering frame budget impact on dependent spikes
- Not offering cleanup options
- Unclear next step guidance
- Not handling all exit paths
- Leaving state variables in inconsistent state

## WORKFLOW COMPLETE

This is the final step of the spike-dev workflow. The spike is complete and spike-plan.md has been updated with all learnings and frame budget data.
