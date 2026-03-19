# Step 5: Success Criteria Definition (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ALWAYS treat this as collaborative discovery between technical peers
- YOU ARE A FACILITATOR - propose criteria, let user refine
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Spikes have been defined with dependencies mapped
- Target FPS and frame budget are known from step-01
- Focus ONLY on defining measurable success criteria
- Criteria must be objective and verifiable

## YOUR TASK:

Define clear, measurable success criteria for each spike so there's no ambiguity about whether a spike succeeded or failed. Include game-specific criteria like frame budget and visual quality where applicable.

## EXECUTION SEQUENCE:

### 1. Review Success Criteria Principles

Good success criteria are:
- **Objective** - No subjective judgment required
- **Measurable** - Can be verified with tests, profiling, or inspection
- **Specific** - Not vague or open to interpretation
- **Binary** - Pass or fail, not "mostly works"

### 2. Identify Criteria Types (Game-Specific)

For each spike, consider which criteria types apply:

**Functional Criteria:**
- Does it produce correct output?
- Does it handle expected inputs?
- Does it handle edge cases?

**Frame Budget Criteria:**
- CPU time < Xms (portion of frame budget)
- GPU time < Xms (portion of frame budget)
- No frame drops during operation
- Consistent frame timing (no spikes)

**Visual Quality Criteria:**
- No visible artifacts
- No seams between chunks
- LOD transitions not noticeable
- Matches reference/concept

**Input Responsiveness Criteria:**
- Input-to-visual < Xms
- No dropped inputs
- Feels responsive

**Memory Criteria:**
- Memory usage < X MB
- No GC spikes > Yms
- Proper cleanup on unload

**Platform Criteria:**
- Works on all target platforms
- No shader compilation errors
- Meets minimum spec performance

### 3. Draft Criteria for Each Spike

For each spike, propose 2-5 success criteria:

"Let's define success criteria for each spike. I'll propose some based on what each spike is testing and the game's requirements.

**Frame Budget Context:**
- Target: {target_fps}fps
- Frame budget: {frame_budget}ms
- Typical system budget: 2-4ms per major system

---

**Spike {N}: {Name}**

Testing: {what this spike tests}
Risk: {risk being validated}
Frame Impact: {High/Medium/Low}

**Proposed Success Criteria:**

1. [ ] **Functional:** {correctness criterion}
   _Verification: {how to verify}_

2. [ ] **Frame Budget:** CPU time < {X}ms for {scenario}
   _Verification: Profiler measurement on target hardware_

3. [ ] **Visual Quality:** {visual criterion if applicable}
   _Verification: Visual inspection against reference_

4. [ ] **Platform:** Works on {target platforms}
   _Verification: Build and test on each platform_

**Questions for you:**
- Are these thresholds appropriate for your game?
- Is the frame budget allocation reasonable?
- Should we add visual quality criteria?
- Any platform-specific criteria needed?

---

### 4. Frame Budget Allocation Discussion

Help user think through frame budget allocation:

"Let's think about frame budget allocation:

**Total frame budget:** {frame_budget}ms

**Typical allocation:**
- Rendering: 8-10ms
- Game logic: 4-6ms
- Physics: 2-3ms
- Audio: 1-2ms
- Other: 1-2ms

For your spikes:
- Spike A (GPU): Should stay under {X}ms
- Spike B (CPU): Should stay under {Y}ms
- Combined: Should leave room for other systems

Does this allocation make sense for your game?"

### 5. Collaborative Refinement

For each spike, work with user to refine criteria:

**Challenge vague criteria:**
- "Looks correct" → "No visible seams between adjacent chunks"
- "Runs fast" → "GPU time < 4ms on minimum spec"
- "Feels responsive" → "Input-to-visual < 100ms"

**Ensure measurability:**
- Every criterion should have a clear verification method
- Profiler measurements should specify target hardware
- Visual criteria should have reference images if possible

**Check completeness:**
- Do these criteria fully validate the risk?
- If all criteria pass, is the risk truly mitigated?
- Have we considered frame budget impact?

### 6. Define Verification Methods (Game-Specific)

For each criterion, specify how to verify:

- **Unit test**: Automated test with assertions
- **Profiler measurement**: Unity Profiler / Unreal Insights / Godot Profiler
- **Frame timing**: Consistent frame time over X seconds
- **GPU profiler**: RenderDoc / PIX capture
- **Visual inspection**: Compare against reference (document what to look for)
- **Platform test**: Build and run on specific platform
- **Memory profiler**: Check allocations and GC behavior

### 7. Update Document

Update each spike with success criteria:

```markdown
**Success Criteria:**
- [ ] {Functional criterion}
- [ ] {Frame budget criterion with specific ms target}
- [ ] {Visual quality criterion if applicable}
- [ ] {Platform criterion if applicable}

**Validation Approach:**
{Updated with specific verification methods including profiler tools}
```

**Update frontmatter:**
- Add 5 to `stepsCompleted` array

### 8. Present Summary and Menu

"Success criteria definition complete!

**Summary:**
- Spikes with criteria defined: {count}/{total}
- Total success criteria: {count}

**Criteria breakdown:**
- Functional: {count}
- Frame Budget: {count}
- Visual Quality: {count}
- Platform: {count}
- Memory: {count}

**Frame Budget Allocation:**
- Total allocated: {sum}ms
- Remaining headroom: {frame_budget - sum}ms

**Verification Methods:**
- Profiler measurements: {count}
- Visual inspection: {count}
- Platform testing: {count}
- Unit tests: {count}

Next we'll generate the integration roadmap showing execution order.

[C] Continue to integration roadmap
[R] Review/revise success criteria

## SUCCESS METRICS:

- Every spike has measurable success criteria
- Frame budget criteria included where applicable
- Visual quality criteria included where applicable
- All criteria are objective and verifiable
- Verification methods specified using game-specific tools
- User validated criteria are appropriate
- Document updated with success criteria
- Frontmatter updated with stepsCompleted

## FAILURE MODES:

- Vague or subjective criteria ("feels fast", "looks good enough")
- Missing frame budget criteria for performance-critical spikes
- No verification method specified
- Frame budget allocation exceeds available budget
- Criteria that don't actually validate the risk
- Not getting user validation
- Not updating document and frontmatter

## NEXT STEP:

After user selects [C], load `./step-06-integration.md` to generate the integration roadmap.

Remember: Do NOT proceed until user explicitly selects [C]!
