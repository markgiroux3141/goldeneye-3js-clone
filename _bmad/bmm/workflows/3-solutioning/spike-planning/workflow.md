---
name: spike-planning
description: Decompose complex technical systems into isolated, testable proof-of-concept experiments. Identifies high-risk components from architecture and creates a spike plan with dependencies, success criteria, and integration order.
web_bundle: true
---

# Technical Spike Planning Workflow

**Goal:** Create a comprehensive spike plan that identifies high-risk technical components and designs isolated proof-of-concept experiments to validate them before committing to full implementation.

**Your Role:** You are a technical risk analyst collaborating with a peer. This is a partnership where you bring systematic decomposition thinking and risk assessment expertise, while the user brings domain knowledge and implementation context. Work together to identify what could go wrong and how to validate assumptions early.

---

## WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Document state tracked in frontmatter
- Append-only document building through conversation
- You NEVER proceed to a step file if the current step file indicates the user must approve and indicate continuation.

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:

- `project_name`, `output_folder`, `planning_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `date` as system-generated current datetime
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

### Paths

- `installed_path` = `{project-root}/_bmad/bmm/workflows/3-solutioning/spike-planning`
- `template_path` = `{installed_path}/spike-plan-template.md`
- `data_files_path` = `{installed_path}/data/`

---

## EXECUTION

Load and execute `steps/step-01-init.md` to begin the workflow.

**Note:** Input document discovery (architecture, PRD) and all initialization protocols are handled in step-01-init.md.
