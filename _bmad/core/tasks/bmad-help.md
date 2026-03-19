---
name: bmad-help
description: Get unstuck by showing what workflow steps come next or answering questions about what to do
standalone: true
---

# Task: BMAD Help

## KEY RULES

- **Empty `phase` = anytime** — Universal tools work regardless of workflow state
- **Numbered phases indicate sequence** — Phases like `1-discover` → `2-define` → `3-build` → `4-ship` flow in order (naming varies by module)
- **Stay in module** — Guide through the active module's workflow based on phase+sequence ordering
- **Descriptions contain routing** — Read for alternate paths (e.g., "back to previous if fixes needed")
- **`required=true` blocks progress** — Required workflows must complete before proceeding to later phases
- **Artifacts reveal completion** — Search resolved output paths for `outputs` patterns, fuzzy-match found files to workflow rows

## MODULE DETECTION

- **Empty `module` column** → universal tools (work across all modules)
- **Named `module`** → module-specific workflows

Detect the active module from conversation context, recent workflows, or user query keywords. If ambiguous, ask the user.

## INPUT ANALYSIS

Determine what was just completed:
- Did someone state they completed something? Proceed as if that was the input.
- Was a workflow just completed in this conversation? Proceed as if that was the input.
- Search resolved artifact locations for files; fuzzy-match to workflow `outputs` patterns.
- If an `index.md` exists, read it for additional context.
- If still unclear, ask: "What workflow did you most recently complete?"

## EXECUTION

1. **Load catalog** — Load `{project-root}/_bmad/_config/bmad-help.csv`

2. **Resolve output locations** — Scan each folder under `_bmad/` (except `_config`) for `config.yaml`. For each workflow row, resolve its `output-location` variables against that module's config so artifact paths can be searched.

3. **Analyze input** — Task may provide a workflow name/code, conversational phrase, or nothing. Infer what was just completed using INPUT ANALYSIS above.

4. **Detect active module** — Use MODULE DETECTION above to determine which module the user is working in.

5. **Present recommendations** — Show next steps based on completed workflows, phase/sequence ordering (KEY RULES), and artifact detection. Format per the following

## RECOMMENDED OUTPUT FORMAT

   **Optional items first** — List optional workflows until a required step is reached
   **Required items next** — List the next required workflow
   For each item show:
   - Workflow **name**
   - **Command** (prefixed with `/`, e.g., `/bmad_bmm_create-prd`)
   - **Agent** title and display name from the CSV (e.g., "🎨 Alex (Designer)")
   - Brief **description**

   ### Fresh Context Copy-Paste Command (ALWAYS include):

   After presenting the recommendations, ALWAYS output this section:

   ---
   **📋 Next Step - Copy & Paste:**
   ```
   /[primary_recommended_command]
   ```

   💡 **Start a fresh context window** before running this command for best results.

   ---

   If the task was called with context (e.g., story number, epic ID), include it in the command:
   ```
   /bmad_bmm_dev-story 1.3
   ```

   ### Additional guidance to convey:
   - For **validation workflows**: recommend using a different high-quality LLM if available
   - For conversational requests: match the user's tone while presenting clearly

## CONTEXT PARAMETERS

When this task is called with additional context (e.g., story number, epic ID, specific workflow state):
- Include the context in the copy-paste command
- Format: `/command [context]`

Examples:
- Story context: `/bmad_bmm_dev-story 1.3`
- Epic context: `/bmad_bmm_create-story epic-2`
- Validation with file: `/bmad_bmm_validate-prd prd.md`

6. Return to the calling process after presenting recommendations.
