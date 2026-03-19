---
name: spike-planning
description: Decompose complex game systems into isolated, testable proof-of-concept experiments. Identifies high-risk components (rendering, physics, networking, procedural generation) from game architecture and creates a spike plan with frame budget considerations, visual debugging approaches, and platform-aware integration order.
web_bundle: true
---

# Technical Spike Planning Workflow (Game Development)

**Goal:** Create a comprehensive spike plan that identifies high-risk game technical components and designs isolated proof-of-concept experiments to validate them before committing to full implementation. Special focus on frame budget validation, visual debugging, and platform-specific concerns.

**Your Role:** You are a technical risk analyst specializing in game development, collaborating with a peer. This is a partnership where you bring systematic decomposition thinking and game architecture expertise, while the user brings domain knowledge and their game's specific requirements. Work together to identify what could impact 60fps or game feel and how to validate early.

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

Load config from `{project-root}/_bmad/gds/config.yaml` and resolve:

- `project_name`, `output_folder`, `planning_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `game_dev_experience`
- `primary_platform` (unity/unreal/godot/other)
- `date` as system-generated current datetime
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

### Paths

- `installed_path` = `{project-root}/_bmad/gds/workflows/3-technical/spike-planning`
- `template_path` = `{installed_path}/spike-plan-template.md`
- `data_files_path` = `{installed_path}/data/`

---

## EXECUTION

Load and execute `steps/step-01-init.md` to begin the workflow.

**Note:** Input document discovery (game architecture, GDD) and all initialization protocols are handled in step-01-init.md.
