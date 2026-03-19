# Step 2: Isolation Setup

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ALWAYS treat this as collaborative setup between technical peers
- YOU ARE A FACILITATOR guiding isolation setup
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Spike has been selected in step-01
- `spike_name`, `spike_definition`, `spike_success_criteria` are set
- Focus ONLY on setting up isolation - execution is step-03

## YOUR TASK:

Guide the user through setting up an isolated environment appropriate for this spike.

## EXECUTION SEQUENCE:

### 1. Load Isolation Guidance

Load `{data_files_path}/isolation-guidance.yaml` to understand:
- Available isolation approaches
- Pattern-to-isolation recommendations
- Setup guidance for each approach

### 2. Analyze Spike for Isolation Recommendation

Based on the spike definition, determine the best isolation approach:

**Consider:**
- What is being tested (algorithm, integration, infrastructure)
- Does it need project context?
- Does it involve external services?
- Is it purely computational?

### 3. Present Isolation Options

"**Spike: {spike_name}**

**What to Test:** {what_to_test}

**Recommended Isolation:** {recommendation} ← Based on spike type

**Choose isolation approach:**

[1] **Console/Script** - Standalone test script
    Best for: Algorithms, data transforms, API calls
    Setup: Create `spikes/{spike-name}/main.{ext}`

[2] **Test Project** - Separate project entirely
    Best for: Infrastructure, framework evaluation
    Setup: Create project at `../spike-{name}/`

[3] **Sandbox Branch** - Git branch for throwaway code
    Best for: Integration with existing code, refactoring exploration
    Setup: `git checkout -b spike/{spike-name}`

Which approach? [1-3]"

### 4. Guide Setup Based on Selection

**For Console/Script [1]:**
```
Setting up console spike...

1. Create directory: `spikes/{spike-name}/`
2. Create main file: `spikes/{spike-name}/main.{ext}`
3. Add any test data files needed

Suggested file structure:
spikes/
  {spike-name}/
    main.{ext}
    test-data/
    README.md (optional - for notes)

[C] Continue - isolation is ready
[G] Need more guidance
```

**For Test Project [2]:**
```
Setting up test project spike...

1. Create project outside main repo: `../spike-{spike-name}/`
2. Initialize with minimal template
3. Add only dependencies needed for this spike

Suggested location: {parent_dir}/spike-{spike-name}/

[C] Continue - project is created
[G] Need more guidance
```

**For Sandbox Branch [3]:**
```
Setting up sandbox branch...

Run: git checkout -b spike/{spike-name}

Important reminders:
- This branch will be DELETED after spike completion
- Do NOT merge to main - extract learnings only
- Commit frequently with descriptive messages

[C] Continue - branch is created
[G] Need more guidance
```

### 5. Capture Baseline (if git)

If using git (sandbox branch or if main repo has git):
```bash
git rev-parse HEAD
```
Store as `baseline_commit` for later diff generation.

### 6. Confirm Isolation Ready

"**Isolation Setup Complete**

- Type: {isolation_type}
- Location: {isolation_path}
- Baseline: {baseline_commit or "N/A"}

**Reminder:** This is a SPIKE - implement the MINIMUM needed to validate.
- No production-quality code required
- No comprehensive error handling needed
- No optimization needed (unless that's what you're testing)

[C] Continue to execution
[R] Redo isolation setup"

### 7. Set State Variables

```yaml
isolation_type: "{selected_type}"
isolation_path: "{path_to_isolation}"
baseline_commit: "{git_hash_or_empty}"
```

## SUCCESS METRICS:

- Appropriate isolation type selected
- User confirmed isolation is set up
- State variables recorded
- Baseline captured if applicable
- User understands spike mindset (minimal, exploratory)

## FAILURE MODES:

- Not recommending appropriate isolation
- Not capturing baseline commit
- Proceeding without user confirming setup complete
- Not setting state variables
- Not reminding about minimal implementation mindset

## NEXT STEP:

After user selects [C], load `./step-03-execute.md` to implement the spike.

Remember: Do NOT proceed until user explicitly confirms isolation is ready!
