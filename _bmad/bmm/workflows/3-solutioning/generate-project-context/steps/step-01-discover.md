# Step 1: Context Discovery & Initialization

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER generate content without user input
- ALWAYS treat this as collaborative discovery between technical peers
- YOU ARE A FACILITATOR, not a content generator
- FOCUS on discovering existing project context and technology stack
- IDENTIFY critical implementation rules that AI agents need
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

## EXECUTION PROTOCOLS:

- Show your analysis before taking any action
- Read existing project files to understand current context
- Initialize document and update frontmatter
- FORBIDDEN to load next step until discovery is complete

## CONTEXT BOUNDARIES:

- Variables from workflow.md are available in memory
- Focus on existing project files and architecture decisions
- Look for patterns, conventions, and unique requirements
- Prioritize rules that prevent implementation mistakes

## YOUR TASK:

Discover the project's technology stack, frameworks, existing patterns, and critical implementation rules that AI agents must follow when writing code.

## DISCOVERY SEQUENCE:

### 1. Check for Existing Project Context

First, check if project context already exists:

- Look for file at `{output_folder}/project-context.md`
- If exists: Read complete file to understand existing rules
- Present to user: "Found existing project context with {number_of_sections} sections. Would you like to update this or create a new one?"

If existing context found with `stepsCompleted` in frontmatter:
- **STOP here** and load `./step-01b-continue.md` immediately
- Do not proceed with any initialization tasks

### 2. Discover Technology Stack & Frameworks

Load and analyze project files to identify technologies:

**Architecture Document:**
- Look for `{planning_artifacts}/architecture.md` or `{output_folder}/*architecture*.md`
- Extract technology decisions with specific versions
- Note architectural decisions that affect implementation

