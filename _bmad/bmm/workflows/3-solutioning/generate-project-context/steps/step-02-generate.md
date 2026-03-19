# Step 2: Context Rules Generation

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- ALWAYS treat this as collaborative discovery between technical peers
- YOU ARE A FACILITATOR, not a content generator
- FOCUS on unobvious rules that AI agents need to be reminded of
- KEEP CONTENT LEAN - optimize for LLM context efficiency
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## EXECUTION PROTOCOLS:

- Show your analysis before taking any action
- Focus on specific, actionable rules rather than general advice
- Present A/P/C menu after each major rule category
- ONLY save when user chooses C (Continue)
- Update frontmatter with completed sections
- FORBIDDEN to load next step until all sections are complete

## COLLABORATION MENUS (A/P/C):

This step will generate content and present choices for each rule category:

- **A (Advanced Elicitation)**: Use discovery protocols to explore nuanced implementation rules
- **P (Party Mode)**: Bring multiple perspectives to identify critical edge cases
- **C (Continue)**: Save the current rules and proceed to next category

## PROTOCOL INTEGRATION:

- When 'A' selected: Execute `{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml`
- When 'P' selected: Execute `{project-root}/_bmad/core/workflows/party-mode/workflow.md`
- PROTOCOLS always return to display this step's A/P/C menu after completion
- User accepts/rejects protocol changes before proceeding

## CONTEXT BOUNDARIES:

- Discovery results from step-1 are available
- Frameworks and existing patterns are identified
- Focus on rules that prevent implementation mistakes
- Prioritize unobvious details that AI agents might miss

## YOUR TASK:

Collaboratively generate specific, critical rules that AI agents must follow when implementing code in this project.

## CONTEXT GENERATION SEQUENCE:

### 1. Technology Stack & Versions

Document the exact technology stack from discovery:

**Core Technologies:**
Based on user skill level, present findings:

**Expert Mode:**
"Technology stack from your architecture and project files:
{{exact_technologies_with_versions}}

Any critical version constraints I should document for agents?"

**Intermediate Mode:**
"I found your technology stack:

**Language/Runtime:**
{{language_with_version}}

**Framework(s):**
{{frameworks_with_versions}}

**Key Dependencies:**
{{important_dependencies_with_versions}}

Are there any version constraints or compatibility notes agents should know about?"

**Beginner Mode:**
"Here are the technologies you're using:

**Main Framework:**
{{friendly_description_of_framework}}

**Important Notes:**
{{key_things_agents_need_to_know_about_versions}}

Should I document any special version rules or compatibility requirements?"

---

### 2. Framework-Specific Rules

Focus on unobvious framework patterns agents might miss:

**React/Next.js Rules (if applicable):**
"Based on your React project, I notice some specific patterns:

**Component Patterns:**
{{component_conventions}} (functional vs class, composition patterns)

**Hook Usage:**
{{hook_patterns_and_rules}} (custom hooks, hook dependencies)

**State Management:**
{{state_management_patterns}} (local state, context, external stores)

**Server Components (if Next.js):**
{{server_vs_client_component_rules}}

**Data Fetching:**
{{data_fetching_patterns}} (SWR, React Query, server actions)

Are these patterns correct? Any other React-specific rules agents should follow?"

**Vue/Nuxt Rules (if applicable):**
"Based on your Vue project, I notice some specific patterns:

**Composition vs Options API:**
{{composition_vs_options_patterns}}

**Component Communication:**
{{props_emits_provide_patterns}}

**State Management:**
{{pinia_or_vuex_patterns}}

**Composables:**
{{composable_conventions}}

Are these patterns correct? Any other Vue-specific rules agents should follow?"

**Angular Rules (if applicable):**
"Based on your Angular project, I notice some specific patterns:

**Module Organization:**
{{module_patterns}}

**Service Patterns:**
{{dependency_injection_patterns}}

**RxJS Usage:**
{{observable_patterns}}

**Component Communication:**
{{input_output_patterns}}

Are these patterns correct? Any other Angular-specific rules?"

**Backend Framework Rules (Express/NestJS/Django/Rails/FastAPI/Spring/etc.):**
"Based on your backend project, I notice some specific patterns:

**Route/Controller Organization:**
{{routing_patterns}}

