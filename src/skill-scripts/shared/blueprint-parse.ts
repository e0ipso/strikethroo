const BLUEPRINT_SECTION_RE = /^##[ \t]+Execution Blueprint[ \t]*$/m;
/** The next peer-level `##` heading. `###` and deeper stay inside the section. */
const PEER_HEADING_RE = /^##[ \t]/m;
const PHASE_HEADING_RE = /^###[ \t]+(?:✅[ \t]*)?Phase[ \t]+(\d+)[ \t]*:?[ \t]*(.*?)[ \t]*$/gm;
const TASK_REF_RE = /Task[ \t]+0*(\d+)/i;

/** One phase of an `## Execution Blueprint` section. */
export interface BlueprintPhase {
  /** 1-based position among the section's phase headings. */
  index: number;
  /** Heading text after `Phase N:`, when present. */
  name?: string;
  /** Task ids named by `-`/`*` bullets, in order of first mention. */
  taskIds: number[];
}

/** The section's text after its heading, cut at the next `##` heading. */
const blueprintSection = (planBody: string): string | undefined => {
  const sectionMatch = planBody.match(BLUEPRINT_SECTION_RE);
  if (!sectionMatch || sectionMatch.index === undefined) return undefined;
  const after = planBody.slice(sectionMatch.index + sectionMatch[0].length);
  const peer = after.search(PEER_HEADING_RE);
  return peer === -1 ? after : after.slice(0, peer);
};

/**
 * Parses the phases of a plan's `## Execution Blueprint` section. Sections that
 * follow it, such as an appended `## Execution Summary`, are never read.
 * Returns undefined when the section or its phase headings are absent.
 */
export const parseBlueprintPhases = (planBody: string): BlueprintPhase[] | undefined => {
  const blueprint = blueprintSection(planBody);
  if (blueprint === undefined) return undefined;

  const headings: Array<{ index: number; afterHeading: number; name: string }> = [];
  PHASE_HEADING_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PHASE_HEADING_RE.exec(blueprint)) !== null) {
    headings.push({
      index: m.index,
      afterHeading: m.index + m[0].length,
      name: (m[2] ?? '').trim(),
    });
  }
  if (headings.length === 0) return undefined;

  const phases: BlueprintPhase[] = [];
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i]!;
    const next = headings[i + 1];
    const end = next ? next.index : blueprint.length;
    const segment = blueprint.slice(current.afterHeading, end);

    const taskIds: number[] = [];
    for (const line of segment.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('-') && !trimmed.startsWith('*')) continue;
      const ref = trimmed.match(TASK_REF_RE);
      if (ref && ref[1] !== undefined) {
        const id = parseInt(ref[1], 10);
        if (!Number.isNaN(id) && !taskIds.includes(id)) taskIds.push(id);
      }
    }

    phases.push({
      index: i + 1,
      name: current.name.length > 0 ? current.name : undefined,
      taskIds,
    });
  }

  return phases;
};
