const ID_PATTERNS: RegExp[] = [
  /^\s*["']?id["']?\s*:\s*["']?([+-]?\d+)["']?\s*(?:#.*)?$/im,
  /^\s*id\s*:\s*([+-]?\d+)\s*(?:#.*)?$/im,
  /^\s*["']?id["']?\s*:\s*"([+-]?\d+)"\s*(?:#.*)?$/im,
  /^\s*["']?id["']?\s*:\s*'([+-]?\d+)'\s*(?:#.*)?$/im,
  /^\s*["']id["']\s*:\s*([+-]?\d+)\s*(?:#.*)?$/im,
  /^\s*id\s*:\s*[|>]\s*([+-]?\d+)\s*$/im,
];

const validateId = (rawId: string): number | null => {
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id) || id < 0 || id > Number.MAX_SAFE_INTEGER) return null;
  return id;
};

const extractIdFromMarkdown = (content: string): number | null => {
  const frontmatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch || !frontmatterMatch[1]) return null;
  const block: string = frontmatterMatch[1];
  for (const pattern of ID_PATTERNS) {
    const match = block.match(pattern);
    if (match && match[1]) {
      const id = validateId(match[1]);
      if (id !== null) return id;
    }
  }
  return null;
};

const extractIdFromHtml = (content: string): number | null => {
  const headMatch = content.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const scope: string = headMatch && headMatch[1] ? headMatch[1] : content;
  const metaPatterns: RegExp[] = [
    /<meta\s+[^>]*name\s*=\s*["']id["'][^>]*content\s*=\s*["']([+-]?\d+)["'][^>]*\/?>/i,
    /<meta\s+[^>]*content\s*=\s*["']([+-]?\d+)["'][^>]*name\s*=\s*["']id["'][^>]*\/?>/i,
  ];
  for (const pattern of metaPatterns) {
    const match = scope.match(pattern);
    if (match && match[1]) {
      const id = validateId(match[1]);
      if (id !== null) return id;
    }
  }
  return null;
};

export const extractPlanId = (content: string, filePath: string): number | null => {
  if (filePath.toLowerCase().endsWith('.html')) return extractIdFromHtml(content);
  return extractIdFromMarkdown(content);
};
