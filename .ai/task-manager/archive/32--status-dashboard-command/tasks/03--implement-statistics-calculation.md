---
id: 3
group: "data-processing"
dependencies: [2]
status: "completed"
created: "2025-10-16"
skills:
  - "typescript"
---
# Implement Statistics Calculation

## Objective
Create functions to calculate meaningful statistics from plan and task data, including completion rates, status distributions, and timeline information.

## Skills Required
- TypeScript development (data transformation and aggregation logic)

## Acceptance Criteria
- [ ] Implement function to calculate total plans (active + archived)
- [ ] Implement function to calculate task completion rate
- [ ] Implement function to categorize plan status (no tasks, not started, in progress, completed)
- [ ] Implement function to find most recent and oldest plans
- [ ] All calculations handle edge cases (empty data, missing fields)
- [ ] Functions are exported from `src/status.ts`

## Technical Requirements
Calculate the following statistics:
- **Total Plans**: Active + Archived count
- **Active Plans Count**: Plans in `/plans/` directory
- **Archived Plans Count**: Plans in `/archive/` directory
- **Task Completion Rate**: `(completed tasks / total tasks) * 100`
- **Plan Status Categories**:
  - "No tasks": No tasks directory or empty
  - "Not started": All tasks have status "pending"
  - "In progress": Mixed statuses
  - "Completed": All tasks have status "completed"
- **Timeline**: Most recent plan (highest created date), oldest plan (lowest created date)

## Input Dependencies
- PlanMetadata[] from data collection module (task 2)
- TaskMetadata interface from data collection module (task 2)

## Output Artifacts
- Statistics calculation functions in `src/status.ts`:
  - `calculateStatistics(plans: PlanMetadata[]): DashboardStatistics`
  - Interface for DashboardStatistics

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

### Step 1: Define Statistics Interface
```typescript
interface DashboardStatistics {
  totalPlans: number;
  activePlans: number;
  archivedPlans: number;
  taskCompletionRate: number; // Percentage
  plansByStatus: {
    noTasks: number;
    notStarted: number;
    inProgress: number;
    completed: number;
  };
  mostRecentPlan?: PlanMetadata;
  oldestPlan?: PlanMetadata;
}
```

### Step 2: Implement Basic Counts
```typescript
function calculateBasicCounts(plans: PlanMetadata[]): {
  total: number;
  active: number;
  archived: number;
} {
  return {
    total: plans.length,
    active: plans.filter(p => !p.isArchived).length,
    archived: plans.filter(p => p.isArchived).length
  };
}
```

### Step 3: Calculate Task Completion Rate
```typescript
function calculateTaskCompletionRate(plans: PlanMetadata[]): number {
  // Only count active plans for completion rate
  const activePlans = plans.filter(p => !p.isArchived);

  let totalTasks = 0;
  let completedTasks = 0;

  for (const plan of activePlans) {
    totalTasks += plan.tasks.length;
    completedTasks += plan.tasks.filter(t => t.status === 'completed').length;
  }

  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}
```

### Step 4: Categorize Plan Status
```typescript
type PlanStatus = 'noTasks' | 'notStarted' | 'inProgress' | 'completed';

function categorizePlanStatus(plan: PlanMetadata): PlanStatus {
  if (plan.tasks.length === 0) return 'noTasks';

  const completedCount = plan.tasks.filter(t => t.status === 'completed').length;
  const pendingCount = plan.tasks.filter(t => t.status === 'pending').length;

  if (completedCount === plan.tasks.length) return 'completed';
  if (pendingCount === plan.tasks.length) return 'notStarted';
  return 'inProgress';
}

function calculatePlanStatusDistribution(plans: PlanMetadata[]) {
  const distribution = {
    noTasks: 0,
    notStarted: 0,
    inProgress: 0,
    completed: 0
  };

  for (const plan of plans) {
    const status = categorizePlanStatus(plan);
    distribution[status]++;
  }

  return distribution;
}
```

### Step 5: Find Timeline Plans
```typescript
function findTimelinePlans(plans: PlanMetadata[]): {
  mostRecent?: PlanMetadata;
  oldest?: PlanMetadata;
} {
  if (plans.length === 0) return {};

  const sorted = [...plans].sort((a, b) =>
    new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  return {
    mostRecent: sorted[0],
    oldest: sorted[sorted.length - 1]
  };
}
```

### Step 6: Main Statistics Function
```typescript
export function calculateStatistics(plans: PlanMetadata[]): DashboardStatistics {
  const counts = calculateBasicCounts(plans);
  const timeline = findTimelinePlans(plans);

  return {
    totalPlans: counts.total,
    activePlans: counts.active,
    archivedPlans: counts.archived,
    taskCompletionRate: calculateTaskCompletionRate(plans),
    plansByStatus: calculatePlanStatusDistribution(plans.filter(p => !p.isArchived)),
    mostRecentPlan: timeline.mostRecent,
    oldestPlan: timeline.oldest
  };
}
```

### Edge Cases to Handle
- Empty plans array → All counts should be 0, no recent/oldest plans
- Plans without tasks → Should be categorized as "noTasks"
- Archived plans → Should not affect task completion rate
- Invalid dates → Use try-catch around date parsing
- All tasks completed → 100% completion rate

### Testing Strategy
Test with:
- Empty array
- Single plan with no tasks
- Single plan with all pending tasks
- Single plan with mixed task statuses
- Multiple plans with different states
- Archived vs active plan filtering

</details>
