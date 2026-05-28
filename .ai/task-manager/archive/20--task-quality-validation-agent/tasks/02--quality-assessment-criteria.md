---
id: 2
group: "quality-framework"
dependencies: []
status: "completed"
created: "2025-09-06"
skills: ["prompt-engineering"]
---

## Objective
Define comprehensive quality assessment criteria and scoring methodology for evaluating task completeness, clarity, and context sufficiency for execution by less capable LLM models.

## Skills Required
- **prompt-engineering**: Quality criteria definition, assessment rubrics, and evaluation prompt design

## Acceptance Criteria
- [x] Four-dimensional assessment framework with specific evaluation criteria
- [x] Scoring rubric with 0-100 scale for each dimension
- [x] Minimum threshold definitions (target: 75+ for quality validation)
- [x] Specific improvement recommendations for common quality issues
- [x] Assessment prompts optimized for LLM evaluation consistency

## Technical Requirements
The framework must provide objective, consistent assessment of task quality across the four key dimensions identified in the plan. It should generate actionable feedback for task enhancement while maintaining focus on execution requirements for less capable models.

**Assessment Dimensions:**
1. Context Completeness
2. Instruction Clarity
3. Dependency Transparency
4. Acceptance Criteria Precision

## Input Dependencies
None - this framework provides foundational assessment criteria for other components.

## Output Artifacts
- [x] Detailed assessment criteria for each dimension → `/workspace/.ai/task-manager/config/quality-assessment-framework.md`
- [x] Scoring rubric and threshold definitions → `/workspace/.ai/task-manager/config/quality-assessment-framework.md`
- [x] LLM evaluation prompts for consistent assessment → `/workspace/.ai/task-manager/config/quality-assessment-prompts.md`
- [x] Improvement recommendation templates → `/workspace/.ai/task-manager/config/quality-improvement-templates.md`
- [x] Implementation summary and integration guide → `/workspace/.ai/task-manager/config/quality-assessment-summary.md`

## Implementation Notes
<details>
<summary>Detailed Implementation Guidance</summary>

**Dimension 1: Context Completeness (Weight: 30%)**

**Scoring Criteria:**
- 90-100: All necessary information present, complete file paths, explicit technology references, self-contained objectives
- 75-89: Most information present, minor gaps in context or file references
- 50-74: Some missing context, requires external references or assumptions
- 25-49: Significant context gaps, multiple external dependencies
- 0-24: Task cannot be understood without substantial external context

**Evaluation Checklist:**
- [ ] Complete file paths and directory references specified
- [ ] All technology stack components explicitly mentioned
- [ ] Background information sufficient for understanding
- [ ] No assumptions about external knowledge required
- [ ] Task objective completely self-contained

**Common Issues and Recommendations:**
- Missing file paths → Add complete paths relative to project root
- Vague technology references → Specify versions, libraries, frameworks
- Implicit assumptions → Make background context explicit
- External references → Embed necessary information in task

**Dimension 2: Instruction Clarity (Weight: 35%)**

**Scoring Criteria:**
- 90-100: Step-by-step instructions, unambiguous language, explicit guidance
- 75-89: Clear instructions with minor ambiguities
- 50-74: Generally clear but some interpretation required
- 25-49: Ambiguous instructions requiring significant inference
- 0-24: Instructions too vague or unclear for reliable execution

**Evaluation Checklist:**
- [ ] Instructions written in imperative, actionable language
- [ ] Technical terms defined or commonly understood
- [ ] Step-by-step guidance provided for complex operations
- [ ] Specific rather than general instructions
- [ ] No ambiguous or subjective language

**Common Issues and Recommendations:**
- High-level descriptions → Break into specific, sequential steps
- Technical jargon → Add definitions or use simpler terms
- Ambiguous language → Replace with specific, measurable instructions
- Missing implementation details → Add concrete guidance

**Dimension 3: Dependency Transparency (Weight: 20%)**

**Scoring Criteria:**
- 90-100: All dependencies explicitly listed with specific requirements
- 75-89: Dependencies listed with minor gaps in specification
- 50-74: Some dependencies unclear or incomplete
- 25-49: Major dependency information missing
- 0-24: Dependencies not specified or completely unclear

**Evaluation Checklist:**
- [ ] All task dependencies listed with specific task IDs
- [ ] Required input artifacts clearly specified
- [ ] Expected format and structure of inputs defined
- [ ] Integration instructions provided for dependency outputs
- [ ] Dependency relationships logical and necessary

**Common Issues and Recommendations:**
- Missing dependencies → Identify and explicitly list all required inputs
- Vague requirements → Specify exact artifacts and formats needed
- Unclear relationships → Explain why each dependency is required
- Missing integration guidance → Add instructions for using dependency outputs

**Dimension 4: Acceptance Criteria Precision (Weight: 15%)**

**Scoring Criteria:**
- 90-100: Measurable, specific, testable criteria covering all objectives
- 75-89: Mostly specific criteria with minor measurability issues
- 50-74: Some criteria measurable, others subjective
- 25-49: Criteria mostly subjective or incomplete
- 0-24: No clear success criteria or completely subjective

**Evaluation Checklist:**
- [ ] Criteria are objective and measurable
- [ ] Success conditions clearly defined
- [ ] Criteria cover all aspects of task objective
- [ ] Testable outcomes specified
- [ ] Validation methods indicated

**Common Issues and Recommendations:**
- Subjective criteria → Convert to objective, measurable outcomes
- Incomplete coverage → Ensure criteria address all task objectives
- Vague success conditions → Define specific, testable results
- Missing validation → Specify how success will be verified

**Overall Assessment Formula:**
```
Overall Score = (Context × 0.30) + (Clarity × 0.35) + (Dependencies × 0.20) + (Criteria × 0.15)
```

**Quality Threshold:** 75+ overall score required to pass validation

**LLM Assessment Prompt Template:**
```
Evaluate this task for quality across four dimensions, scoring each 0-100:

TASK TO EVALUATE:
[Task content]

ASSESSMENT CRITERIA:
1. Context Completeness (30%): Does the task contain all necessary information for execution without external references?
2. Instruction Clarity (35%): Are the instructions explicit and unambiguous for a less capable model?
3. Dependency Transparency (20%): Are all dependencies clearly specified with required inputs?
4. Acceptance Criteria Precision (15%): Are success criteria measurable and specific?

For each dimension, provide:
- Score (0-100)
- Specific issues identified
- Concrete improvement recommendations

Calculate overall weighted score and recommend PASS/ENHANCE based on 75+ threshold.
```

**Enhancement Priority Matrix:**
- Overall < 60: Major enhancement required across multiple dimensions
- 60-74: Moderate enhancement needed, focus on lowest-scoring dimensions
- 75-84: Minor improvements, polish and clarify
- 85+: Minimal changes, task meets quality standards

**Consistency Validation:**
- Use multiple assessment runs to validate scoring consistency
- Track common scoring variations and adjust criteria accordingly
- Maintain assessment examples for calibration reference
- Document edge cases and resolution approaches
</details>