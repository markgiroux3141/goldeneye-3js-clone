# Step 5: Success Criteria Definition

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
- Focus ONLY on defining measurable success criteria
- Criteria must be objective and verifiable

## YOUR TASK:

Define clear, measurable success criteria for each spike so there's no ambiguity about whether a spike succeeded or failed.

## EXECUTION SEQUENCE:

### 1. Review Success Criteria Principles

Good success criteria are:
- **Objective** - No subjective judgment required
- **Measurable** - Can be verified with tests, measurements, or inspection
- **Specific** - Not vague or open to interpretation
- **Binary** - Pass or fail, not "mostly works"

### 2. Identify Criteria Types

For each spike, consider which criteria types apply:

**Functional Criteria:**
- Does it produce correct output?
- Does it handle expected inputs?
- Does it handle edge cases?

**Performance Criteria:**
- Response time / latency
- Throughput / operations per second
- Memory usage
- Resource consumption

**Reliability Criteria:**
- Error handling works correctly
- Graceful degradation
- Recovery from failures

**Integration Criteria:**
- Data flows correctly between components
- Interfaces match expectations
- Error states communicated properly

### 3. Draft Criteria for Each Spike

For each spike, propose 2-4 success criteria:

"Let's define success criteria for each spike. I'll propose some based on what each spike is testing.

---

**Spike {N}: {Name}**

Testing: {what this spike tests}
Risk: {risk being validated}

**Proposed Success Criteria:**

1. [ ] {Functional criterion}
   _Verification: {how to verify}_

2. [ ] {Performance criterion with specific number}
   _Verification: {how to verify}_

3. [ ] {Additional criterion as appropriate}
   _Verification: {how to verify}_

**Questions for you:**
- Are these criteria sufficient to prove the risk is mitigated?
- Are the thresholds (numbers) appropriate for your context?
- Should we add or remove any criteria?

---

### 4. Collaborative Refinement

For each spike, work with user to refine criteria:

**Challenge vague criteria:**
- "Works correctly" → "Output matches expected values for test cases A, B, C"
- "Fast enough" → "Completes in < 100ms for 1000 records"
- "Handles errors" → "Returns error code and does not crash for invalid input"

**Ensure measurability:**
- Every criterion should have a clear verification method
- If you can't describe how to verify it, it's not measurable

**Check completeness:**
- Do these criteria fully validate the risk?
- If all criteria pass, is the risk truly mitigated?

### 5. Define Verification Methods

For each criterion, specify how to verify:

- **Unit test**: Automated test with assertions
- **Integration test**: Test with real dependencies
- **Manual inspection**: Visual verification (document what to look for)
- **Profiling**: Use specific profiling tool
- **Load test**: Test under specified load conditions
- **Log analysis**: Check logs for specific patterns

### 6. Update Document

Update each spike with success criteria:

```markdown
**Success Criteria:**
- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

**Validation Approach:**
{Updated with specific verification methods}
```

**Update frontmatter:**
- Add 5 to `stepsCompleted` array

### 7. Present Summary and Menu

"Success criteria definition complete!

**Summary:**
- Spikes with criteria defined: {count}/{total}
- Total success criteria: {count}
- Criteria breakdown:
  - Functional: {count}
  - Performance: {count}
  - Reliability: {count}
  - Integration: {count}

**Validation Methods:**
- Unit tests: {count} criteria
- Manual inspection: {count} criteria
- Profiling: {count} criteria
- Other: {count} criteria

Next we'll generate the integration roadmap showing execution order.

[C] Continue to integration roadmap
[R] Review/revise success criteria

## SUCCESS METRICS:

- Every spike has 2-4 measurable success criteria
- All criteria are objective and verifiable
- Verification methods specified for each criterion
- User validated criteria are appropriate
- Document updated with success criteria
- Frontmatter updated with stepsCompleted

## FAILURE MODES:

- Vague or subjective criteria ("works well", "fast enough")
- Missing criteria for key aspects of the spike
- No verification method specified
- Criteria that don't actually validate the risk
- Not getting user validation
- Not updating document and frontmatter

## NEXT STEP:

After user selects [C], load `./step-06-integration.md` to generate the integration roadmap.

Remember: Do NOT proceed until user explicitly selects [C]!
