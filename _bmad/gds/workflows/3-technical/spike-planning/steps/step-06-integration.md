# Step 6: Integration Roadmap (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ALWAYS treat this as collaborative discovery between technical peers
- YOU ARE A FACILITATOR - propose the roadmap, let user adjust
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Spikes are defined with dependencies and success criteria
- Frame budget criteria established for performance-critical spikes
- Focus ONLY on creating the execution roadmap
- Use dependency graph to determine valid orderings

## YOUR TASK:

Generate a phased integration roadmap that respects dependencies, includes frame budget checkpoints, and identifies integration milestones.

## EXECUTION SEQUENCE:

### 1. Analyze Dependency Graph

From the spike plan document, extract:
- All spikes with their dependencies
- The dependency graph structure
- Independent spikes (no dependencies)
- CPU-first pairs

### 2. Generate Execution Phases

Using topological sort principles, organize spikes into phases:

**Phase 0: Foundation**
- Spikes with no dependencies
- Can all be started immediately
- May run in parallel

**Phase 1, 2, 3...: Progressive**
- Spikes whose dependencies are satisfied by previous phases
- Group by dependency depth
- Note CPU-first pairs (CPU in one phase, GPU in next)

**Integration Milestones:**
- Points where validated spikes combine
- Natural checkpoints in the roadmap
- **Frame budget checkpoints** - validate combined performance

### 3. Identify Integration Points with Frame Budget

For each phase transition, identify:
- What validated capabilities exist after this phase
- What new integrations become possible
- **Combined frame budget impact**

### 4. Present Roadmap to User

"Based on the dependency analysis, here's the proposed integration roadmap:

---

## Integration Roadmap

### Phase 0: Foundation Spikes
_These spikes have no dependencies and can start immediately_

- [ ] Spike {N}: {Name}
  - Validates: {risk}
  - Frame budget: {X}ms
  - Complexity: {size}
- [ ] Spike {M}: {Name}
  - Validates: {risk}
  - Frame budget: {Y}ms
  - Complexity: {size}

**Parallelization:** {Can these run in parallel? By whom?}
**Phase 0 Frame Budget:** {sum}ms allocated

---

### Phase 1: {Phase Name}
_Requires: Phase 0 complete_

- [ ] Spike {X}: {Name}
  - Depends on: Spike {N} (CPU-first)
  - Validates: {risk}
  - Frame budget: {Z}ms

**Integration Milestone A:** {What capability is proven after Phase 1?}
**Frame Budget Check:** Phase 0 + Phase 1 = {total}ms

---

### Phase 2: {Phase Name}
_Requires: Phase 1 complete_

- [ ] Spike {Y}: {Name}
  - Depends on: Spikes {X}, {N}
  - Validates: {risk}
  - Frame budget: {W}ms

**Integration Milestone B:** {What capability is proven after Phase 2?}
**Frame Budget Check:** Cumulative = {total}ms / {frame_budget}ms available

---

### Final Phase: Full Integration
_Requires: All previous phases_

- [ ] Integration validation
  - Combine all validated spikes
  - Verify end-to-end behavior
  - **Full frame budget validation**

**Final Frame Budget:** {total}ms / {frame_budget}ms available

---

Does this roadmap make sense? Would you like to:
- Reorder any phases?
- Adjust integration milestones?
- Add frame budget checkpoints?

### 5. Discuss Parallelization

Highlight opportunities for parallel execution:

"**Parallelization opportunities:**
- Phase 0 spikes {A, B, C} can all run simultaneously
- In Phase 1, spikes {D, E} are independent and can parallelize
- Phase 2 has a single spike on the critical path

This means:
- With 1 person: linear execution through phases
- With 2 people: can parallelize within Phase 0 and 1
- Critical path goes through: {list of critical path spikes}"

### 6. Define Integration Milestones with Frame Budget

For each milestone, specify:
- What has been validated at this point
- What new risks are retired
- What capabilities are now proven
- **What is the cumulative frame budget impact**

Example:
"**Integration Milestone A: GPU Mesh Generation Working**
- Validated: CPU algorithm correct, GPU matches CPU, meets frame budget
- Risks retired: Marching cubes correctness, GPU performance
- Capability proven: Can generate meshes in real-time
- Frame budget used: 4ms (leaving {remaining}ms for other systems)"

### 7. Frame Budget Summary

Provide overall frame budget picture:

"**Frame Budget Summary:**

| Phase | Spike | Budget | Cumulative |
|-------|-------|--------|------------|
| 0 | {A} | {X}ms | {X}ms |
| 0 | {B} | {Y}ms | {X+Y}ms |
| 1 | {C} | {Z}ms | {X+Y+Z}ms |
| ... | ... | ... | ... |
| **Total** | | | **{total}ms** |

**Available:** {frame_budget}ms
**Allocated:** {total}ms
**Headroom:** {frame_budget - total}ms

{If headroom is low:}
⚠️ Headroom is tight - integration validation should carefully measure combined performance.

{If headroom is comfortable:}
✅ Good headroom for other game systems."

### 8. Update Document

Populate the Integration Roadmap section:

```markdown
## Integration Roadmap

### Phase 0: Foundation Spikes
- [ ] Spike 1: {Name} ({X}ms)
- [ ] Spike 2: {Name} ({Y}ms)

### Phase 1: {Phase Name}
- [ ] Spike 3: {Name} ({Z}ms)

**Integration Milestone A:** {description}
**Frame Budget Check:** {cumulative}ms / {total}ms

### Phase 2: {Phase Name}
- [ ] Spike 4: {Name} ({W}ms)

**Integration Milestone B:** {description}
**Frame Budget Check:** {cumulative}ms / {total}ms

### Final Phase: Full Integration
- [ ] Verify end-to-end system behavior
- [ ] Full frame budget validation

**Total Frame Budget:** {total}ms / {frame_budget}ms
```

**Update frontmatter:**
- Add 6 to `stepsCompleted` array

### 9. Present Summary and Menu

"Integration roadmap complete!

**Summary:**
- Total phases: {count}
- Integration milestones: {count}
- Critical path length: {count} spikes
- Parallelization potential: {description}

**Phase Overview:**
- Phase 0: {count} spikes (foundation)
- Phase 1: {count} spikes
- Phase 2: {count} spikes
...
- Final: Integration validation

**Frame Budget:**
- Total allocated: {total}ms
- Available: {frame_budget}ms
- Headroom: {remaining}ms

Next we'll finalize the spike plan and generate recommendations.

[C] Continue to finalization
[R] Review/revise roadmap

## SUCCESS METRICS:

- All spikes placed in appropriate phases
- Dependencies respected (no spike before its dependencies)
- Integration milestones clearly defined
- Frame budget checkpoints included
- Cumulative frame budget calculated
- Parallelization opportunities identified
- User validated the roadmap
- Document updated with full roadmap
- Frontmatter updated with stepsCompleted

## FAILURE MODES:

- Placing spike before its dependencies
- Missing integration milestones
- Not including frame budget in roadmap
- Not identifying parallelization opportunities
- Frame budget exceeds available budget without warning
- Not getting user validation
- Not updating document and frontmatter

## NEXT STEP:

After user selects [C], load `./step-07-complete.md` to finalize and generate recommendations.

Remember: Do NOT proceed until user explicitly selects [C]!
