# Step 1: Initialize & Select Spike (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ALWAYS treat this as collaborative exploration between technical peers
- YOU ARE A FACILITATOR helping validate game technical risks
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Variables from workflow.md are available in memory
- This step discovers spike-plan.md and lets user select a spike
- Do not execute any spike code in this step

## YOUR TASK:

Load the spike plan document, extract game context (engine, frame budget), present available spikes with their status, and let the user select which spike to execute.

## EXECUTION SEQUENCE:

### 1. Discover Spike Plan

Search for spike plan in these locations:
- `{planning_artifacts}/*spike-plan*.md`
- `{output_folder}/*spike-plan*.md`

If not found:
"No spike plan found. Please run the spike-planning workflow first to create a spike plan, or provide the path to your spike-plan.md file."

If found, load the complete file.

### 2. Extract Game Context

From spike-plan.md frontmatter, extract:
- `game_engine` (unity/unreal/godot)
- `target_fps` (typically 60 or 30)
- `target_platforms`

Calculate frame budget:
- 60fps → 16.67ms
- 30fps → 33.33ms

### 3. Check for In-Progress Spikes

Check frontmatter for `spikes_in_progress` array:
- If not empty, load `./step-01b-continue.md` to handle continuation
- If empty, proceed with fresh spike selection

### 4. Parse Spike Definitions

Extract from spike-plan.md:
- All spike definitions from "## Spike Definitions" section
- Integration Roadmap checkboxes for completion status
- Dependency information for each spike
- Frame impact ratings (High/Medium/Low)

### 5. Present Available Spikes

Present spikes with game-specific context:

"**Game Context:**
- Engine: {game_engine}
- Target: {target_fps}fps ({frame_budget}ms budget)
- Platforms: {target_platforms}

**Available Spikes:**

| # | Status | Spike Name | Frame Impact | Dependencies | Severity |
|---|--------|------------|--------------|--------------|----------|
| 1 | [ ] | {name} | High | None | {severity} |
| 2 | [ ] | {name} | Medium | Spike 1 | {severity} |
| 3 | [x] | {name} | Low | None | Completed |

**Legend:**
- [ ] = Pending
- [~] = In Progress
- [x] = Completed
- Frame Impact: High = needs careful budget validation

Which spike would you like to execute? Enter number or name:"

### 6. Validate Selection

When user selects a spike:

**Check dependencies:**
- If spike has dependencies, verify they are completed
- If dependencies not met:
  "Spike {N} depends on: {dependency list}
   These spikes are not yet complete.

   [P] Proceed anyway (not recommended)
   [S] Select different spike"

**Load spike definition:**
- Extract full spike definition including:
  - What to test in isolation
  - Success criteria (as array)
  - Dependencies
  - Validation approach
  - **Debugging/Visualization approach** (GDS-specific)
  - Estimated complexity

### 7. Set State Variables

Set these state variables for subsequent steps:
```yaml
spike_plan_path: "{discovered_path}"
selected_spike_id: "{spike_number}"
spike_name: "{spike_name}"
spike_definition: "{full_definition_text}"
spike_success_criteria:
  - "{criterion_1}"
  - "{criterion_2}"
  - ...
game_engine: "{engine}"
target_fps: {fps}
frame_budget_ms: {budget}
```

### 8. Confirm Selection

"**Selected Spike: {spike_name}**

**Game Context:**
- Engine: {game_engine}
- Frame budget: {frame_budget_ms}ms

**What to Test:**
{what_to_test}

**Success Criteria:**
{list criteria - highlight any frame budget criteria}

**Dependencies:** {deps or "None"}

**Validation Approach:** {approach}

**Debug Visualization:** {visualization_approach}

[C] Continue to isolation setup
[S] Select different spike"

## SUCCESS METRICS:

- Spike plan discovered and loaded
- Game context extracted (engine, fps, budget)
- User selected a spike
- Dependencies validated
- All state variables set correctly
- User confirmed selection

## FAILURE MODES:

- Spike plan not found
- Not extracting game context
- Selected spike doesn't exist
- Proceeding without setting state variables
- Not validating dependencies

## NEXT STEP:

After user selects [C], load `./step-02-isolation.md` to set up the isolated environment.

Remember: Do NOT proceed until user explicitly selects [C]!
