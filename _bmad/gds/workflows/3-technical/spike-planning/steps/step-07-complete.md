# Step 7: Finalization and Recommendations (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- ALWAYS treat this as collaborative completion with technical peers
- YOU ARE A FACILITATOR - present recommendations, finalize together
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- All spikes defined with dependencies, criteria, and roadmap
- Frame budget allocation complete
- Focus on validation, recommendations, and finalization
- This is the final step - document should be complete

## YOUR TASK:

Validate the spike plan for completeness, generate game-specific recommendations for downstream workflows, and finalize the document.

## EXECUTION SEQUENCE:

### 1. Validation Checklist

Run through validation checklist:

**Completeness Check:**
- [ ] All high-risk components have associated spikes
- [ ] Every spike has measurable success criteria
- [ ] All dependencies are documented
- [ ] Integration roadmap covers all spikes
- [ ] No orphaned spikes (all appear in roadmap)

**Quality Check:**
- [ ] Each spike tests ONE technical question (isolation)
- [ ] Success criteria are objective and measurable
- [ ] Dependencies form valid DAG (no cycles)
- [ ] Integration milestones are meaningful
- [ ] Scope is appropriate (no spike too large)

**Game-Specific Check:**
- [ ] Frame budget criteria included for performance spikes
- [ ] Visual quality criteria included where applicable
- [ ] Platform criteria included for cross-platform spikes
- [ ] Visualization/debug approaches specified
- [ ] CPU-first pattern applied for GPU work
- [ ] Total frame budget allocation is reasonable

**Coverage Check:**
- [ ] Frame budget risks covered
- [ ] Visual fidelity risks covered
- [ ] Input latency risks covered
- [ ] Platform divergence risks covered
- [ ] Networking risks covered (if applicable)

### 2. Report Validation Results

"**Spike Plan Validation:**

Completeness: {PASS/ISSUES}
{list any issues found}

Quality: {PASS/ISSUES}
{list any issues found}

Game-Specific: {PASS/ISSUES}
{list any issues found}

Coverage: {PASS/ISSUES}
{list any risks not covered}

**Frame Budget Analysis:**
- Total allocated: {total}ms
- Available: {frame_budget}ms
- Status: {PASS if headroom > 20% / WARNING if headroom < 20% / CRITICAL if over budget}

{If issues:}
Would you like to address these issues before finalizing?

{If no issues:}
The spike plan passes all validation checks!

### 3. Generate Executive Summary

Create summary for the Executive Summary section:

"This spike plan addresses {N} high-risk game technical components identified in the architecture through {M} isolated proof-of-concept experiments.

**Game Context:**
- Engine: {game_engine}
- Target: {target_fps}fps ({frame_budget}ms frame budget)
- Platforms: {target_platforms}

**Key Risks Addressed:**
- {Risk 1}: Validated by Spike {N}
- {Risk 2}: Validated by Spikes {M, O}
...

**Frame Budget Summary:**
- Allocated: {total}ms across {count} performance-critical spikes
- Headroom: {remaining}ms for other systems

**Execution Overview:**
- {X} phases of execution
- {Y} integration milestones
- {Z} opportunities for parallel execution

**Critical Path:**
{List the spikes on the critical path}

Upon successful completion of all spikes, the following technical risks will be retired: {list}."

### 4. Generate Game-Specific Recommendations

**Epic Integration Recommendations:**

"The spikes in this plan should integrate with epic/story planning as follows:

**Sprint 0 Candidates (Complete Before Main Development):**
These spikes should be completed before main development begins:
- Spike {N}: {Name} - {why critical, e.g., "validates core rendering pipeline"}
- Spike {M}: {Name} - {why critical, e.g., "proves procedural generation feasibility"}

**Story Prerequisites:**
The following stories should not begin until these spikes complete:
- Terrain stories require Spike {N} (mesh generation) results
- LOD stories require Spike {M} (octree) results
- Network stories require Spike {O} (sync) results

**Risk Retirement:**
As spikes complete, mark these risks as retired in the architecture:
- {Risk} retired after Spike {N}
- {Risk} retired after Spikes {M, O}

