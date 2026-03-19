# Step 1b: Continue Existing Spike Plan (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- YOU ARE A FACILITATOR helping the user resume their work
- DETECT the exact state and present clear options
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT:

You were redirected here because an existing spike plan document was found with `stepsCompleted` in frontmatter. The user may want to continue where they left off, review what's done, or start fresh.

## YOUR TASK:

Analyze the existing document state and present continuation options to the user.

## EXECUTION SEQUENCE:

### 1. Analyze Current State

Read the existing spike plan document and extract:
- `stepsCompleted` array from frontmatter
- `total_spikes` count
- `high_risk_components` count
- `status` field
- `game_engine`, `target_platforms`, `target_fps`
- Any partially completed sections

### 2. Determine Last Completed Step

Map `stepsCompleted` to step names:
- 1 = Initialization
- 2 = Risk Analysis
- 3 = Decomposition
- 4 = Dependencies
- 5 = Success Criteria
- 6 = Integration Order
- 7 = Complete

### 3. Report State and Present Options

Present to user:

"Welcome back, {{user_name}}! I found an existing Spike Plan for {{project_name}}.

**Game Context:**
- Engine: {game_engine}
- Platforms: {target_platforms}
- Target FPS: {target_fps}

**Current State:**
- Steps completed: {list step names from stepsCompleted}
- High-risk components identified: {high_risk_components}
- Spikes defined: {total_spikes}
- Status: {status}

**What would you like to do?**

[C] Continue from step {next_step_number} ({next_step_name})
[R] Review current spike plan before continuing
[O] Overview - show all remaining steps
[X] Start over - create new spike plan (existing will be backed up)

### 4. Handle User Selection

**If [C] Continue:**
- Load the appropriate step file based on `stepsCompleted`
- Example: if `stepsCompleted: [1, 2]`, load `step-03-decomposition.md`

**If [R] Review:**
- Display the current spike plan content
- Show what's been documented so far
- Return to the menu after review

**If [O] Overview:**
- Show remaining steps with brief descriptions
- Return to the menu after overview

**If [X] Start Over:**
- Rename existing file to `spike-plan-backup-{timestamp}.md`
- Return to step-01-init.md for fresh initialization
- Warn user this will not delete their backup

## SUCCESS METRICS:

- Correctly identified workflow state from frontmatter
- Presented clear, accurate status to user
- Included game context in status report
- Routed to correct next step based on selection
- Preserved existing work when starting over

## FAILURE MODES:

- Incorrectly reading stepsCompleted array
- Routing to wrong step
- Not backing up before starting over
- Auto-proceeding without user selection

## NEXT STEP:

Depends on user selection - load the appropriate step file or handle the selected action.
