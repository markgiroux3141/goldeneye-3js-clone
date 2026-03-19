---
name: spike-dev
description: Execute individual spikes from spike-plan.md for game development. Validates technical risks in isolation with frame budget validation, visual debugging, and minimal implementation. Documents learnings and updates the spike plan with results.
web_bundle: true
---

# Spike Development Workflow (Game Development)

**Goal:** Execute a single spike from the spike plan, validating game-specific technical risks (frame budget, visual fidelity, platform compatibility) through minimal isolated implementation, and documenting learnings for the team.

**Your Role:** You are a technical implementation partner specializing in game development, helping validate risky technical decisions. This is exploratory work - spikes can succeed, partially succeed, or fail. All outcomes are valuable. Focus on learning, not production-quality code. Pay special attention to frame budget and visual debugging.

---

## WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Spike state tracked in memory and updated to spike-plan.md at completion
- Spikes execute in ISOLATION from main game project
- Frame budget validation is a first-class concern
- You NEVER proceed to a step file if the current step file indicates the user must approve and indicate continuation.

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/gds/config.yaml` and resolve:

- `project_name`, `output_folder`, `planning_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `game_dev_experience`
- `primary_platform` (unity/unreal/godot/other)
- `date` as system-generated current datetime
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

### Paths

- `installed_path` = `{project-root}/_bmad/gds/workflows/4-production/spike-dev`
- `data_files_path` = `{installed_path}/data/`
- `spike_plan_path` = discovered in step-01

### State Variables (persist throughout workflow)

```yaml
# From spike-plan.md (set in step-01)
spike_plan_path: ""           # Path to spike-plan.md
selected_spike_id: ""         # Spike number or identifier
spike_name: ""                # Human-readable name
spike_definition: ""          # Full spike definition text
spike_success_criteria: []    # Array of criteria from plan

# Game-specific context
game_engine: ""               # unity | unreal | godot | other
target_fps: 60                # From spike plan
frame_budget_ms: 16.67        # Calculated from target_fps

# Set during workflow
isolation_type: ""            # "console" | "test-scene" | "test-project" | "sandbox-branch"
isolation_path: ""            # Path to isolated environment
baseline_commit: ""           # Git HEAD at workflow start (if applicable)

# Updated during execution
criteria_results: []          # Array of {criterion, passed, measurement}
spike_outcome: ""             # "success" | "partial" | "failed"
learnings: ""                 # Documented learnings text
frame_budget_used: 0          # Total ms used by spike (if measured)
```

---

## EXECUTION

Load and execute `steps/step-01-init.md` to begin the workflow.

**Note:** Spike plan discovery and spike selection are handled in step-01-init.md.

---

## KEY PRINCIPLES

1. **Spikes are ISOLATED** - Never modify main game project during spike execution
2. **Spikes are MINIMAL** - Implement the least code needed to validate
3. **Spikes are EXPLORATORY** - Failure is a valid and valuable outcome
4. **Document EVERYTHING** - Learnings are the primary deliverable, not code
5. **Validate OBJECTIVELY** - Each criterion has measurable pass/fail
6. **Frame Budget is CRITICAL** - Always measure and validate against target
7. **Visual Debugging is ESSENTIAL** - Use gizmos, overlays, profilers
