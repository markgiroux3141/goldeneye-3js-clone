# Step 3: Execute Spike

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input on key decisions
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- This is EXPLORATORY work - spikes can fail and that's valuable
- Implement MINIMUM code needed to validate - this is NOT production code
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Spike selected and isolation set up
- `spike_name`, `spike_definition`, `spike_success_criteria`, `isolation_type`, `isolation_path` are set
- Focus on MINIMAL implementation to validate the spike

## YOUR TASK:

Implement the minimal proof-of-concept code needed to validate the spike's technical risk.

## EXECUTION SEQUENCE:

### 1. Present Implementation Plan

Based on the spike definition, present the approach:

"**Executing Spike: {spike_name}**

**Goal:** {what_to_test}

**Implementation Plan:**
1. {minimal step 1}
2. {minimal step 2}
3. {minimal step 3}
...

**Success Criteria to Validate:**
- [ ] {criterion_1}
- [ ] {criterion_2}
...

**Isolation:** {isolation_type} at {isolation_path}

**SPIKE MINDSET REMINDER:**
- Implement the MINIMUM to validate
- Hardcode values where possible
- Skip error handling unless testing error handling
- Skip optimization unless testing performance
- Use simple test data (e.g., sphere instead of complex shape)

[C] Continue with implementation
[A] Adjust implementation plan"

### 2. Execute Implementation

Implement the spike following these principles:

**DO:**
- Use simplest possible test data
- Hardcode configuration values
- Add instrumentation for validation (timing, logging)
- Write code that directly addresses success criteria
- Document any assumptions inline

**DON'T:**
- Add comprehensive error handling
- Optimize prematurely
- Handle edge cases (unless that's the spike)
- Create abstractions or reusable code
- Follow all production coding standards

### 3. Implementation Loop

For each part of the implementation:

1. Write the code
2. Run/test incrementally
3. If blocked, document and present options

**Continue until:**
- Basic implementation is complete (can attempt validation)
- OR a blocking issue is encountered

### 4. Handle Blockers

If a blocker is encountered:

"**Implementation Blocked**

**Issue:** {description of blocker}

**What was attempted:**
{what was tried}

**Options:**

[R] Retry with different approach: {alternative}
[P] Partial completion - proceed to validation with what works
[F] Mark spike as failed - document learnings

Note: Spike failure is a VALID outcome - it tells us the approach doesn't work."

### 5. Implementation Complete Checkpoint

When basic implementation is done:

"**Implementation Checkpoint**

**Completed:**
{summary of what was implemented}

**Files created/modified:**
- {file_1}
- {file_2}
...

**Ready to validate these criteria:**
- [ ] {criterion_1}
- [ ] {criterion_2}
...

**Notes/Observations during implementation:**
{any important observations}

[C] Continue to validation
[I] Continue implementing (not ready yet)
[B] Blocked - need to document failure"

## HALT CONDITIONS

**HALT and seek guidance if:**
- Fundamental approach doesn't work after reasonable attempt
- Blocking dependency discovered that wasn't in spike plan
- Scope is much larger than expected
- 3 consecutive failures on same issue

**Do NOT halt for:**
- Minor issues that can be worked around
- Non-critical edge cases
- Code quality concerns (this is a spike)
- Missing optimizations

## SUCCESS METRICS:

- Minimal implementation completed
- Code directly addresses success criteria
- Implementation stayed focused (didn't gold-plate)
- Blockers documented if encountered
- User confirmed ready for validation

## FAILURE MODES:

- Over-engineering the spike
- Not implementing enough to validate criteria
- Giving up too early on a solvable problem
- Not documenting blockers when they occur
- Proceeding to validation when not ready

## NEXT STEP:

After user selects [C], load `./step-04-validate.md` to validate each success criterion.

Remember: Do NOT proceed until user confirms implementation is ready for validation!
