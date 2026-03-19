---
name: 'step-02-investigation'
description: 'Perform systematic root cause analysis to identify what code is causing the bug'

nextStepFile: './step-03-fix-planning.md'
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 2: Investigation

**Goal:** Perform systematic root cause analysis to identify what code is actually causing the bug.

---

## AVAILABLE STATE

From step-01: `{baseline_commit}`, `{bug_id}`, `{bug_description}`, `{severity}`, `{reproduction_steps}`, `{error_evidence}`

## STATE VARIABLES (set in this step)

- `{root_cause}` - The actual defect and why it exists
- `{affected_files}` - Files involved in the bug
- `{affected_components}` - Logical components affected

---

## MANDATORY EXECUTION RULES

- You are a **debugger**, not a guesser. Read the actual code before forming theories.
- Distinguish between SYMPTOM (what user sees), PROXIMATE CAUSE (the line that fails), and ROOT CAUSE (the actual defect).
- Do not propose fixes in this step. Investigation only.
- If the investigation reveals this is not a code bug but an architectural or requirements issue, offer escalation.

---

## EXECUTION SEQUENCE

### 1. Analyze Evidence

Start from the error evidence provided in `{error_evidence}`:

- **Stack traces:** Extract file names, line numbers, function names. These are your starting points.
- **Error messages:** Search the codebase for the error string to find where it's thrown/logged.
- **Log output:** Identify the last successful operation and the first failure point.
- **If no evidence:** Use `{reproduction_steps}` to identify the entry point (API endpoint, UI action, scheduled task) and trace from there.

### 2. Identify Candidate Files

Using the evidence analysis, build a list of candidate files:

- Search codebase using grep/glob for relevant code paths
- Follow imports and dependencies from the error location
- Check recent git changes if `{baseline_commit}` != "NO_GIT" (`git log --oneline -20`)

### 3. Trace the Code Path

Read the identified files. Follow the execution path:

1. **Entry point** - Where does the flow begin? (route handler, event listener, function call)
2. **Data flow** - What data passes through? Where might it be wrong?
3. **Failure point** - Where exactly does the behavior diverge from expected?
4. **Root cause** - Why does it diverge? What assumption is violated?

Focus on understanding, not speed. Read the relevant code carefully.

### 4. Identify Root Cause

Clearly distinguish:

- **Symptom:** What the user reported (e.g., "login page shows 500 error")
- **Proximate cause:** The line that directly fails (e.g., "`user.email` is undefined at auth.js:42")
- **Root cause:** The actual defect (e.g., "the user query omits the email field when fetching by OAuth token, returning a partial user object")

### 5. Check for Related Patterns

Search the codebase for the same bug class elsewhere:

- Same anti-pattern in other files
- Similar assumptions that might also be wrong
- Code that was copy-pasted from the buggy code

Note any related issues found but do NOT scope them into this fix. They are informational.

### 6. Escalation Check

Evaluate whether the root cause is fixable within a bug-fix scope:

**Proceed with bug-fix if:**
- Root cause is a code defect (wrong logic, missing check, bad data handling)
- Fix is localized to a few files
- No requirement or architecture changes needed

**Offer escalation to correct-course if:**
- Root cause is in architecture or design decisions
- Fix would require changes across 5+ components
- Fix contradicts current requirements
- Fix requires API contract changes

### 7. Present Findings

Present the investigation results:

```
**Root Cause Analysis for {bug_id}:**

**Symptom:** {what user reported}
**Proximate cause:** {file:line - what directly fails}
**Root cause:** {the actual defect and why it exists}

**Affected files:**
- {file1} - {role in the bug}
- {file2} - {role in the bug}

**Affected components:** {logical components}

**Related patterns found:** {any similar issues elsewhere, or "none"}

Does this match your understanding? (y / adjust / investigate-more)
```

If user says **adjust**: incorporate their feedback and revise.
If user says **investigate-more**: return to step 3 with refined focus.
If user confirms: proceed.

---

### 8. Present MENU OPTIONS

Display: "**Select:** [A] Advanced Elicitation [P] Party Mode [C] Continue to Fix Planning"

#### Menu Handling Logic:

- IF A: Execute `{advancedElicitationTask}`, then redisplay menu
- IF P: Execute `{partyModeWorkflow}`, then redisplay menu
- IF C: Store `{root_cause}`, `{affected_files}`, `{affected_components}`, then load `{nextStepFile}`
- IF Any other: help user, then redisplay menu

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
- After other menu items execution, return to this menu

---

## NEXT STEP DIRECTIVE

**CRITICAL:** When user selects C: "**NEXT:** Loading `step-03-fix-planning.md`"

---

## SUCCESS METRICS

- Root cause identified (not just symptom or proximate cause)
- Affected files listed with their role in the bug
- User confirmed the analysis
- Escalation evaluated
- Explicit NEXT directive provided

## FAILURE MODES

- Guessing the root cause without reading code
- Fixing the symptom without finding root cause
- Not reading the actual code files
- Not tracing the full execution path
- Missing related instances of the same bug pattern
- Not offering escalation when root cause is architectural
