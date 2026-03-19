# Step 1b: Continue Existing Workflow

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- ALWAYS treat this as collaborative discovery between technical peers
- YOU ARE A FACILITATOR, not a content generator
- FOCUS on seamlessly resuming from where work stopped
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

---

## STEP GOAL:

Resume an interrupted code style analysis workflow by:
1. Loading existing state from state file
2. Loading existing progress from code-style-guide.md
3. Presenting current progress to user
4. Offering options to continue, restart, or modify

---

## WHEN TO USE THIS STEP:

This step is loaded when:
- `{output_folder}/code-style-analysis-state.json` exists
- State file is less than 24 hours old
- Workflow was interrupted before completion

---

## Sequence of Instructions (Do not deviate, skip, or optimize)

### 1. Load State File

Read `{output_folder}/code-style-analysis-state.json` and extract:
- `started` timestamp
- `scan_depth` configuration
- `current_step` where work stopped
- `categories_completed` array
- `extraction_results` data

Calculate time since last activity.

---

### 2. Load Existing Code Style Guide

Read `{output_folder}/code-style-guide.md` and extract:
- `stepsCompleted` from frontmatter
- Which sections have content vs placeholder text
- Current `pattern_count` and `example_count`

---

### 3. Present Resume Options

**If state file is less than 24 hours old:**

Present to user:
"I found an in-progress code style analysis:

**Started:** {{started_timestamp}}
**Last Step:** {{current_step}}
**Progress:**
- Categories completed: {{categories_completed_count}}/12
- Patterns documented: {{pattern_count}}
- Examples collected: {{example_count}}

**Completed categories:**
{{list_of_completed_categories}}

**Remaining categories:**
{{list_of_remaining_categories}}

Would you like to:
[R] Resume - Continue from where you left off
[S] Start Fresh - Archive current progress and start over
[C] Cancel - Exit without changes"

**If state file is 24+ hours old:**

Present to user:
"I found a stale code style analysis (started {{days_ago}} days ago):

**Progress:** {{categories_completed_count}}/12 categories completed

Since significant time has passed, I recommend starting fresh. Would you like to:
[A] Archive and Start Fresh (Recommended) - Save old progress and begin new analysis
[R] Resume Anyway - Continue from stale checkpoint
[C] Cancel - Exit without changes"

**HALT AND WAIT for user selection.**

---

### 4. Handle User Selection

#### If 'R' (Resume):

1. Load extraction results from state file into memory
2. Determine which step to resume:
   - If `current_step` is 'step-02': Load `./step-02-extract.md`
   - If `current_step` is 'step-03': Load `./step-03-refine.md`
   - If `current_step` is 'step-04': Load `./step-04-examples.md`
   - If `current_step` is 'step-05': Load `./step-05-complete.md`
3. Pass extracted data as context to resumed step

Present:
"Resuming from {{step_name}}. Loading your previous progress..."

Then load appropriate step file.

#### If 'S' or 'A' (Start Fresh / Archive):

1. Archive existing files:
   - Move `code-style-guide.md` to `code-style-guide-{{timestamp}}.md.bak`
   - Move `code-style-analysis-state.json` to `code-style-analysis-state-{{timestamp}}.json.bak`

2. Present confirmation:
   "Previous progress archived. Starting fresh analysis."

3. Load `./step-01-discover.md` to begin from the start.

#### If 'C' (Cancel):

Present:
"Analysis cancelled. Your existing progress remains at:
- {{code_style_guide_path}}
- {{state_file_path}}

You can resume later by running this workflow again."

**End workflow.**

---

## SUCCESS METRICS:

- State file loaded correctly
- Progress accurately presented to user
- User selection handled appropriately
- Archived files if starting fresh
- Seamless handoff to appropriate step

## FAILURE MODES:

- Corrupted state file not handled gracefully
- Mismatch between state file and actual document content
- Not archiving old files before overwriting
- Losing user's previous work
- Proceeding without user confirmation

---

## NEXT STEP:

Depends on user selection:
- Resume → Load appropriate step file based on `current_step`
- Start Fresh → Load `./step-01-discover.md`
- Cancel → End workflow
