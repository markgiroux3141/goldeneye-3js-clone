# Step 3: Execute Spike (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input on key decisions
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- This is EXPLORATORY work - spikes can fail and that's valuable
- Implement MINIMUM code needed to validate - this is NOT production code
- ADD VISUAL DEBUGGING - this is essential for game spikes
- MEASURE FRAME TIME EARLY - don't wait until validation
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Spike selected and isolation set up
- Game engine and frame budget are known
- Visual debugging patterns available in `{data_files_path}/visual-debug-patterns.yaml`
- Focus on MINIMAL implementation to validate the spike

## YOUR TASK:

Implement the minimal proof-of-concept code with visual debugging and frame timing instrumentation.

## EXECUTION SEQUENCE:

### 1. Load Visual Debug Patterns

Load `{data_files_path}/visual-debug-patterns.yaml` for engine-specific debugging approaches.

### 2. Present Implementation Plan

"**Executing Spike: {spike_name}**
**Engine: {game_engine}**
**Frame Budget: {frame_budget_ms}ms**

**Goal:** {what_to_test}

**Implementation Plan:**
1. {minimal step 1}
2. {minimal step 2}
3. {minimal step 3}
...

**Visual Debugging to Add:**
{from visual-debug-patterns.yaml}
- {specific debug viz 1}
- {specific debug viz 2}

**Frame Timing to Add:**
{engine-specific timing code}

**Success Criteria to Validate:**
- [ ] {criterion_1}
- [ ] {criterion_2} {highlight if frame budget criterion}
...

**SPIKE MINDSET REMINDER:**
- Implement the MINIMUM to validate
- Use simple test data (sphere SDF, basic shapes)
- Add debug visualization FIRST
- Add frame timing instrumentation EARLY
- Skip error handling unless testing error handling
- Skip optimization unless testing performance

[C] Continue with implementation
[A] Adjust implementation plan"

### 3. Add Visual Debugging First

Before main implementation, add debug visualization:

**Unity Example:**
```csharp
void OnDrawGizmos() {
    Gizmos.color = Color.green;
    Gizmos.DrawWireCube(transform.position, bounds);
}

void OnGUI() {
    GUI.Label(new Rect(10, 10, 300, 20), $"Frame: {Time.deltaTime * 1000:F2}ms");
}
```

**Unreal Example:**
```cpp
DrawDebugBox(GetWorld(), Location, Extent, FColor::Green);

GEngine->AddOnScreenDebugMessage(-1, 0.f, FColor::Yellow,
    FString::Printf(TEXT("Frame: %.2fms"), DeltaTime * 1000.f));
```

**Godot Example:**
```gdscript
func _draw():
    draw_rect(bounds, Color.GREEN, false)

func _process(delta):
    print("Frame: %.2fms" % (delta * 1000.0))
```

### 4. Execute Implementation

Implement the spike following these principles:

**DO:**
- Add visual debugging for spatial data
- Add frame time display
- Use simplest possible test data
- Hardcode configuration values
- Document any assumptions inline

**DON'T:**
- Add comprehensive error handling
- Optimize prematurely
- Handle edge cases (unless that's the spike)
- Create abstractions
- Worry about code quality

### 5. Monitor Frame Time During Development

As you implement, regularly check frame time:

"**Frame Time Check**

Current frame time: {measurement}ms
Budget: {frame_budget_ms}ms
Status: {UNDER/OVER budget}

{If over budget early:}
⚠️ Already over frame budget. Consider:
- Simplifying the test case
- Reducing iteration count
- This spike may validate that the approach is too expensive

Continue? [Y/N]"

### 6. Implementation Loop

For each part of the implementation:

1. Write the code
2. Run and observe visual debug output
3. Check frame time
4. If blocked, document and present options

**Continue until:**
- Basic implementation is complete (can attempt validation)
- OR a blocking issue is encountered

### 7. Handle Blockers

If a blocker is encountered:

"**Implementation Blocked**

**Issue:** {description of blocker}

**What was attempted:**
{what was tried}

**Frame Time Observed:** {if measured}

**Options:**

[R] Retry with different approach: {alternative}
[P] Partial completion - proceed to validation with what works
[F] Mark spike as failed - document learnings

Note: Spike failure is a VALID outcome. If this approach can't meet frame budget, that's valuable information."

### 8. Implementation Complete Checkpoint

"**Implementation Checkpoint**

**Completed:**
{summary of what was implemented}

**Files created/modified:**
- {file_1}
- {file_2}

**Visual Debugging Added:**
- {debug viz 1}
- {debug viz 2}

**Current Frame Time:** {measurement}ms (budget: {frame_budget_ms}ms)

**Ready to validate these criteria:**
- [ ] {criterion_1}
- [ ] {criterion_2}

**Observations during implementation:**
{any important observations about performance, approach, etc.}

[C] Continue to validation
[I] Continue implementing (not ready yet)
[B] Blocked - need to document failure"

## HALT CONDITIONS

**HALT and seek guidance if:**
- Frame budget exceeded by 3x or more early in implementation
- Fundamental approach doesn't work after reasonable attempt
- Blocking dependency discovered
- Scope is much larger than expected
- 3 consecutive failures on same issue

**Do NOT halt for:**
- Minor frame budget overrun (can optimize later)
- Non-critical edge cases
- Code quality concerns
- Visual glitches (unless testing visuals)

## SUCCESS METRICS:

- Minimal implementation completed
- Visual debugging added and working
- Frame timing instrumented
- Code directly addresses success criteria
- User confirmed ready for validation

## FAILURE MODES:

- Not adding visual debugging
- Not measuring frame time during dev
- Over-engineering the spike
- Not implementing enough to validate
- Ignoring major frame budget violations

## NEXT STEP:

After user selects [C], load `./step-04-validate.md` to validate each success criterion.

Remember: Do NOT proceed until user confirms implementation is ready!
