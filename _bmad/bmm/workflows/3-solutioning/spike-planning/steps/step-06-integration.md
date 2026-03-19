# Step 6: Integration Roadmap

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
- Focus ONLY on creating the execution roadmap
- Use dependency graph to determine valid orderings

## YOUR TASK:

Generate a phased integration roadmap that respects dependencies and identifies integration milestones.

## EXECUTION SEQUENCE:

### 1. Analyze Dependency Graph

From the spike plan document, extract:
- All spikes with their dependencies
- The dependency graph structure
- Independent spikes (no dependencies)

### 2. Generate Execution Phases

Using topological sort principles, organize spikes into phases:

**Phase 0: Foundation**
- Spikes with no dependencies
- Can all be started immediately
- May run in parallel

**Phase 1, 2, 3...: Progressive**
- Spikes whose dependencies are satisfied by previous phases
- Group by dependency depth

**Integration Milestones:**
- Points where validated spikes combine
- Natural checkpoints in the roadmap

### 3. Identify Integration Points

For each phase transition, identify:
- What validated capabilities exist after this phase
- What new integrations become possible
- Any intermediate validation that should happen

### 4. Present Roadmap to User

"Based on the dependency analysis, here's the proposed integration roadmap:

---

## Integration Roadmap

### Phase 0: Foundation Spikes
_These spikes have no dependencies and can start immediately_

- [ ] Spike {N}: {Name}
  - Validates: {risk}
  - Complexity: {size}
- [ ] Spike {M}: {Name}
  - Validates: {risk}
  - Complexity: {size}

**Parallelization:** {Can these run in parallel? By whom?}

---

### Phase 1: {Phase Name}
_Requires: Phase 0 complete_

- [ ] Spike {X}: {Name}
  - Depends on: Spike {N}
  - Validates: {risk}

**Integration Milestone A:** {What capability is proven after Phase 1?}

---

### Phase 2: {Phase Name}
_Requires: Phase 1 complete_

- [ ] Spike {Y}: {Name}
  - Depends on: Spikes {X}, {N}
  - Validates: {risk}

**Integration Milestone B:** {What capability is proven after Phase 2?}

---

### Final Phase: Full Integration
_Requires: All previous phases_

- [ ] Integration validation
  - Combine all validated spikes
  - Verify end-to-end behavior

---

Does this roadmap make sense? Would you like to:
- Reorder any phases?
- Adjust integration milestones?
- Add checkpoint validations?

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

### 6. Define Integration Milestones

For each milestone, specify:
- What has been validated at this point
- What new risks are retired
- What capabilities are now proven

### 7. Update Document

Populate the Integration Roadmap section:

```markdown
## Integration Roadmap

### Phase 0: Foundation Spikes
- [ ] Spike 1: {Name}
- [ ] Spike 2: {Name}

### Phase 1: {Phase Name}
- [ ] Spike 3: {Name}

**Integration Milestone A:** {description}

### Phase 2: {Phase Name}
- [ ] Spike 4: {Name}

**Integration Milestone B:** {description}

### Final Phase: Full Integration
- [ ] Verify end-to-end system behavior
```

**Update frontmatter:**
- Add 6 to `stepsCompleted` array

### 8. Present Summary and Menu

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

Next we'll finalize the spike plan and generate recommendations.

[C] Continue to finalization
[R] Review/revise roadmap

## SUCCESS METRICS:

- All spikes placed in appropriate phases
- Dependencies respected (no spike before its dependencies)
- Integration milestones clearly defined
- Parallelization opportunities identified
- User validated the roadmap
- Document updated with full roadmap
- Frontmatter updated with stepsCompleted

## FAILURE MODES:

- Placing spike before its dependencies
- Missing integration milestones
- Not identifying parallelization opportunities
- Not getting user validation
- Not updating document and frontmatter

## NEXT STEP:

After user selects [C], load `./step-07-complete.md` to finalize and generate recommendations.

Remember: Do NOT proceed until user explicitly selects [C]!
