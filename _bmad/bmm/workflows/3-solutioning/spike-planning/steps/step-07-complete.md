# Step 7: Finalization and Recommendations

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- ALWAYS treat this as collaborative completion with technical peers
- YOU ARE A FACILITATOR - present recommendations, finalize together
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- All spikes defined with dependencies, criteria, and roadmap
- Focus on validation, recommendations, and finalization
- This is the final step - document should be complete

## YOUR TASK:

Validate the spike plan for completeness, generate recommendations for downstream workflows, and finalize the document.

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

**Coverage Check:**
- [ ] Novelty risks covered
- [ ] Integration risks covered
- [ ] Performance risks covered
- [ ] Complexity risks covered
- [ ] Other identified risks covered

### 2. Report Validation Results

"**Spike Plan Validation:**

Completeness: {PASS/ISSUES}
{list any issues found}

Quality: {PASS/ISSUES}
{list any issues found}

Coverage: {PASS/ISSUES}
{list any risks not covered}

{If issues:}
Would you like to address these issues before finalizing?

{If no issues:}
The spike plan passes all validation checks!

### 3. Generate Executive Summary

Create summary for the Executive Summary section:

"This spike plan addresses {N} high-risk technical components identified in the architecture through {M} isolated proof-of-concept experiments.

**Key Risks Addressed:**
- {Risk 1}: Validated by Spike {N}
- {Risk 2}: Validated by Spikes {M, O}
...

**Execution Overview:**
- {X} phases of execution
- {Y} integration milestones
- {Z} opportunities for parallel execution

**Critical Path:**
{List the spikes on the critical path}

Upon successful completion of all spikes, the following technical risks will be retired: {list}."

### 4. Generate Recommendations

**Epic Integration Recommendations:**

"The spikes in this plan should integrate with epic/story planning as follows:

**Sprint 0 Candidates:**
These spikes should be completed before main development begins:
- Spike {N}: {Name} - {why critical}
- Spike {M}: {Name} - {why critical}

**Story Prerequisites:**
The following stories should not begin until these spikes complete:
- {Story type/area} requires Spike {N} results
- {Story type/area} requires Spike {M} results

**Risk Retirement:**
As spikes complete, mark these risks as retired in the architecture:
- {Risk} retired after Spike {N}
- {Risk} retired after Spikes {M, O}"

**Sprint Allocation Recommendations:**

"Suggested sprint placement for spikes:

**Pre-Sprint (Sprint 0):**
{List spikes that should complete before sprints begin}

**Sprint 1:**
{List spikes that could run parallel to early stories}

**As Needed:**
{List spikes that can wait until specific features are approached}"

**Risk Mitigation Notes:**

"Additional notes on managing identified risks:

**If Spike Fails:**
For each critical spike, what's the fallback?
- Spike {N} fails: {fallback approach}
- Spike {M} fails: {fallback approach}

**Monitoring During Spikes:**
- Track time spent vs. progress
- Escalate early if spike is taking longer than expected
- Document learnings even if spike partially succeeds"

### 5. User Review of Recommendations

Present recommendations to user:

"Here are my recommendations for how this spike plan integrates with your development process:

{Show recommendations}

Would you like to:
- Adjust any recommendations?
- Add specific notes?
- Modify the sprint allocation suggestions?"

### 6. Finalize Document

**Update Executive Summary section** with generated summary.

**Update Recommendations section** with:
- Epic Integration
- Sprint Allocation
- Risk Mitigation Notes

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

**Next Steps:**
1. Review the complete spike plan document
2. Begin Phase 0 spikes (no dependencies)
3. Use spike results to inform epic planning
4. Reference spike plan during architecture reviews

**Downstream Workflows:**
- Run `create-epics-and-stories` to incorporate spike results into epics
- Reference spike plan in sprint planning
- Update architecture as spikes retire risks

Thank you for completing the Technical Spike Planning workflow!

[V] View complete spike plan
[E] Export summary for team
[D] Done - exit workflow

## SUCCESS METRICS:

- Validation checklist passed (or issues addressed)
- Executive summary captures key information
- Recommendations are actionable and specific
- User approved final document
- Document status updated to 'complete'
- Frontmatter fully updated

## FAILURE MODES:

- Skipping validation checklist
- Vague or generic recommendations
- Not getting user approval on final document
- Not updating status to complete
- Not providing clear next steps

## WORKFLOW COMPLETE

This is the final step of the Spike Planning workflow. The spike plan document is now complete and ready to inform downstream workflows.
