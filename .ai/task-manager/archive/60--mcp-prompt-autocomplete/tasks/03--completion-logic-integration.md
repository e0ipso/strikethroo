---
id: 3
group: "mcp-server-integration"
dependencies: [1, 2]
status: "completed"
created: 2025-11-25
skills:
  - typescript
---
# Integrate Completion Logic with Plan Discovery

## Objective
Connect the completion request handler to the plan discovery utility, implementing argument name filtering and MCP-compliant response formatting to complete the autocomplete feature.

## Skills Required
- **TypeScript Development**: Integrate components with proper async/await handling and type safety

## Acceptance Criteria
- [ ] Import `getActivePlanIds()` into src/index.ts completion handler
- [ ] Check `request.params.argument.name === 'plan_id'` (exact string match)
- [ ] Return empty completion if argument name doesn't match
- [ ] Call `getActivePlanIds()` when argument name matches
- [ ] Sort plan IDs numerically before string conversion
- [ ] Convert numeric IDs to string array (e.g., `[1, 5, 10]` → `["1", "5", "10"]`)
- [ ] Return CompleteResult format: `{ completion: { values: string[], total?: number, hasMore?: boolean } }`
- [ ] Limit to 100 items per MCP spec if count exceeds limit

## Technical Requirements
- Update completion handler in src/index.ts
- Maintain existing error handling patterns (catch errors, log to stderr, return empty completion)
- Follow MCP specification for CompleteResult format
- Support case-sensitive matching for 'plan_id' (standardized across all prompts)

## Input Dependencies
- Task 1: Registered completion handler skeleton
- Task 2: `getActivePlanIds()` utility function

## Output Artifacts
- Fully functional completion handler that provides plan ID autocomplete
- MCP-compliant response formatting
- Graceful error handling for discovery failures

## Implementation Notes
The completion handler logic flow:

1. Validate `ref.type === 'ref/prompt'` (only handle prompt completions, not resources)
2. Check `argument.name === 'plan_id'` (exact match, case-sensitive)
3. If no match, return `{ completion: { values: [] } }`
4. If match, call `getActivePlanIds()`
5. Convert to strings and format response
6. Handle errors by returning empty completion

Example implementation:
```typescript
server.setRequestHandler(CompleteRequestSchema, async (request) => {
  try {
    // Validate ref type
    if (request.params.ref.type !== 'ref/prompt') {
      return { completion: { values: [] } };
    }

    // Check argument name
    if (request.params.argument.name !== 'plan_id') {
      return { completion: { values: [] } };
    }

    // Get plan IDs
    const planIds = await getActivePlanIds();
    const values = planIds.map(id => id.toString());

    // Format response
    const result: CompleteResult = {
      completion: {
        values: values.slice(0, 100), // Limit per MCP spec
        ...(values.length > 100 && { total: values.length, hasMore: true })
      }
    };

    return result;
  } catch (error) {
    console.error('Completion request failed:', error);
    return { completion: { values: [] } };
  }
});
```

Future extension point: Add additional `else if` branches for 'task_id' or other argument names.
