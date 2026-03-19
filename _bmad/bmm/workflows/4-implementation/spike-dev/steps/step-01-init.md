# Step 1: Initialize & Select Spike

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ALWAYS treat this as collaborative exploration between technical peers
- YOU ARE A FACILITATOR helping validate technical risks
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Variables from workflow.md are available in memory
- This step discovers spike-plan.md and lets user select a spike
- Do not execute any spike code in this step

## YOUR TASK:

Load the spike plan document, present available spikes with their status, and let the user select which spike to execute.

## EXECUTION SEQUENCE:

### 1. Discover Spike Plan

Search for spike plan in these locations:
- `{planning_artifacts}/*spike-plan*.md`
- `{output_folder}/*spike-plan*.md`

If not found:
"No spike plan found. Please run the spike-planning workflow first to create a spike plan, or provide the path to your spike-plan.md file."

If found, load the complete file.

### 2. Check for In-Progress Spikes

Check frontmatter for `spikes_in_progress` array:
- If not empty, load `./step-01b-continue.md` to handle continuation
- If empty, proceed with fresh spike selection

### 3. Parse Spike Definitions

Extract from spike-plan.md:
- All spike definitions from "## Spike Definitions" section
- Integration Roadmap checkboxes for completion status
- Dependency information for each spike

### 4. Present Available Spikes

Present spikes with status:

"**Available Spikes:**

| # | Status | Spike Name | Dependencies | Severity |
|---|--------|------------|--------------|----------|
| 1 | [ ] | {name} | None | {severity} |
| 2 | [ ] | {name} | Spike 1 | {severity} |
| 3 | [x] | {name} | None | Completed |

**Legend:**
- [ ] = Pending
- [~] = In Progress
- [x] = Completed

Which spike would you like to execute? Enter number or name:"

### 5. Validate Selection

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
  - Estimated complexity

### 6. Set State Variables

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
```

### 7. Confirm Selection

"**Selected Spike: {spike_name}**

**What to Test:**
{what_to_test}

**Success Criteria:**
{list criteria}

**Dependencies:** {deps or "None"}

**Validation Approach:** {approach}

[C] Continue to isolation setup
[S] Select different spike"

## SUCCESS METRICS:

- Spike plan discovered and loaded
- User selected a spike
- Dependencies validated (or user acknowledged proceeding without)
- All state variables set correctly
- User confirmed selection

## FAILURE MODES:

- Spike plan not found (guide to run spike-planning)
- Selected spike doesn't exist
- Proceeding without setting state variables
- Not validating dependencies
- Auto-proceeding without user confirmation

## NEXT STEP:

After user selects [C], load `./step-02-isolation.md` to set up the isolated environment.

Remember: Do NOT proceed until user explicitly selects [C]!
