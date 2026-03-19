# Step 5: Document Learnings (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER skip learnings documentation - this is the PRIMARY deliverable
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- Learnings are valuable regardless of spike outcome
- Failed spikes often teach MORE than successful ones
- Frame budget learnings are especially valuable
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Validation complete from step-04
- `criteria_results`, `spike_outcome`, `frame_budget_used` are set
- Focus on capturing game-specific learnings

## YOUR TASK:

Facilitate documentation of what was learned, with special attention to performance, visual debugging effectiveness, and platform implications.

## EXECUTION SEQUENCE:

### 1. Present Outcome Context

"**Documenting Learnings: {spike_name}**
**Engine: {game_engine}**

**Outcome:** {spike_outcome}

**Frame Budget:**
- Target: {frame_budget_ms}ms
- Actual: {frame_budget_used}ms
- Status: {UNDER/OVER}

**Criteria Results:**
{list criteria with pass/fail and measurements}

Let's capture what we learned. These learnings inform implementation decisions.

### 2. Guided Learning Capture (Game-Specific)

Work through each category:

---

**What Worked Well?**

"What aspects of the implementation worked as expected?"

{Facilitate discussion}

Game-specific prompts:
- Did the visual debugging help identify issues?
- Was the algorithm straightforward to implement?
- Did the frame budget allow headroom for other systems?
- Did the engine features work as expected?

---

**What Didn't Work?**

"What challenges or problems were encountered?"

{Facilitate discussion}

Game-specific prompts:
- Were there frame budget issues?
- Did visual debugging reveal unexpected behavior?
- Were there engine-specific gotchas?
- Did platform differences cause issues?

---

**Frame Budget Analysis** (if applicable)

"Let's analyze the frame budget results:

**Measured:** {frame_budget_used}ms
**Budget:** {frame_budget_ms}ms
**Headroom:** {remaining}ms

{If over budget:}
- What operations consumed the most time?
- Can this be optimized?
- Is this acceptable with reduced scope?
- Should architecture be reconsidered?

{If under budget:}
- Is there headroom for additional features?
- Is quality being sacrificed for performance?
- Is the measurement representative of final complexity?"

---

**Visual Debugging Effectiveness**

"How effective was the visual debugging?

- What visualization helped most?
- What additional debug viz would have helped?
- Should these debug tools be kept for development?"

---

**Implications for Main Implementation**

"How should this spike's results influence the main implementation?"

{Facilitate discussion based on outcome}

**If SUCCESS:**
- Approach is validated - proceed with confidence
- Note frame budget allocation for this system
- Document any refinements needed at scale

**If PARTIAL:**
- What worked should be kept
- What failed needs alternative approach
- Consider performance/quality tradeoffs

**If FAILED:**
- Document why the approach doesn't work
- Is it a performance issue or correctness issue?
- Suggest alternative approaches
- Consider if architecture needs revision

---

**Platform Considerations**

"Any platform-specific observations?

- Will this work on all target platforms?
- Any mobile-specific concerns?
- Console memory/performance implications?
- Shader compatibility issues observed?"

---

**Alternative Approaches**

{If relevant, especially for partial/failed}

"Based on what we learned, are there alternative approaches?

- Different algorithm?
- GPU vs CPU tradeoff?
- Quality vs performance tradeoff?
- Simpler approach that might work?"

### 3. Failure Analysis (if applicable)

If `spike_outcome` is "partial" or "failed":

"**Failure Analysis**

**Root Cause:**
{Facilitate identification}

Categories:
- [ ] Performance issue (correct but too slow)
- [ ] Correctness issue (wrong output)
- [ ] Engine limitation
- [ ] Approach fundamentally flawed

**Was the spike well-designed?**
- Were the success criteria appropriate?
- Was the frame budget target realistic?
- Were dependencies properly identified?

**Recommendation:**
[A] Try alternative approach (specify: _______)
[O] Optimize current approach
[R] Revise architecture for this component
[S] Accept reduced scope/quality
[D] Defer this functionality"

### 4. Compile Learnings

Compile all captured learnings:

```markdown
## Spike Learnings

**Outcome:** {spike_outcome}

### Frame Budget Analysis
- Target: {target}ms | Actual: {actual}ms
- Status: {under/over by X}
- {analysis notes}

### What Worked
{compiled from discussion}

### What Didn't Work
{compiled from discussion}

### Visual Debugging Notes
{what viz helped, what to add}

### Platform Considerations
{any platform-specific notes}

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
- Frame budget analysis completed
- Platform considerations documented
- Implications for implementation clear
- User confirmed learnings are complete

## FAILURE MODES:

- Skipping frame budget analysis
- Not capturing platform considerations
- Generic/unhelpful learnings
- Not identifying implications

## NEXT STEP:

After user selects [C], load `./step-06-update-plan.md` to update the spike plan.

Remember: Do NOT proceed until user confirms learnings are complete!
