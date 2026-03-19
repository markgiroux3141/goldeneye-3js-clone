# Step 4: Example Extraction & Validation

## MANDATORY EXECUTION RULES (READ FIRST):

- NEVER synthesize fake code examples - extract from real codebase
- ALWAYS present examples for user validation
- YOU ARE A CURATOR selecting the best representative examples
- FOCUS on clarity and representativeness
- ABSOLUTELY NO TIME ESTIMATES
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

---

## STEP GOAL:

Extract and validate code examples for each confirmed pattern:
1. Find best representative examples from actual codebase
2. Create DO/DON'T pairs for each pattern
3. Present examples for user validation
4. Allow user to provide better examples
5. Update code-style-guide.md with validated examples

---

## EXECUTION PROTOCOLS:

- Extract examples from REAL codebase files
- Select examples that are clear, concise, and representative
- DON'T examples should come from anomalies found in Step 2 OR be synthesized with clear "// Wrong:" annotations
- Keep examples between 5-15 lines
- Present examples by category for validation

---

## EXAMPLE SELECTION CRITERIA

### Best DO Example:
1. **Representative**: Shows the dominant pattern clearly
2. **Concise**: 5-15 lines, no extra noise
3. **Self-contained**: Understandable without external context
4. **From important file**: Entry points, public APIs score higher
5. **Clean**: No lint warnings or code smells

### Best DON'T Example:
1. **From anomalies**: Use actual deviations found in Step 2 when available
2. **Clear contrast**: Obviously different from DO example
3. **Annotated**: Include `// Wrong:` or `// Avoid:` comments explaining why
4. **Realistic**: Something an agent might actually do

---

## EXAMPLE EXTRACTION PROCESS

For each category and sub-pattern:

### 1. Find DO Example

Search codebase for instances matching the confirmed pattern:
- Prioritize files: entry points > services > components > utilities
- Score by: cleanliness, brevity, clarity
- Select best-scoring example
- Trim to 5-15 lines showing the pattern clearly

### 2. Find or Create DON'T Example

**If anomaly exists from Step 2:**
- Extract the anomalous code
- Add inline comment explaining what's wrong

**If no anomaly exists:**
- Synthesize an anti-example by inverting the pattern
- Mark clearly as synthesized: `// INCORRECT - synthesized example`
- Add explanation of what's wrong

---

## EXAMPLE PRESENTATION FORMAT

Present examples by category:

```markdown
## Examples for: {{Category Name}}

### {{Pattern 1: Sub-pattern Name}}

**DO:** _(from {{file_path}}:{{line}})_
```{{language}}
{{extracted_code_example}}
```

**DON'T:**
```{{language}}
{{anti_example_with_inline_comments}}
```

---

### {{Pattern 2: Sub-pattern Name}}

**DO:** _(from {{file_path}}:{{line}})_
```{{language}}
{{extracted_code_example}}
```

**DON'T:**
```{{language}}
{{anti_example_with_inline_comments}}
```

---

**Example Quality Check:**
- [ ] DO examples are from real code
- [ ] DON'T examples clearly show what's wrong
- [ ] Examples are 5-15 lines
- [ ] Examples are self-contained

**Would you like to:**
[V] Validate - Accept these examples
[R] Replace - Provide better examples for specific patterns
[S] Skip - Move to next category (mark examples as TODO)
```

**HALT AND WAIT for user selection.**

---

## CATEGORY-SPECIFIC EXAMPLES

### 1. Naming Conventions Examples

Extract examples for:
- Variable naming (including boolean prefixes)
- Function/method naming (with verb patterns)
- Class/component naming
- File naming
- Constant naming
- Type/interface naming (if applicable)

**Example format:**
```typescript
// DO: Variable naming
const userData = await fetchUser(userId);
const isAuthenticated = checkAuth();
const hasPermission = user.roles.includes('admin');

// DON'T: Variable naming
const UserData = await fetchUser(userId);  // Wrong: PascalCase for variable
const authenticated = checkAuth();          // Wrong: boolean missing 'is' prefix
const data = await fetchUser();             // Wrong: too generic
```

### 2. Code Formatting Examples

Extract examples for:
- Indentation
- Bracket placement
- Multi-line formatting

**Example format:**
```typescript
// DO: Bracket style (K&R)
function example() {
  if (condition) {
    doSomething();
  }
}

// DON'T: Bracket style
function example()
{                           // Wrong: Allman style not used in this project
  if (condition)
  {
    doSomething();
  }
}
```

### 3. Comment Style Examples

Extract examples for:
- JSDoc/docstring format
- Inline comments
- TODO format

**Example format:**
```typescript
// DO: JSDoc format
/**
 * Fetches user by ID
 * @param userId - The user's unique identifier
 * @returns The user object or null if not found
 */
async function getUser(userId: string): Promise<User | null> {

// DON'T: Comment format
// gets user                    // Wrong: Not using JSDoc for public function
async function getUser(userId: string): Promise<User | null> {
```

### 4. Design Patterns Examples

Extract examples for:
- Each identified design pattern
- Framework-specific patterns

