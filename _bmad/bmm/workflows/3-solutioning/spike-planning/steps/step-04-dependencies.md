# Step 4: Dependency Mapping

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ALWAYS treat this as collaborative discovery between technical peers
- YOU ARE A FACILITATOR - propose dependencies, let user validate
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Spikes have been defined in step-03
- Focus ONLY on mapping dependencies between spikes
- Do not define success criteria here (that's step-05)

## YOUR TASK:

Map dependencies between spikes to understand which spikes must complete before others can begin.

## EXECUTION SEQUENCE:

### 1. Retrieve Spike List

From the spike plan document, get the list of all defined spikes with their:
- Name
- What they test
- Risk they address

### 2. Identify Dependency Types

Consider these dependency relationships:

**Technical Prerequisite:**
Spike B literally cannot run without output from Spike A
- Example: GPU port cannot happen before CPU implementation exists

**Knowledge Transfer:**
Understanding from Spike A significantly informs design of Spike B
- Example: Performance baseline informs optimization approach

**Shared Foundation:**
Multiple spikes build on the same validated component
- Example: Both API integration spikes need auth spike first

**Integration Point:**
Spike validates the combination of prior spikes
- Example: Integration spike combines two subsystems

### 3. Analyze Each Spike Pair

For each spike, determine:
- What other spikes must complete first? (hard dependencies)
- What other spikes would be helpful to complete first? (soft dependencies)
- Can this spike run in parallel with others? (no dependencies)

### 4. Present Dependency Analysis to User

Present findings:

"I've analyzed the dependencies between spikes:

**Dependency Analysis:**

| Spike | Depends On | Dependency Type | Can Start Immediately? |
|-------|------------|-----------------|------------------------|
| {spike_name} | {deps or "None"} | {type} | {Yes/No} |

**Independent Spikes (can start immediately):**
{list of spikes with no dependencies}

**Dependent Spikes:**
{list showing spike -> dependency relationships}

**Proposed Dependency Graph:**
```
[Spike 1: {name}]
       |
       v
[Spike 2: {name}] ----+
       |              |
       v              |
[Spike 3: {name}]     |
       |              |
       v              v
[Spike 4: {name}] <---+
```

Does this dependency mapping look correct? Would you like to:
- Add a dependency I missed?
- Remove an unnecessary dependency?
- Clarify a dependency type?

### 5. Validate No Cycles

Check that the dependency graph has no cycles:
- A cycle means Spike A depends on B, B depends on C, C depends on A
- This is invalid - highlight and work with user to resolve

If cycle detected:
"I've detected a circular dependency: {A} -> {B} -> {C} -> {A}
This needs to be resolved. Can we:
- Remove one of these dependencies?
- Combine spikes to eliminate the cycle?
- Re-scope a spike to break the cycle?"

### 6. Identify Parallel Opportunities

Highlight spikes that can run in parallel:
- Same "depth" in dependency graph
- No mutual dependencies
- Could be worked on simultaneously by different people

### 7. Update Document

Update each spike's Dependencies section:

```markdown
**Dependencies:**
- Spike {N}: {Name} (Technical Prerequisite)
- Spike {M}: {Name} (Knowledge Transfer)

_or_

**Dependencies:**
- None (can start immediately)
```

Update the Dependency Graph section with ASCII art.

**Update frontmatter:**
- Add 4 to `stepsCompleted` array

### 8. Present Summary and Menu

"Dependency mapping complete!

**Summary:**
- Total spikes: {count}
- Independent spikes (can start now): {count}
- Maximum dependency depth: {count}
- Parallelization opportunities: {description}

**Execution Layers:**
- Layer 0 (start immediately): {spike names}
- Layer 1 (after Layer 0): {spike names}
- Layer 2 (after Layer 1): {spike names}
...

Next we'll define measurable success criteria for each spike.

[C] Continue to success criteria
[R] Review/revise dependencies

## SUCCESS METRICS:

- Every spike has dependencies explicitly stated (even if "None")
- No circular dependencies in the graph
- Parallel opportunities identified
- User validated dependency mapping
- Document updated with dependencies and graph
- Frontmatter updated with stepsCompleted

## FAILURE MODES:

- Missing dependencies that exist
- Creating false dependencies
- Allowing circular dependencies
- Not identifying parallel opportunities
- Not getting user validation
- Not updating document and frontmatter

## NEXT STEP:

After user selects [C], load `./step-05-success-criteria.md` to define measurable success criteria for each spike.

Remember: Do NOT proceed until user explicitly selects [C]!
