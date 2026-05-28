---
id: 2
group: "easter-egg-lightning-bolt"
dependencies: [1]
status: "completed"
created: 2025-12-03
skills:
  - typescript
---
# Implement lightning-bolt ASCII renderer

## Objective
Create a small, dedicated module that prints a recognizable lightning bolt in static ASCII art to standard output when invoked by the easter egg command, then exits cleanly.

## Skills Required
This task requires basic TypeScript implementation skills and comfort working with simple console output functions.

## Acceptance Criteria
- [ ] A dedicated module/function exists whose only responsibility is to write the lightning-bolt ASCII art to standard output and return.
- [ ] The ASCII art is static, visually recognizable as a lightning bolt, and does not depend on terminal width or color support.
- [ ] The module can be invoked from the CLI handler wired in Task 01 without throwing errors.
- [ ] No new external dependencies are introduced for rendering or formatting the ASCII art.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Implement the renderer as an exported function in a small module (e.g., under a suitable `src` subdirectory consistent with existing project structure).
- Use simple `console.log` (or equivalent) calls to output each line of the lightning-bolt ASCII art in sequence.
- Keep the design compact and vertically oriented so that it remains legible across typical terminal widths and fonts.
- Avoid ANSI color codes or advanced control sequences unless they are already common in the project and do not introduce new complexity.
- Ensure the function returns without modifying global process state (no custom `process.exit` calls inside the renderer; leave exit behavior to the CLI layer).

## Input Dependencies
- The handler wiring created in Task 01, which will call this renderer function.

## Output Artifacts
- A new source file exporting the lightning-bolt ASCII renderer function.
- Any necessary export adjustments so the CLI handler can import and invoke the function.

## Implementation Notes
<details>
<summary>Guidance for designing the ASCII lightning bolt</summary>

- Aim for a simple, stylized lightning shape that uses characters like `/`, `\`, `_`, and `|` or similar, arranged over multiple lines.
- Test the output locally in a standard terminal to confirm it reads clearly as a lightning bolt.
- Keep the pattern fixed; do not add parameters or multiple variants, to avoid unnecessary complexity and to keep the easter egg focused.
- If you need inspiration, sketch a few variants in comments first, then choose the one that looks best and implement that version.
</details>
