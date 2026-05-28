---
id: 1
group: "algorithm-design"
dependencies: []
status: "completed"
created: "2025-09-06"
skills: ["prompt-engineering", "technical-writing"]
---

## Objective
Design a comprehensive multi-dimensional complexity scoring algorithm (1-10 scale) that evaluates task difficulty across five key dimensions, with detailed rubrics and examples for consistent application by AI agents.

## Skills Required
- **prompt-engineering**: Creating clear, systematic evaluation criteria for AI agents
- **technical-writing**: Documenting detailed rubrics with examples and anchor points

## Acceptance Criteria
- [ ] Five complexity dimensions defined with clear evaluation criteria
- [ ] 1-10 scoring scale with detailed rubrics for each score level
- [ ] Concrete examples for each dimension and score level
- [ ] Anchor points and comparative examples for calibration
- [ ] Instructions for composite score calculation

## Technical Requirements
The algorithm must evaluate tasks across these dimensions specified in the plan:
- **Technical Depth**: Number of technical concepts, APIs, or frameworks involved
- **Decision Complexity**: Amount of architectural or implementation choices required
- **Integration Points**: Number of external systems, files, or dependencies affected
- **Scope Breadth**: Range of functionality or features encompassed
- **Uncertainty Level**: Degree of ambiguity or unknown requirements

Each dimension should contribute to a composite 1-10 score with clear aggregation rules.

## Input Dependencies
None - this is a foundational task that defines the scoring framework.

## Output Artifacts
- Detailed complexity scoring algorithm specification
- Scoring rubrics for each dimension (1-10 scale)
- Examples and anchor points for score calibration
- Composite scoring calculation method

## Implementation Notes
<details>
<summary>Detailed Implementation Guidance</summary>

Create a systematic evaluation framework that can be embedded in the generate-tasks.md template. Focus on:

1. **Dimension Definitions**: Each of the 5 dimensions should have clear, objective criteria that minimize subjective interpretation.

2. **Scoring Rubrics**: For each dimension, create detailed 1-10 scale descriptions with:
   - Score 1-2: Trivial/minimal complexity examples
   - Score 3-4: Low complexity examples
   - Score 5-6: Moderate complexity examples
   - Score 7-8: High complexity examples
   - Score 9-10: Extreme complexity examples

3. **Calibration Examples**: Provide concrete task examples at different complexity levels to serve as reference points.

4. **Composite Scoring**: Define how to combine the 5 dimensional scores into a single 1-10 overall complexity score (e.g., weighted average, maximum score, etc.).

5. **Edge Cases**: Address scenarios like tasks that score high on one dimension but low on others.

The output should be structured for easy integration into template instructions, using clear formatting and examples that AI agents can reliably follow.
</details>