**Middleware Usage:**
{{middleware_conventions}}

**Service Layer Patterns:**
{{service_architecture}}

**Dependency Injection:**
{{di_patterns_if_applicable}}

**Request Validation:**
{{validation_patterns}}

Are these patterns correct? Any other framework-specific rules?"

---

### 3. API & Data Layer Rules

Document API and database patterns:

**API Design Rules:**
"Your API follows these patterns:

**Endpoint Conventions:**
{{api_naming_patterns}} (REST resource naming, versioning)

**Request/Response Structure:**
{{payload_conventions}} (DTOs, response envelopes)

**Error Handling:**
{{error_response_patterns}} (error codes, messages, formats)

**Authentication:**
{{auth_patterns}} (JWT, sessions, API keys)

**Rate Limiting & Pagination:**
{{rate_limit_and_pagination_patterns}}

Any other API rules agents must follow?"

**Database & ORM Rules:**
"Your data layer patterns:

**Migration Conventions:**
{{migration_patterns}} (naming, structure, rollback)

**Query Patterns:**
{{query_conventions}} (raw SQL vs ORM, query builders)

**Relationship Handling:**
{{relationship_patterns}} (eager vs lazy loading, includes)

**Transaction Boundaries:**
{{transaction_rules}} (when to use transactions, isolation)

**Soft Deletes & Timestamps:**
{{soft_delete_patterns}}

Are there data layer constraints agents should know about?"

---

### 4. State Management Rules

Document state patterns (if applicable):

**Client State Rules:**
"Your state management patterns:

**State Structure:**
{{state_organization}} (normalized vs nested, slices)

**Action/Mutation Conventions:**
{{action_patterns}} (naming, async actions)

**Selectors/Computed:**
{{selector_patterns}} (memoization, derived state)

**Side Effects:**
{{side_effect_patterns}} (thunks, sagas, effects)

**Server State:**
{{server_state_patterns}} (caching, invalidation, optimistic updates)

Any state management rules agents must follow?"

---

### 5. Code Organization Rules

Document project structure and organization:

**Folder Structure:**
"Your project organization:

**Module/Feature Organization:**
{{module_structure}} (feature-based, layer-based, hybrid)

**Shared Code Location:**
{{shared_utilities_location}} (utils, helpers, common)

**Type Definitions:**
{{type_organization}} (where types/interfaces live)

**Constants & Configuration:**
{{constants_location}}

Any organization rules agents must follow?"

**Naming Conventions:**
"Your naming patterns:

**File Names:**
{{file_naming_patterns}} (kebab-case, PascalCase, etc.)

**Component/Class Names:**
{{class_naming_patterns}}

**Variable/Function Names:**
{{variable_naming_patterns}} (camelCase, snake_case)

**Constants:**
{{constant_naming_patterns}} (SCREAMING_SNAKE_CASE)

**Test Files:**
{{test_file_naming}}

Any other naming rules?"

**Import/Export Patterns:**
"Your module patterns:

**Import Order:**
{{import_order_conventions}}

**Barrel Files:**
{{barrel_file_patterns}} (index.ts usage)

**Path Aliases:**
{{path_alias_patterns}} (@/, ~/,  etc.)

Any import/export rules?"

---

### 6. Testing Rules

Focus on testing patterns that ensure consistency:

**Test Structure Rules:**
"Your testing setup shows these patterns:

**Test Organization:**
{{test_file_organization}} (co-located, separate folders)

**Test Categories:**
{{unit_vs_integration_vs_e2e_boundaries}}

**Mocking Patterns:**
{{mock_usage_conventions}} (when to mock, mock libraries)

**Test Data Management:**
{{fixture_or_factory_patterns}} (factories, fixtures, seeds)

**Assertion Style:**
{{assertion_conventions}}

Are there testing rules agents should always follow?"

**Coverage Requirements:**
"Your coverage expectations:

**Minimum Coverage:**
{{coverage_thresholds}}

**Critical Paths:**
{{must_test_areas}}

**What Not to Test:**
{{skip_testing_patterns}}

Any coverage rules?"

---

### 7. Build & Deployment Rules

Document build and deployment requirements:

**Build Configuration:**
"Your build setup:

