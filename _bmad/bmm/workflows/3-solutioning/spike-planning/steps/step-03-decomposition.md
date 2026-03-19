# Step 3: Spike Decomposition

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
- You have access to `{data_files_path}/spike-patterns.yaml` for spike design patterns
- Focus ONLY on decomposition - dependencies come in step-04, success criteria in step-05

## YOUR TASK:

Break each high-risk component into one or more isolated, testable spike experiments.

## EXECUTION SEQUENCE:

### 1. Load Spike Patterns

Load `{data_files_path}/spike-patterns.yaml` to understand:
- Common spike patterns and when to use them
- Isolation approaches
- Typical validations
- Complexity guidance

### 2. Review High-Risk Components

From the spike plan document, retrieve the list of high-risk components identified in step-02.

### 3. Design Spikes for Each Component

For each high-risk component, propose spike design(s):

**Spike Design Principles:**
1. **Isolation** - Each spike tests ONE technical question
2. **Minimalism** - Simplest possible implementation to validate
3. **Independence** - Can run without full system context
4. **Measurability** - Has objective pass/fail criteria (detailed in step-05)

**For each component, determine:**
- Does it need one spike or multiple?
- Which spike pattern(s) apply?
- What is the minimal scope to validate?
- How will it be isolated from the full system?

### 4. Present Spike Proposals to User

Present each proposed spike:

"For the high-risk components identified, I propose the following spikes:

---

**Component: {component_name}**
Risk: {risk_category} (Severity: {severity})

**Proposed Spike(s):**

### Spike {N}: {Spike Name}

**What to Test in Isolation:**
{description of minimal test scope}

**Spike Pattern:** {pattern from spike-patterns.yaml}

**Isolation Approach:**
{how this will be isolated - standalone script, test harness, minimal app, etc.}

**Validation Approach:**
{general approach - specific criteria in step-05}

**Estimated Complexity:** {Small/Medium/Large}

---

Does this spike design make sense for validating the risk? Would you like to:
- Adjust the scope (broader/narrower)?
- Change the isolation approach?
- Split into multiple smaller spikes?
- Combine with another spike?

### 5. Collaborative Refinement

For each spike, work with user to refine:
- Scope - is it minimal enough? Too minimal?
- Isolation - is this truly independent?
- Pattern - does another pattern fit better?
- Naming - does the name clearly communicate intent?

### 6. Handle Complex Components

For components that need multiple spikes:
- Identify the natural breakdown points
- Ensure each spike is independently valuable
- Note the logical sequence (formal dependencies in step-04)

Example: GPU Algorithm
- Spike A: Implement on CPU first (validate correctness)
- Spike B: Port to GPU (validate performance)
- Spike C: Optimize GPU version (validate optimization)

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

**Spikes defined:**
{numbered list of spike names}

Next we'll map dependencies between spikes to determine execution order.

[C] Continue to dependency mapping
[R] Review/revise spike definitions

## SUCCESS METRICS:

- Every high-risk component has at least one spike
- Each spike follows the isolation principle
- Spike patterns applied appropriately
- User validated each spike design
- Document updated with spike definitions
- Frontmatter updated with total_spikes and stepsCompleted

## FAILURE MODES:

- Creating spikes that are too large or not isolated
- Missing a high-risk component
- Not getting user validation on spike designs
- Defining success criteria here (that's step-05)
- Defining dependencies here (that's step-04)
- Not updating document and frontmatter

## NEXT STEP:

After user selects [C], load `./step-04-dependencies.md` to map dependencies between spikes.

Remember: Do NOT proceed until user explicitly selects [C]!
