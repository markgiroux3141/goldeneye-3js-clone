# Step 2: Risk Analysis (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ALWAYS treat this as collaborative discovery between technical peers
- YOU ARE A FACILITATOR - present findings, ask for validation, don't assume
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Game Architecture document has been loaded in step-01
- Game engine and target platforms identified
- You have access to `{data_files_path}/risk-categories.yaml` for risk classification (includes game-specific risks)
- Focus ONLY on identifying risks - decomposition comes in step-03

## YOUR TASK:

Analyze the game architecture document to identify high-risk technical components that need isolated validation through spikes. Pay special attention to frame budget risks, visual fidelity concerns, and platform-specific issues.

## EXECUTION SEQUENCE:

### 1. Load Risk Categories

Load `{data_files_path}/risk-categories.yaml` to understand:
- Standard risk category definitions
- **Game-specific risk categories:** Frame Budget, Visual Fidelity, Input Latency, Platform Divergence, Networking, Memory
- Trigger keywords
- Assessment questions
- Severity thresholds

### 2. Analyze Architecture for Risks

Systematically scan the game architecture document for:

**Rendering & Graphics:**
- Compute shaders
- Custom rendering pipelines
- Post-processing effects
- LOD systems
- Particle systems

**Game Systems:**
- Physics implementations
- Procedural generation (terrain, content)
- AI/pathfinding systems
- Animation systems
- State machines

**Platform Concerns:**
- Cross-platform features
- Shader compatibility
- Mobile-specific optimizations
- Console memory limits

**Networking:**
- Multiplayer synchronization
- Lag compensation
- Authoritative server logic

### 3. Apply Risk Categories

For each identified component, assess against risk categories:
- Match trigger keywords
- Consider assessment questions
- Assign probability (1-3) and impact (1-3)
- Calculate severity (probability x impact)
- **Note frame budget impact** (High/Medium/Low/None)

### 4. Present Risk Matrix to User

Present findings in table format:

"Based on my analysis of the game architecture, I've identified the following potentially high-risk components:

| Component | Risk Category | Prob | Impact | Severity | Frame Impact | Notes |
|-----------|---------------|------|--------|----------|--------------|-------|
| {component} | {category} | {1-3} | {1-3} | {1-9} | {H/M/L/N} | {note} |

**Risk Severity Guide:**
- 1-3: Low risk - document but likely no spike needed
- 4-5: Medium risk - spike recommended
- 6-8: High risk - spike required
- 9: Critical risk - spike required, may need architecture review

**Frame Impact Guide:**
- High: Could exceed frame budget, needs validation
- Medium: May impact frame budget under load
- Low: Minimal frame impact expected
- None: Not frame-relevant

Do these assessments seem accurate? Would you like to:
- Adjust any severity ratings?
- Change frame impact assessments?
- Add components I may have missed?
- Remove any that aren't actually risky?

### 5. Collaborative Refinement

Work with user to refine the risk assessment:
- Accept their domain knowledge about actual risk levels
- Consider their experience with similar systems
- Factor in team familiarity with the game engine
- Add components they identify that you missed
- Remove false positives
- Adjust severity based on their context

### 6. Finalize High-Risk Components

After user confirms, identify components requiring spikes:
- All components with severity >= 6 require spikes
- Components with severity 4-5 are recommended for spikes
- **All High frame impact components should be considered for spikes**
- Ask user which 4-5 severity items they want to include

### 7. Update Document

Update the spike plan document:

**In Risk Assessment Overview section:**
- Populate the Risk Matrix table (including Frame Impact column)
- List High-Risk Components Identified

**Update frontmatter:**
- `high_risk_components: {count}`
- Add 2 to `stepsCompleted` array

### 8. Present Summary and Menu

"Risk analysis complete!

**Summary:**
- Total components analyzed: {count}
- High-risk (spike required): {count >= 6}
- Medium-risk (spike recommended): {count 4-5}
- Low-risk (documented): {count 1-3}

**Frame Budget Concerns:**
- High frame impact: {count}
- Medium frame impact: {count}

**Game-Specific Risks Identified:**
- Frame Budget risks: {count}
- Visual Fidelity risks: {count}
- Input Latency risks: {count}
- Platform Divergence risks: {count}
- Networking risks: {count}

The following components will proceed to spike decomposition:
{list of components with severity >= 6 or user-selected 4-5}

[C] Continue to spike decomposition
[R] Review/revise risk assessment

## SUCCESS METRICS:

- All significant technical decisions from architecture analyzed
- Risk categories applied systematically including game-specific ones
- Frame budget impact assessed for each component
- User validated and refined risk assessments
- High-risk components clearly identified
- Document updated with risk matrix
- Frontmatter updated with stepsCompleted

## FAILURE MODES:

- Missing game-specific risks (frame budget, visual fidelity, etc.)
- Not considering platform constraints
- Over or under-estimating risks without user input
- Not allowing user to add/remove/adjust risks
- Proceeding without user confirmation
- Not updating document and frontmatter

## NEXT STEP:

After user selects [C], load `./step-03-decomposition.md` to break high-risk components into isolated spikes with game-specific patterns.

Remember: Do NOT proceed until user explicitly selects [C]!