**Build Commands:**
{{build_script_patterns}}

**Environment Variables:**
{{env_var_conventions}} (naming, .env files, secrets)

**Asset Handling:**
{{asset_build_patterns}} (images, fonts, static files)

**Bundle Optimization:**
{{bundle_optimization_rules}}

Any build rules agents must know?"

**Deployment Patterns:**
"Your deployment configuration:

**Environment Differences:**
{{environment_specific_rules}} (dev, staging, prod)

**CI/CD Requirements:**
{{ci_cd_patterns}} (required checks, deployment triggers)

**Container Rules:**
{{docker_conventions_if_applicable}}

**Infrastructure as Code:**
{{iac_patterns_if_applicable}}

Any deployment rules agents must follow?"

---

### 8. Critical Don't-Miss Rules

Identify rules that prevent common mistakes:

**Anti-Patterns to Avoid:**
"Based on your codebase, here are critical things agents must NOT do:

{{critical_anti_patterns_with_examples}}

**Security Rules:**
{{security_patterns_to_follow}}

**Performance Traps:**
{{performance_patterns_to_avoid}}

Are there other anti-patterns agents should know about?"

**Edge Cases:**
"Specific edge cases agents should handle:

{{specific_edge_cases_agents_should_handle}}

**Common Gotchas:**
{{framework_specific_gotchas}}

Are there other 'gotchas' agents should know about?"

---

### 9. Generate Context Content

For each category, prepare lean content for the project context file:

#### Content Structure:

```markdown
## Technology Stack & Versions

{{concise_technology_list_with_exact_versions}}

## Critical Implementation Rules

### Framework-Specific Rules

{{bullet_points_of_framework_rules}}

### API & Data Layer Rules

{{bullet_points_of_api_and_database_rules}}

### State Management Rules

{{bullet_points_of_state_patterns}}

### Code Organization Rules

{{bullet_points_of_organization_patterns}}

### Testing Rules

{{bullet_points_of_testing_requirements}}

### Build & Deployment Rules

{{bullet_points_of_build_and_deployment_requirements}}

### Critical Don't-Miss Rules

{{bullet_points_of_anti_patterns_and_gotchas}}
```

---

### 10. Present Content and Menu

After each category, show the generated rules and present choices:

"I've drafted the {{category_name}} rules for your project context.

**Here's what I'll add:**

[Show the complete markdown content for this category]

**What would you like to do?**
[A] Advanced Elicitation - Explore nuanced rules for this category
[P] Party Mode - Review from different implementation perspectives
[C] Continue - Save these rules and move to next category"

---

### 11. Handle Menu Selection

#### If 'A' (Advanced Elicitation):

- Execute advanced-elicitation workflow with current category rules
- Process enhanced rules that come back
- Ask user: "Accept these enhanced rules for {{category}}? (y/n)"
- If yes: Update content, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'P' (Party Mode):

- Execute party-mode workflow with category rules context
- Process collaborative insights on implementation patterns
- Ask user: "Accept these changes to {{category}} rules? (y/n)"
- If yes: Update content, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'C' (Continue):

- Save the current category content to project context file
- Update frontmatter: `stepsCompleted: [...]`
- Proceed to next category or step-03 if complete

## APPEND TO PROJECT CONTEXT:

When user selects 'C' for a category, append the content directly to `{output_folder}/project-context.md` using the structure from section 9.

## SUCCESS METRICS:

- All critical technology versions accurately documented
- Framework-specific rules cover unobvious patterns
- API and data layer rules capture project requirements
- Code organization rules maintain project standards
- Testing rules ensure consistent test quality
- Build and deployment rules prevent CI/CD issues
- Content is lean and optimized for LLM context
- A/P/C menu presented and handled correctly for each category

## FAILURE MODES:

- Including obvious rules that agents already know
- Making content too verbose for LLM context efficiency
- Missing critical anti-patterns or edge cases
- Not getting user validation for each rule category
- Not documenting exact versions and configurations
- Not presenting A/P/C menu after content generation

## NEXT STEP:

After completing all rule categories and user selects 'C' for the final category, load `./step-03-complete.md` to finalize the project context file.

Remember: Do NOT proceed to step-03 until all categories are complete and user explicitly selects 'C' for each!