**Frontend Framework Detection:**
- React: Check `package.json` for react dependency, look for `.jsx`/`.tsx` files
- Vue: Check `package.json` for vue dependency, look for `.vue` files
- Angular: Check for `angular.json`, `package.json` with @angular/*
- Svelte: Check for `svelte.config.js`, `.svelte` files
- Next.js: Check for `next.config.js`, `next.config.mjs`
- Nuxt: Check for `nuxt.config.ts`, `nuxt.config.js`
- SolidJS: Check `package.json` for solid-js
- Astro: Check for `astro.config.mjs`

**Backend Framework Detection:**
- Express/Node: Check `package.json` for express, fastify, koa, hapi
- NestJS: Check `package.json` for @nestjs/core, look for nest-cli.json
- Django: Check for `manage.py`, `settings.py`, `requirements.txt` with Django
- Flask: Check for `requirements.txt` or `pyproject.toml` with flask
- FastAPI: Check for `requirements.txt` or `pyproject.toml` with fastapi
- Rails: Check for `Gemfile` with rails, `config/routes.rb`
- Spring: Check for `pom.xml` with spring-boot, `build.gradle` with spring
- .NET: Check for `.csproj` files, `Program.cs`
- Go: Check for `go.mod`, `main.go`
- Rust: Check for `Cargo.toml`

**Database & ORM Detection:**
- Prisma: Check for `prisma/schema.prisma`
- TypeORM: Check `package.json` for typeorm
- Sequelize: Check `package.json` for sequelize
- Drizzle: Check `package.json` for drizzle-orm
- Mongoose: Check `package.json` for mongoose
- SQLAlchemy: Check for imports in Python files
- Django ORM: Detected with Django
- Entity Framework: Check `.csproj` for EF packages
- ActiveRecord: Detected with Rails

**Build & Tooling Detection:**
- Vite: Check for `vite.config.js/ts`
- Webpack: Check for `webpack.config.js`
- esbuild: Check `package.json` for esbuild
- Rollup: Check for `rollup.config.js`
- Turbo: Check for `turbo.json`
- Nx: Check for `nx.json`
- Lerna: Check for `lerna.json`

**Package Manager Detection:**
- npm: Check for `package-lock.json`
- pnpm: Check for `pnpm-lock.yaml`
- yarn: Check for `yarn.lock`
- bun: Check for `bun.lockb`
- pip: Check for `requirements.txt`
- poetry: Check for `poetry.lock`, `pyproject.toml`
- cargo: Check for `Cargo.lock`
- bundler: Check for `Gemfile.lock`

**CI/CD & Infrastructure Detection:**
- GitHub Actions: Check `.github/workflows/`
- GitLab CI: Check `.gitlab-ci.yml`
- CircleCI: Check `.circleci/config.yml`
- Docker: Check for `Dockerfile`, `docker-compose.yml`
- Kubernetes: Check for `k8s/`, kubernetes manifests

**Testing Framework Detection:**
- Jest: Check `package.json` for jest
- Vitest: Check `package.json` for vitest
- Playwright: Check `package.json` for @playwright/test
- Cypress: Check for `cypress.config.js/ts`
- pytest: Check for `pytest.ini`, `conftest.py`
- RSpec: Check for `spec/` directory with Rails
- Go testing: Check for `_test.go` files

### 3. Identify Existing Code Patterns

Search through existing codebase for patterns:

**Naming Conventions:**
- File naming patterns (kebab-case, PascalCase, camelCase, snake_case)
- Component/class naming patterns
- Test file naming patterns (`.test.ts`, `.spec.ts`, `_test.go`)
- API endpoint naming patterns

**Code Organization:**
- How modules/components are structured (feature-based, layer-based)
- Where utilities and helpers are placed
- How services/repositories are organized
- Folder hierarchy patterns

**Framework-Specific Patterns:**
- Component patterns (functional vs class, composition, HOCs, hooks)
- State management patterns (Redux, Zustand, MobX, Pinia, Vuex)
- API communication patterns (REST, GraphQL, tRPC, gRPC)
- Error handling patterns
- Authentication/authorization patterns

### 4. Extract Critical Implementation Rules

Look for rules that AI agents might miss:

**Framework-Specific Rules:**
- Lifecycle hooks and when to use them
- Framework-specific best practices
- Common anti-patterns to avoid
- Configuration conventions

**API Design Rules:**
- REST conventions (naming, versioning, status codes)
- GraphQL schema patterns
- Request/response formatting
- Error response structures
- Authentication headers and tokens

**State Management Rules:**
- State structure conventions
- Action/mutation naming patterns
- Side effect handling
- Caching and invalidation strategies

**Database Rules:**
- Migration patterns and conventions
- Query optimization requirements
- Transaction boundaries
- Relationship handling (eager vs lazy loading)

**Testing Rules:**
- Test structure requirements
- Mock/stub usage conventions
- Integration vs unit test boundaries
- Test data management (fixtures, factories)

**Build & Deployment Rules:**
- Environment variable patterns
- Build configuration requirements
- Deployment prerequisites
- Environment-specific code patterns

### 5. Initialize Project Context Document

Based on discovery, create the context document:

#### A. Fresh Document Setup (if no existing context)

Copy template from `{installed_path}/project-context-template.md` to `{output_folder}/project-context.md`
Initialize frontmatter with:

```yaml
---
project_name: '{{project_name}}'
user_name: '{{user_name}}'
date: '{{date}}'
stepsCompleted: ['discovery']
inputDocuments: [{{list_of_discovered_files}}]
---
```

#### B. Existing Document Update

Load existing context and prepare for updates.
Set frontmatter `stepsCompleted` to track what will be updated.

### 6. Present Discovery Summary

Report findings to user based on `user_skill_level`:

**Expert Mode:**
"Technology stack discovered:
{{exact_technologies_with_versions}}

Patterns identified: {{pattern_count}}
Critical rules extracted: {{rule_count}}

Ready to generate project context.

[C] Continue to context generation"

**Intermediate Mode:**
"Welcome {{user_name}}! I've analyzed your project for {{project_name}}.

**Technology Stack Discovered:**
- Language/Runtime: {{language_with_version}}
- Framework(s): {{frameworks_with_versions}}
- Database: {{database_if_found}}
- Build Tools: {{build_tools}}

**Patterns Found:**
- {{number_of_patterns}} implementation patterns
- {{number_of_conventions}} coding conventions
- {{number_of_rules}} critical rules

Ready to create your project context. This will help AI agents implement code consistently with your project's standards.

[C] Continue to context generation"

**Beginner Mode:**
"Hi {{user_name}}! I've looked through your {{project_name}} project to understand how it's built.

**What I Found:**
Your project uses {{friendly_framework_description}}.

**Why This Matters:**
I'll create a guide that helps AI assistants write code that matches your project's style and follows the rules your team uses.

**What's Next:**
We'll go through each area of your project and capture the important rules together.

[C] Continue to context generation"

## SUCCESS METRICS:

- Existing project context properly detected and handled
- Technology stack accurately identified with versions
- Critical implementation patterns discovered
- Project context document properly initialized
- Discovery findings clearly presented to user
- User ready to proceed with context generation

## FAILURE MODES:

- Not checking for existing project context before creating new one
- Missing critical framework versions or configurations
- Overlooking important coding patterns or conventions
- Not initializing frontmatter properly
- Not presenting clear discovery summary to user

## NEXT STEP:

After user selects [C] to continue, load `./step-02-generate.md` to collaboratively generate the specific project context rules.

Remember: Do NOT proceed to step-02 until user explicitly selects [C] from the menu and discovery is confirmed!
