const BLUEPRINT_SECTION_RE = /^##[ \t]+Execution Blueprint[ \t]*$/m;
const PHASE_HEADING_RE = /^###[ \t]+(?:✅[ \t]*)?Phase[ \t]+(\d+)[ \t]*:?[ \t]*(.*?)[ \t]*$/gm;
const TASK_REF_RE = /Task[ \t]+0*(\d+)/i;

export interface BlueprintPhase {
  index: number;
  name?: string;
  taskIds: number[];
}

export const parseBlueprintPhases = (planBody: string): BlueprintPhase[] | undefined => {
  const sectionMatch = planBody.match(BLUEPRINT_SECTION_RE);
  if (!sectionMatch || sectionMatch.index === undefined) return undefined;

  const blueprint = planBody.slice(sectionMatch.index);
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
