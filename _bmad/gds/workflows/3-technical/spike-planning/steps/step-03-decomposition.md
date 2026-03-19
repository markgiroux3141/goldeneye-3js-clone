# Step 3: Spike Decomposition (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ALWAYS treat this as collaborative discovery between technical peers
- YOU ARE A FACILITATOR - propose spike designs, let user refine
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Risk analysis is complete - you have the list of high-risk components
- You have access to `{data_files_path}/spike-patterns.yaml` for game-specific spike design patterns
- You have access to `{data_files_path}/visualization-catalog.yaml` for debug visualization approaches
- Game engine has been identified: {game_engine}
- Focus ONLY on decomposition - dependencies come in step-04, success criteria in step-05

## YOUR TASK:

Break each high-risk component into one or more isolated, testable spike experiments using game-specific patterns and visualization approaches.

## EXECUTION SEQUENCE:

### 1. Load Spike Patterns and Visualization Catalog

Load `{data_files_path}/spike-patterns.yaml` to understand:
- Game-specific spike patterns (CPU-first, GPU port, procedural generation, spatial structures)
- Isolation approaches
- Typical validations
- Visualization approaches per pattern

Load `{data_files_path}/visualization-catalog.yaml` to understand:
- Engine-specific debugging approaches ({game_engine})
- Gizmo/debug draw methods
- Profiler integration
- Frame debugger usage

### 2. Review High-Risk Components

From the spike plan document, retrieve the list of high-risk components identified in step-02.

### 3. Design Spikes for Each Component

For each high-risk component, propose spike design(s):

**Spike Design Principles (Game Dev):**
1. **Isolation** - Each spike tests ONE technical question
2. **Minimalism** - Simplest possible implementation (simple shapes, hardcoded data)
3. **Independence** - Can run without full game context
4. **Measurability** - Has objective pass/fail criteria (including frame budget)
5. **Visualizability** - Can debug visually using engine tools

**For each component, determine:**
- Does it need one spike or multiple (CPU-first then GPU, etc.)?
- Which game-specific spike pattern(s) apply?
- What is the minimal scope to validate?
- How will it be isolated from the full game?
- **What visualization/debugging approach will be used?**

### 4. Present Spike Proposals to User

Present each proposed spike:

"For the high-risk components identified, I propose the following spikes:

---

**Component: {component_name}**
Risk: {risk_category} (Severity: {severity})
Frame Impact: {High/Medium/Low}

**Proposed Spike(s):**

### Spike {N}: {Spike Name}

**What to Test in Isolation:**
{description of minimal test scope}
- Use simple test data: {sphere SDF, basic mesh, etc.}
- Single instance/chunk initially

**Spike Pattern:** {pattern from spike-patterns.yaml}

**Isolation Approach:**
{how this will be isolated - test scene, editor script, minimal project}

**Validation Approach:**
{general approach - specific criteria in step-05}

**Debugging/Visualization ({game_engine}):**
{from visualization-catalog.yaml}
- {Specific gizmo/debug draw methods}
- {Profiler integration approach}
- {Visual inspection method}

**Estimated Complexity:** {Small/Medium/Large}

---

Does this spike design make sense for validating the risk? Would you like to:
- Adjust the scope (broader/narrower)?
- Change the isolation approach?
- Use different visualization tools?
- Split into multiple smaller spikes?
- Combine with another spike?

### 5. Apply CPU-First Pattern Where Appropriate

For GPU/compute shader work, recommend the CPU-first pattern:

"For {component}, I recommend the CPU-first approach:

**Spike A: CPU Implementation**
- Validate correctness first
- Easy to debug
- Establish baseline behavior

**Spike B: GPU Port** (depends on A)
- Port to compute shader
- Validate output matches CPU
- Measure frame budget impact

This allows validating correctness before fighting GPU debugging."

### 6. Collaborative Refinement

For each spike, work with user to refine:
- Scope - is it minimal enough? Too minimal?
- Isolation - can this truly run without the full game?
- Pattern - does another pattern fit better?
- Visualization - will this debugging approach work?
- Naming - does the name clearly communicate intent?

### 7. Update Document

For each confirmed spike, add to the Spike Definitions section:

```markdown
### Spike {N}: {Name}

**Risk Addressed:** {which risk this spike validates}

**What to Test in Isolation:**
{minimal scope description}

**Success Criteria:**
_To be defined in Step 5_

**Dependencies:**
_To be defined in Step 4_

**Validation Approach:**
{validation approach}

**Debugging/Visualization Approach:**
{engine-specific debugging approach from visualization-catalog}

**Estimated Complexity:** {Small/Medium/Large}

---
```

**Update frontmatter:**
- `total_spikes: {count}`
- Add 3 to `stepsCompleted` array

### 8. Present Summary and Menu

"Spike decomposition complete!

**Summary:**
- High-risk components addressed: {count}
- Total spikes defined: {count}
- Complexity breakdown: {X small, Y medium, Z large}

**Spike Patterns Used:**
- CPU-first + GPU port: {count}
- Procedural generation: {count}
- Spatial structure: {count}
- Other: {count}

**Spikes defined:**
{numbered list of spike names}

Next we'll map dependencies between spikes to determine execution order.

[C] Continue to dependency mapping
[R] Review/revise spike definitions

## SUCCESS METRICS:

- Every high-risk component has at least one spike
- Each spike follows the isolation principle
- CPU-first pattern applied where appropriate
- Game-specific spike patterns applied
- Visualization approaches specified for each spike
- User validated each spike design
- Document updated with spike definitions
- Frontmatter updated with total_spikes and stepsCompleted

## FAILURE MODES:

- Creating spikes that are too large or not isolated
- Missing a high-risk component
- Not applying CPU-first pattern for GPU work
- Not specifying visualization approaches
- Not getting user validation on spike designs
- Defining success criteria here (that's step-05)
- Defining dependencies here (that's step-04)
- Not updating document and frontmatter

## NEXT STEP:

After user selects [C], load `./step-04-dependencies.md` to map dependencies between spikes.

Remember: Do NOT proceed until user explicitly selects [C]!
