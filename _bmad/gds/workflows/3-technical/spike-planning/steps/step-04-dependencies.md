# Step 4: Dependency Mapping (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ALWAYS treat this as collaborative discovery between technical peers
- YOU ARE A FACILITATOR - propose dependencies, let user validate
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Spikes have been defined in step-03 with game-specific patterns
- CPU-first patterns create natural dependencies (CPU before GPU)
- Focus ONLY on mapping dependencies between spikes
- Do not define success criteria here (that's step-05)

## YOUR TASK:

Map dependencies between spikes to understand which spikes must complete before others can begin. Pay attention to CPU-first patterns and frame budget aggregation.

## EXECUTION SEQUENCE:

### 1. Retrieve Spike List

From the spike plan document, get the list of all defined spikes with their:
- Name
- What they test
- Risk they address
- Spike pattern used (CPU-first, GPU port, etc.)

### 2. Identify Dependency Types

Consider these dependency relationships:

**Technical Prerequisite:**
Spike B literally cannot run without output from Spike A
- Example: GPU port cannot happen before CPU implementation exists
- Example: Mesh generation needs noise generation working

**Knowledge Transfer:**
Understanding from Spike A significantly informs design of Spike B
- Example: Performance baseline informs optimization approach
- Example: Algorithm spike informs LOD spike

**Shared Foundation:**
Multiple spikes build on the same validated component
- Example: Both rendering and physics spikes need mesh generation

**Integration Point:**
Spike validates the combination of prior spikes
- Example: Full terrain spike combines noise + mesh + octree

### 3. Identify CPU-First Dependencies

For spikes using the CPU-first pattern, explicitly note:
- CPU spike must complete before GPU spike
- These are hard dependencies (not optional)

### 4. Analyze Each Spike Pair

For each spike, determine:
- What other spikes must complete first? (hard dependencies)
- What other spikes would be helpful to complete first? (soft dependencies)
- Can this spike run in parallel with others? (no dependencies)

### 5. Present Dependency Analysis to User

Present findings:

"I've analyzed the dependencies between spikes:

**Dependency Analysis:**

| Spike | Depends On | Dependency Type | Can Start Now? |
|-------|------------|-----------------|----------------|
| {spike_name} | {deps or "None"} | {type} | {Yes/No} |

**CPU-First Dependencies (Hard):**
{list of CPU->GPU spike pairs}

**Independent Spikes (can start immediately):**
{list of spikes with no dependencies}

**Dependent Spikes:**
{list showing spike -> dependency relationships}

**Proposed Dependency Graph:**
```
[Spike 1: CPU Marching Cubes]
       |
       v
[Spike 2: GPU Marching Cubes] ----+
       |                          |
       v                          |
[Spike 3: Noise Generation]       |
       |                          |
       v                          v
[Spike 4: Noise + GPU MC] <-------+
       |
       v
[Spike 5: Octree Structure]
       |
       v
[Spike 6: Full Integration]
```

Does this dependency mapping look correct? Would you like to:
- Add a dependency I missed?
- Remove an unnecessary dependency?
- Clarify a dependency type?

### 6. Validate No Cycles

Check that the dependency graph has no cycles:
- A cycle means Spike A depends on B, B depends on C, C depends on A
- This is invalid - highlight and work with user to resolve

If cycle detected:
"I've detected a circular dependency: {A} -> {B} -> {C} -> {A}
This needs to be resolved. Can we:
- Remove one of these dependencies?
- Combine spikes to eliminate the cycle?
- Re-scope a spike to break the cycle?"

### 7. Identify Parallel Opportunities

Highlight spikes that can run in parallel:
- Same "depth" in dependency graph
- No mutual dependencies
- Could be worked on simultaneously

### 8. Consider Frame Budget Aggregation

Note where spikes will combine and impact frame budget:
"When these spikes combine in integration:
- Spike A: ~Xms
- Spike B: ~Yms
- Combined: Need to validate total < {frame_budget}ms"

### 9. Update Document

Update each spike's Dependencies section:

```markdown
**Dependencies:**
- Spike {N}: {Name} (Technical Prerequisite - CPU-first)
- Spike {M}: {Name} (Knowledge Transfer)

_or_

**Dependencies:**
- None (can start immediately)
```

Update the Dependency Graph section with ASCII art.

**Update frontmatter:**
- Add 4 to `stepsCompleted` array

### 10. Present Summary and Menu

"Dependency mapping complete!

**Summary:**
- Total spikes: {count}
- Independent spikes (can start now): {count}
- CPU-first pairs: {count}
- Maximum dependency depth: {count}
- Parallelization opportunities: {description}

**Execution Layers:**
- Layer 0 (start immediately): {spike names}
- Layer 1 (after Layer 0): {spike names}
- Layer 2 (after Layer 1): {spike names}
...

**Frame Budget Checkpoints:**
- After Layer {N}: Validate combined budget for {spikes}

Next we'll define measurable success criteria for each spike.

[C] Continue to success criteria
[R] Review/revise dependencies

## SUCCESS METRICS:

- Every spike has dependencies explicitly stated (even if "None")
- CPU-first dependencies correctly identified
- No circular dependencies in the graph
- Parallel opportunities identified
- Frame budget aggregation points noted
- User validated dependency mapping
- Document updated with dependencies and graph
- Frontmatter updated with stepsCompleted

## FAILURE MODES:

- Missing CPU-first dependencies
- Placing spike before its dependencies
- Allowing circular dependencies
- Not identifying parallelization opportunities
- Not noting frame budget checkpoints
- Not getting user validation
- Not updating document and frontmatter

## NEXT STEP:

After user selects [C], load `./step-05-success-criteria.md` to define measurable success criteria for each spike.

Remember: Do NOT proceed until user explicitly selects [C]!