**Example format:**
```typescript
// DO: Repository pattern
@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}

// DON'T: Direct database access in service
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUser(id: string) {
    return this.prisma.user.findUnique({ where: { id } });  // Wrong: Should use repository
  }
}
```

### 5. Error Handling Examples

Extract examples for:
- Custom error classes
- Try/catch patterns
- Error responses

### 6. Import Organization Examples

Extract examples for:
- Import order and grouping
- Path alias usage

**Example format:**
```typescript
// DO: Import organization
// Node built-ins
import { readFile } from 'fs/promises';

// External packages
import { Injectable } from '@nestjs/common';

// Internal packages
import { Logger } from '@company/logger';

// Absolute imports
import { UserService } from '@/services/user.service';

// Relative imports
import { validateUser } from './validators';

// DON'T: Import organization
import { validateUser } from './validators';  // Wrong: relative before absolute
import { Injectable } from '@nestjs/common';
import { UserService } from '@/services/user.service';
import { readFile } from 'fs/promises';       // Wrong: builtins should be first
```

### 7. File Structure Examples

Extract examples showing:
- Typical file section ordering
- Class member ordering

### 8. Function Patterns Examples

Extract examples for:
- Parameter patterns
- Return patterns
- Async patterns

### 9. Type Annotations Examples

Extract examples for:
- Annotation style
- Generic usage
- Null handling

### 10. Testing Style Examples

Extract examples for:
- Test naming and structure
- Mocking patterns

**Example format:**
```typescript
// DO: Test structure
describe('UserService', () => {
  describe('getUser', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 'user-123';
      mockRepo.findById.mockResolvedValue(testUser);

      // Act
      const result = await service.getUser(userId);

      // Assert
      expect(result).toEqual(testUser);
    });
  });
});

// DON'T: Test structure
test('getUser works', async () => {   // Wrong: not using describe blocks
  const result = await service.getUser('123');
  expect(result).toBeTruthy();        // Wrong: assertion too vague
});
```

### 11. Documentation Examples

Extract examples for:
- README sections
- API documentation

### 12. Anti-Patterns Examples

Present anti-patterns with clear "NEVER DO THIS" framing:

```typescript
// NEVER: Use 'any' type
function processData(data: any) {    // Wrong: loses type safety
  return data.value;
}

// INSTEAD: Use proper typing
function processData(data: DataType): ProcessedData {
  return { value: data.value };
}
```

---

## USER INTERACTION HANDLING

### If 'V' (Validate):
1. Accept all examples for current category
2. Update code-style-guide.md with examples
3. Update example_count in frontmatter
4. Proceed to next category

### If 'R' (Replace):
1. Ask: "Which pattern would you like to provide a better example for?"
2. User specifies pattern
3. Ask: "Please provide the code example (or file path and line number)"
4. User provides example
5. Replace example in category
6. Return to validation prompt for same category

### If 'S' (Skip):
1. Mark examples as TODO in document
2. Add to `examples_skipped` in state file
3. Proceed to next category
4. Note: Skipped examples should be revisited in Step 5

---

## DOCUMENT UPDATE FORMAT

When adding examples to code-style-guide.md:

```markdown
## {{Category Name}}

### {{Pattern Name}}

**Pattern**: {{description}}

**DO:**
```{{language}}
{{example_code}}
```

**DON'T:**
```{{language}}
{{anti_example_code}}
```

_Source: {{file_path}}:{{line_number}}_
```

---

## EXAMPLE EXTRACTION COMPLETION

When all categories have examples:

"**Example Extraction Complete**

**Examples Collected:**
- Total DO examples: {{count}}
- Total DON'T examples: {{count}}
- Skipped (need manual examples): {{count}}

**Coverage:**
{{list_of_categories_with_example_counts}}

{{if skipped > 0}}
**Skipped Examples:**
These patterns need manual examples:
{{list_of_skipped_patterns}}

Would you like to provide examples for these now, or proceed to finalization?
[P] Provide - Add examples for skipped patterns
[F] Finalize - Proceed with current examples (skipped will be marked TODO)
{{else}}
Ready to finalize the code style guide?
[F] Finalize - Proceed to final synthesis
{{endif}}"

**HALT AND WAIT for user selection.**

---

## STATE FILE UPDATE

After each category:
```json
{
  "current_step": "step-04",
  "examples_completed": ["naming_conventions", "code_formatting", ...],
  "examples_skipped": ["documentation"],
  "example_count": {
    "do": 42,
    "dont": 38
  }
}
```

---

## SUCCESS METRICS:

- DO examples extracted from real codebase
- DON'T examples clearly show what's wrong
- Examples are 5-15 lines and self-contained
- User validated all examples (or explicitly skipped)
- Document updated with examples
- Source file/line noted for traceability

## FAILURE MODES:

- Synthesizing fake DO examples (must be real code)
- DON'T examples without explanation of what's wrong
- Examples too long (>15 lines) or too short (<3 lines)
- Examples that require external context to understand
- Not tracking example source locations
- Proceeding without user validation

---

## NEXT STEP:

Load `./step-05-complete.md` ONLY after user selects 'F' (Finalize) and is ready for final synthesis.
