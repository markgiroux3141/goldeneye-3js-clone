# Step 5: Document Learnings

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER skip learnings documentation - this is the PRIMARY deliverable
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- Learnings are valuable regardless of spike outcome
- Failed spikes often teach MORE than successful ones
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Validation complete from step-04
- `criteria_results` and `spike_outcome` are set
- Focus on capturing learnings - spike plan update is step-06

## YOUR TASK:

Facilitate documentation of what was learned from this spike, regardless of success or failure.

## EXECUTION SEQUENCE:

### 1. Present Outcome Context

"**Documenting Learnings: {spike_name}**

**Outcome:** {spike_outcome}

**Criteria Results:**
{list criteria with pass/fail and measurements}

Let's capture what we learned. These learnings are the primary value of spikes - they inform implementation decisions.

### 2. Guided Learning Capture

Work through each category:

---

**What Worked Well?**

"What aspects of the implementation worked as expected or better?"

{Facilitate discussion, capture response}

Examples to prompt:
- The algorithm was straightforward to implement
- Performance exceeded expectations
- The library/framework worked well
- Test data was easy to generate

---

**What Didn't Work?**

"What challenges or problems were encountered?"

{Facilitate discussion, capture response}

Examples to prompt:
- Edge cases were harder than expected
- Documentation was insufficient
- Performance was worse than expected
- Dependencies were problematic

---

**Surprises or Unexpected Findings?**

"What surprised you during this spike? Anything you didn't anticipate?"

{Facilitate discussion, capture response}

Examples to prompt:
- Hidden complexity in seemingly simple task
- Better approaches discovered during implementation
- Dependencies or constraints not in original plan
- Performance characteristics different than assumed

---

**Implications for Main Implementation**

"How should this spike's results influence the main implementation?"

{Facilitate discussion based on outcome}

**If SUCCESS:**
- Approach is validated - proceed with confidence
- Note any refinements needed at scale
- Identify what to carry forward

**If PARTIAL:**
- What worked should be kept
- What failed needs alternative approach
- Consider scope reduction

**If FAILED:**
- Document why the approach doesn't work
- Suggest alternative approaches
- Consider if architecture needs revision

---

**Alternative Approaches to Consider**

{Only if relevant, especially for partial/failed}

"Based on what we learned, are there alternative approaches to consider?"

{Facilitate discussion, capture response}

### 3. Failure Analysis (if applicable)

If `spike_outcome` is "partial" or "failed":

"**Failure Analysis**

Let's understand why parts of this spike didn't work.

**Root Cause:**
{Facilitate identification of root cause}

**Was the spike well-designed?**
- Were the success criteria appropriate?
- Was the isolation approach correct?
- Were dependencies properly identified?

**Recommendation:**
[A] Try alternative approach (specify: _______)
[R] Revise architecture for this component
[S] Accept risk and proceed with awareness
[D] Defer this functionality"

### 4. Compile Learnings

Compile all captured learnings into structured format:

```markdown
## Spike Learnings

**Outcome:** {spike_outcome}

### What Worked
{compiled from discussion}

### What Didn't Work
{compiled from discussion}

### Surprises/Unexpected
{compiled from discussion}

### Implications for Implementation
{compiled from discussion}

### Alternative Approaches
{if applicable}

### Failure Analysis
{if partial/failed}
- Root Cause: {cause}
- Recommendation: {recommendation}
```

### 5. User Review

"**Compiled Learnings:**

{show compiled learnings}

Does this accurately capture what we learned?

[C] Continue - learnings are complete
[E] Edit learnings
[A] Add more learnings"

### 6. Set State Variables

```yaml
learnings: "{compiled_learnings_markdown}"
```

## SUCCESS METRICS:

- All learning categories addressed
- Learnings captured for both successes and failures
- Implications for implementation clearly stated
- User confirmed learnings are complete
- Failure analysis done if applicable

## FAILURE MODES:

- Skipping learnings for "obvious" spikes
- Not capturing failure learnings
- Not identifying implications
- Generic/unhelpful learnings
- Not getting user confirmation

## NEXT STEP:

After user selects [C], load `./step-06-update-plan.md` to update the spike plan.

Remember: Do NOT proceed until user confirms learnings are complete!
