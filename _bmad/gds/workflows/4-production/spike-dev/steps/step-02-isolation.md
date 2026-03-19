# Step 2: Isolation Setup (Game Development)

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- CRITICAL: ALWAYS read the complete step file before taking any action
- CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ALWAYS treat this as collaborative setup between technical peers
- YOU ARE A FACILITATOR guiding engine-specific isolation setup
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## CONTEXT BOUNDARIES:

- Spike has been selected in step-01
- Game engine and frame budget are known
- Focus ONLY on setting up isolation - execution is step-03

## YOUR TASK:

Guide the user through setting up an isolated environment appropriate for this spike, with engine-specific guidance.

## EXECUTION SEQUENCE:

### 1. Load Isolation Guidance

Load `{data_files_path}/isolation-guidance.yaml` to understand:
- Available isolation approaches
- Engine-specific setup guidance
- Pattern-to-isolation recommendations

### 2. Analyze Spike for Isolation Recommendation

Based on the spike definition and game engine, determine the best isolation approach:

**Consider:**
- Does it need rendering context? → Test Scene
- Is it a pure algorithm? → Console/Script
- Does it need full project context? → Sandbox Branch
- Does it need clean environment? → Test Project

### 3. Present Isolation Options (Engine-Specific)

"**Spike: {spike_name}**
**Engine: {game_engine}**

**What to Test:** {what_to_test}

**Recommended Isolation:** {recommendation} ← Based on spike type

**Choose isolation approach:**

[1] **Console/Script** - Editor script or tool
    {engine_specific_guidance_for_console}

[2] **Test Scene/Level** - Isolated scene in project ← Recommended for visual spikes
    {engine_specific_guidance_for_scene}

[3] **Test Project** - Separate project entirely
    {engine_specific_guidance_for_project}

[4] **Sandbox Branch** - Git branch for throwaway code
    Works with any engine - changes deleted after spike

Which approach? [1-4]"

### 4. Provide Engine-Specific Setup

**For Console/Script [1]:**

**Unity:**
```
Create: Assets/Editor/Spikes/{spike-name}/SpikeRunner.cs

using UnityEditor;
using UnityEngine;

public class Spike_{name} : EditorWindow
{
    [MenuItem("Spikes/{spike-name}")]
    static void Run() { GetWindow<Spike_{name}>(); }

    void OnGUI() {
        if (GUILayout.Button("Run Spike")) {
            // Spike code here
        }
    }
}
```

**Unreal:**
```
Create: Source/Editor/Spikes/{spike-name}/

// Console command approach
UFUNCTION(Exec)
void RunSpike_{name}();
```

**Godot:**
```
Create: res://spikes/{spike-name}/spike_runner.gd

@tool
extends EditorScript

func _run():
    # Spike code here
    pass
```

---

**For Test Scene [2]:**

**Unity:**
```
1. Create Scene: Assets/Scenes/Spikes/Spike_{name}.unity
2. Add empty GameObject named "SpikeRunner"
3. Attach spike MonoBehaviour
4. Open Profiler: Window > Analysis > Profiler
5. Enable Gizmos in Scene view for debug viz
```

**Unreal:**
```
1. Create Level: Content/Spikes/Spike_{name}
2. Add empty Actor with spike component
3. Enable: Show > Debug
4. Open: Session Frontend for profiling
```

**Godot:**
```
1. Create Scene: res://spikes/spike_{name}.tscn
2. Add Node with spike script
3. Open: Debugger > Monitors
4. Use _draw() for visualization
```

---

**For Test Project [3]:**

```
Create project at: ../{project_name}_Spike_{name}/
Use minimal template - only add needed packages/plugins
```

---

**For Sandbox Branch [4]:**

```
git checkout -b spike/{spike-name}

Remember:
- This branch will be DELETED
- Do NOT merge - extract learnings only
- Commit often with descriptive messages
```

### 5. Remind About Visual Debugging

"**Visual Debugging Setup**

For this spike, consider setting up:
{from visual-debug-patterns.yaml based on spike type}

- {specific viz approach 1}
- {specific viz approach 2}

This will help validate success criteria visually."

### 6. Capture Baseline

If using git:
```bash
git rev-parse HEAD
```
Store as `baseline_commit`.

### 7. Confirm Isolation Ready

"**Isolation Setup Complete**

- Engine: {game_engine}
- Type: {isolation_type}
- Location: {isolation_path}
- Baseline: {baseline_commit or "N/A"}
- Frame budget: {frame_budget_ms}ms

**SPIKE MINDSET REMINDER:**
- Implement the MINIMUM to validate
- Use debug visualization liberally
- Measure frame time early and often
- Hardcode values where possible

[C] Continue to execution
[R] Redo isolation setup"

### 8. Set State Variables

```yaml
isolation_type: "{selected_type}"
isolation_path: "{path_to_isolation}"
baseline_commit: "{git_hash_or_empty}"
```

## SUCCESS METRICS:

- Engine-specific guidance provided
- Appropriate isolation type selected
- Visual debugging setup discussed
- User confirmed isolation is set up
- State variables recorded

## FAILURE MODES:

- Not providing engine-specific guidance
- Not recommending visual debugging setup
- Not capturing baseline commit
- Proceeding without user confirming setup

## NEXT STEP:

After user selects [C], load `./step-03-execute.md` to implement the spike.

Remember: Do NOT proceed until user explicitly confirms isolation is ready!
