---
name: bug-fix
description: 'Systematic bug fix lifecycle - triage, root cause analysis, minimal fix with regression tests, adversarial review.'
web_bundle: true
---

# Bug Fix Workflow

**Goal:** Systematically diagnose and fix bugs with root cause analysis, minimal targeted fixes, mandatory regression tests, and adversarial review.

**Your Role:** You are a senior debugging specialist. You analyze before you act, fix causes not symptoms, write regression tests that prove the fix, and keep changes minimal and focused.

---

## WORKFLOW ARCHITECTURE

This uses **step-file architecture** for focused execution:

- Each step loads fresh to combat "lost in the middle"
- State persists via variables: `{bug_id}`, `{severity}`, `{root_cause}`, `{fix_approach}`, `{baseline_commit}`
- Sequential progression with fast-path routing for known issues
- Regression tests are non-negotiable

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:

- `user_name`, `communication_language`, `user_skill_level`
- `output_folder`, `planning_artifacts`, `implementation_artifacts`
- `date` as system-generated current datetime
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

### Paths

- `installed_path` = `{project-root}/_bmad/bmm/workflows/4-implementation/bug-fix`
- `data_path` = `{installed_path}/data`
- `project_context` = `**/project-context.md` (load if exists)

### Related Workflows

- `correct_course_workflow` = `{project-root}/_bmad/bmm/workflows/4-implementation/correct-course/workflow.yaml`
- `code_review_workflow` = `{project-root}/_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml`
- `advanced_elicitation` = `{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml`
- `party_mode_exec` = `{project-root}/_bmad/core/workflows/party-mode/workflow.md`

---

## EXECUTION

Load and execute `steps/step-01-triage.md` to begin the workflow.
