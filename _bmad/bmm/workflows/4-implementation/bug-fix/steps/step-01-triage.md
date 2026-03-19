---
name: 'step-01-triage'
description: 'Classify the bug, gather reproduction info, capture baseline, and route to investigation or fast-path'

severityMatrixFile: '../data/severity-matrix.yaml'
nextStepFile_investigate: './step-02-investigation.md'
nextStepFile_known: './step-03-fix-planning.md'
---

# Step 1: Triage

**Goal:** Classify the bug, gather evidence, capture baseline, and determine the path forward.

---

## STATE VARIABLES (capture now, persist throughout)

These variables MUST be set in this step and available to all subsequent steps:

- `{baseline_commit}` - Git HEAD at workflow start (or "NO_GIT" if not a git repo)
- `{bug_id}` - Identifier in format BF-{date}-{short-slug}
- `{bug_description}` - User's description of the problem
- `{severity}` - critical | high | medium | low
- `{reproduction_steps}` - Steps to reproduce (or "unknown" if intermittent)
- `{error_evidence}` - Logs, stack traces, screenshots, error messages
- `{entry_mode}` - "investigate" or "known-cause"
- If known-cause: also `{root_cause}` and `{affected_files}`

---

## EXECUTION SEQUENCE

### 1. Capture Baseline

Check if the project uses Git version control:

**If Git repo exists** (`.git` directory present or `git rev-parse --is-inside-work-tree` succeeds):

- Run `git rev-parse HEAD` and store result as `{baseline_commit}`

**If NOT a Git repo:**

- Set `{baseline_commit}` = "NO_GIT"

### 2. Load Project Context

Check if `{project_context}` exists (`**/project-context.md`). If found, load it as foundational reference for understanding the codebase structure, patterns, and conventions.

### 3. Gather Bug Information

Ask the user to describe the bug. Use progressive questioning (1-2 questions at a time):

**Round 1 - What happened:**

- What is the bug? What behavior did you observe?
- What should have happened instead?

**Round 2 - Evidence:**

- Do you have error messages, stack traces, or log output?
- When did this start happening? (recent change, always broken, intermittent?)

**Round 3 - Reproduction:**

- Can you describe the steps to reproduce?
- If unknown/intermittent, note as "reproduction unknown" and capture any patterns observed

Store responses in `{bug_description}`, `{error_evidence}`, and `{reproduction_steps}`.

### 4. Classify Severity

Load `{severityMatrixFile}` and evaluate the bug against the severity indicators.

Present your classification:

```
**Severity Assessment:**
Level: {severity}
Rationale: {why this level based on indicators}

Does this classification seem right? (y / adjust to [critical|high|medium|low])
```

Allow user to override. Store final value in `{severity}`.

### 5. Generate Bug ID

Create `{bug_id}` using format: `BF-{date}-{short-slug}`
- `{date}` = current date in YYYYMMDD format
- `{short-slug}` = 2-3 word slug from bug description (e.g., `login-crash`, `null-cart-total`)

Example: `BF-20260212-login-crash`

### 6. Route Decision

Present the routing options:

```
Bug {bug_id} triaged as {severity}.

How should we proceed?

**[K] Known cause** - I already know what's causing this
**[I] Investigate** - Help me find the root cause
**[E] Escalate** - This might be bigger than a code bug
```

#### Route Handling:

**IF [K] Known cause:**

- Ask user to describe the root cause
- Ask which files are affected
- Store in `{root_cause}` and `{affected_files}`
- Set `{entry_mode}` = "known-cause"
- **NEXT:** Load `{nextStepFile_known}` (step-03-fix-planning.md)

**IF [I] Investigate:**

- Set `{entry_mode}` = "investigate"
- **NEXT:** Load `{nextStepFile_investigate}` (step-02-investigation.md)

**IF [E] Escalate:**

- Explain: "This will route to the Correct Course workflow for impact analysis and change management."
- Route to `{correct_course_workflow}`
- **EXIT Bug Fix workflow.**

---

## NEXT STEP DIRECTIVE

**CRITICAL:** When this step completes, explicitly state which step to load:

- Known cause [K]: "**NEXT:** Loading `step-03-fix-planning.md`"
- Investigate [I]: "**NEXT:** Loading `step-02-investigation.md`"
- Escalate [E]: "**EXITING Bug Fix.** Routing to Correct Course workflow."

---

## SUCCESS METRICS

- `{baseline_commit}` captured
- `{bug_id}` generated
- `{bug_description}` captured with evidence
- `{severity}` classified (with user agreement)
- `{reproduction_steps}` captured (even if "unknown")
- Route decision made with explicit NEXT directive

## FAILURE MODES

- Proceeding without capturing baseline commit
- Not classifying severity
- Not capturing reproduction steps (even if unknown)
- Loading step-02 when user selected known-cause path [K]
- Loading step-03 when user selected investigate path [I]
- No explicit NEXT directive at step completion