**Frame Budget Gates:**
- After Phase {X}: Validate cumulative frame budget before proceeding
- Before integration: Ensure all individual budgets met"

**Sprint Allocation Recommendations:**

"Suggested sprint placement for spikes:

**Pre-Sprint (Sprint 0):**
{List spikes that should complete before sprints begin}
- Focus on foundation spikes and critical path items

**Sprint 1 (Parallel with Early Stories):**
{List spikes that could run parallel to early stories}

**As Needed:**
{List spikes that can wait until specific features are approached}"

**Platform-Specific Recommendations:**

"Platform considerations for spike execution:

**Primary Development Platform:** {recommend based on engine/team}
- Complete spikes here first

**Platform Validation Order:**
1. {platform} - Primary development
2. {platform} - First validation (catch most issues)
3. {platform} - Final validation

**Platform-Specific Spikes:**
- Spike {N} should be validated on mobile early (memory constraints)
- Spike {M} shader should be tested on {platform} (shader compatibility)"

**Risk Mitigation Notes:**

"Additional notes on managing identified risks:

**If Spike Fails:**
For each critical spike, what's the fallback?
- Spike {N} (GPU mesh gen) fails: Fall back to CPU generation with lower resolution
- Spike {M} (networking) fails: Consider P2P instead of dedicated server
- Spike {O} (procedural gen) fails: Use pre-authored content

**Frame Budget Overrun:**
If frame budget is exceeded during spike:
- First: Profile to identify hotspots
- Second: Consider quality/performance tradeoffs
- Third: Evaluate architectural changes
- Last: Adjust target FPS if acceptable for game type

**Monitoring During Spikes:**
- Track frame budget allocation as spikes complete
- Escalate early if spike is taking longer than expected
- Document learnings even if spike partially succeeds
- Capture profiler data for future reference"

### 5. User Review of Recommendations

Present recommendations to user:

"Here are my recommendations for how this spike plan integrates with your game development process:

{Show recommendations}

Would you like to:
- Adjust any recommendations?
- Add specific notes?
- Modify the sprint allocation suggestions?
- Add platform-specific guidance?"

### 6. Finalize Document

**Update Executive Summary section** with generated summary.

**Update Recommendations section** with:
- Epic Integration
- Sprint Allocation
- Risk Mitigation Notes
- Platform-Specific Considerations

**Update frontmatter:**
- `status: 'complete'`
- Add 7 to `stepsCompleted` array

### 7. Final Summary

"**Spike Plan Complete!**

**Document Location:** `{planning_artifacts}/spike-plan.md`

**Summary:**
- High-risk components addressed: {count}
- Spikes defined: {count}
- Integration phases: {count}
- Success criteria: {count}
- Frame budget allocated: {total}ms / {frame_budget}ms

**Next Steps:**
1. Review the complete spike plan document
2. Begin Phase 0 spikes (no dependencies)
3. Validate frame budget at each integration milestone
4. Use spike results to inform epic planning
5. Reference spike plan during code reviews

**Downstream Workflows:**
- Run `create-epics-and-stories` to incorporate spike results into epics
- Reference spike plan in sprint planning
- Update architecture as spikes retire risks
- Use spike learnings in future game projects

Thank you for completing the Technical Spike Planning workflow!

[V] View complete spike plan
[E] Export summary for team
[D] Done - exit workflow

## SUCCESS METRICS:

- Validation checklist passed (or issues addressed)
- Executive summary captures key information including frame budget
- Recommendations are actionable and game-specific
- Platform considerations documented
- User approved final document
- Document status updated to 'complete'
- Frontmatter fully updated

## FAILURE MODES:

- Skipping validation checklist
- Vague or generic recommendations
- Missing game-specific guidance (frame budget, platforms)
- Not getting user approval on final document
- Not updating status to complete
- Not providing clear next steps

## WORKFLOW COMPLETE

This is the final step of the Spike Planning workflow. The spike plan document is now complete and ready to inform downstream workflows and game development.
