# Step 1b: Continue In-Progress Spike

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- YOU ARE A FACILITATOR helping resume spike work
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT:

You were redirected here because `spikes_in_progress` in the spike plan frontmatter is not empty. A spike was started but not completed.

## YOUR TASK:

Help the user decide whether to continue the in-progress spike or start a different one.

## EXECUTION SEQUENCE:

### 1. Load In-Progress State

From spike-plan.md frontmatter, extract:
- `spikes_in_progress` array
- For each in-progress spike, find its definition

### 2. Present Options

"**In-Progress Spike Detected**

You have a spike that was started but not completed:

**Spike: {spike_name}**
- Started: {if available}
- Isolation: {if recorded}
- Progress: {any recorded progress}

**Options:**

[C] Continue this spike from where you left off
[A] Abandon this spike and select a new one
[R] Review spike plan status first"

### 3. Handle Selection

**If [C] Continue:**
- Load the spike's state from any recorded progress
- Determine which step to resume from:
  - If isolation was set up → step-03-execute
  - If execution started → step-03 or step-04 depending on progress
- Set state variables and proceed

**If [A] Abandon:**
- Clear `spikes_in_progress` in memory (will update file at completion)
- Return to step-01-init spike selection
- Note: The spike is not marked failed, just abandoned

**If [R] Review:**
- Show current spike plan status
- Show all spikes with their completion state
- Return to this menu

### 4. Resume Point Detection

Based on recorded state, determine resume point:

```
No isolation recorded → Resume at step-02
Isolation recorded, no execution → Resume at step-03
Partial execution recorded → Resume at step-03 (continue)
Validation started → Resume at step-04
```

## SUCCESS METRICS:

- In-progress spike state correctly loaded
- User made informed decision
- Correct resume point determined
- State variables set for continuation

## FAILURE MODES:

- Losing in-progress state
- Resuming at wrong step
- Not offering abandon option
- Not clearing state when abandoning

## NEXT STEP:

Depends on user selection - either continue to appropriate step or return to spike selection.
