"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/skill-scripts/validate-plan-blueprint.ts
var validate_plan_blueprint_exports = {};
__export(validate_plan_blueprint_exports, {
  main: () => main
});
module.exports = __toCommonJS(validate_plan_blueprint_exports);
var fs4 = __toESM(require("fs"));
var path4 = __toESM(require("path"));

// src/skill-scripts/shared/root.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var EXPECTED_SCHEMA = true ? 1 : 1;
var isValidStrikethrooRoot = (strikethrooPath) => {
  try {
    if (!fs.existsSync(strikethrooPath)) return false;
    if (!fs.lstatSync(strikethrooPath).isDirectory()) return false;
    const metadataPath = path.join(strikethrooPath, ".init-metadata.json");
    if (!fs.existsSync(metadataPath)) return false;
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    return metadata && typeof metadata === "object" && "version" in metadata;
  } catch (_err) {
    return false;
  }
};
var getStrikethrooAt = (directory) => {
  const strikethrooPath = path.join(directory, ".ai", "strikethroo");
  return isValidStrikethrooRoot(strikethrooPath) ? strikethrooPath : null;
};
var getParentPaths = (currentPath, acc = []) => {
  const absolutePath = path.resolve(currentPath);
  const nextAcc = [...acc, absolutePath];
  const parentPath = path.dirname(absolutePath);
  if (parentPath === absolutePath) return nextAcc;
  return getParentPaths(parentPath, nextAcc);
};
var checkWorkspaceSchema = (metadataPath) => {
  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  } catch {
    return;
  }
  const actual = typeof metadata.workspaceSchemaVersion === "number" ? metadata.workspaceSchemaVersion : 1;
  if (actual === EXPECTED_SCHEMA) return;
  if (actual < EXPECTED_SCHEMA) {
    process.stderr.write(
      `Workspace schema v${actual} is older than this skill requires (v${EXPECTED_SCHEMA}). Re-run \`npx strikethroo init\` with the latest CLI to update.
`
    );
  } else {
    process.stderr.write(
      `This skill (built for workspace schema v${EXPECTED_SCHEMA}) is older than the workspace (v${actual}). Re-run \`npx skills add e0ipso/strikethroo\` to update skills.
`
    );
  }
  process.exit(1);
};
var findStrikethrooRoot = (startPath = process.cwd()) => {
  const paths = getParentPaths(startPath);
  const found = paths.find((p) => getStrikethrooAt(p));
  if (!found) return null;
  const root = getStrikethrooAt(found);
  if (root) checkWorkspaceSchema(path.join(root, ".init-metadata.json"));
  return root;
};

// src/skill-scripts/shared/plan-scan.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));

// src/skill-scripts/shared/frontmatter.ts
var ID_PATTERNS = [
  /^\s*["']?id["']?\s*:\s*["']?([+-]?\d+)["']?\s*(?:#.*)?$/im,
  /^\s*id\s*:\s*([+-]?\d+)\s*(?:#.*)?$/im,
  /^\s*["']?id["']?\s*:\s*"([+-]?\d+)"\s*(?:#.*)?$/im,
  /^\s*["']?id["']?\s*:\s*'([+-]?\d+)'\s*(?:#.*)?$/im,
  /^\s*["']id["']\s*:\s*([+-]?\d+)\s*(?:#.*)?$/im,
  /^\s*id\s*:\s*[|>]\s*([+-]?\d+)\s*$/im
];
var validateId = (rawId) => {
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id) || id < 0 || id > Number.MAX_SAFE_INTEGER) return null;
  return id;
};
var extractIdFromMarkdown = (content) => {
  const frontmatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch || !frontmatterMatch[1]) return null;
  const block = frontmatterMatch[1];
  for (const pattern of ID_PATTERNS) {
    const match = block.match(pattern);
    if (match && match[1]) {
      const id = validateId(match[1]);
      if (id !== null) return id;
    }
  }
  return null;
};
var extractPlanId = (content, _filePath) => {
  return extractIdFromMarkdown(content);
};

// src/skill-scripts/shared/plan-scan.ts
var PLAN_EXTENSIONS = [".md"];
var scanPlanDir = (planDirPath, dirName, isArchive) => {
  let entries;
  try {
    entries = fs2.readdirSync(planDirPath, { withFileTypes: true });
  } catch (_err) {
    return [];
  }
  return entries.filter((e) => e.isFile() && PLAN_EXTENSIONS.some((ext) => e.name.endsWith(ext))).flatMap((e) => {
    const filePath = path2.join(planDirPath, e.name);
    try {
      const content = fs2.readFileSync(filePath, "utf8");
      const id = extractPlanId(content, filePath);
      if (id === null) return [];
      return [{ id, file: filePath, dir: planDirPath, isArchive, name: dirName }];
    } catch (_err) {
      return [];
    }
  });
};
var getAllPlans = (taskManagerRoot) => {
  const sources = [
    { dir: path2.join(taskManagerRoot, "plans"), isArchive: false },
    { dir: path2.join(taskManagerRoot, "archive"), isArchive: true }
  ];
  return sources.flatMap(({ dir, isArchive }) => {
    if (!fs2.existsSync(dir)) return [];
    let entries;
    try {
      entries = fs2.readdirSync(dir, { withFileTypes: true });
    } catch (_err) {
      return [];
    }
    return entries.filter((e) => e.isDirectory()).flatMap((e) => scanPlanDir(path2.join(dir, e.name), e.name, isArchive));
  });
};

// src/skill-scripts/shared/plan-resolve.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var isValidRootDir = (strikethrooPath) => {
  try {
    if (!fs3.existsSync(strikethrooPath)) return false;
    if (!fs3.lstatSync(strikethrooPath).isDirectory()) return false;
    const metadataPath = path3.join(strikethrooPath, ".init-metadata.json");
    if (!fs3.existsSync(metadataPath)) return false;
    const metadata = JSON.parse(fs3.readFileSync(metadataPath, "utf8"));
    return metadata && typeof metadata === "object" && "version" in metadata;
  } catch (_err) {
    return false;
  }
};
var checkStandardRootShortcut = (filePath) => {
  const planDir = path3.dirname(filePath);
  const parentDir = path3.dirname(planDir);
  const possibleRoot = path3.dirname(parentDir);
  const parentBase = path3.basename(parentDir);
  if (parentBase !== "plans" && parentBase !== "archive") return null;
  if (path3.basename(possibleRoot) !== "strikethroo") return null;
  const dotAiDir = path3.dirname(possibleRoot);
  if (path3.basename(dotAiDir) !== ".ai") return null;
  return isValidRootDir(possibleRoot) ? possibleRoot : null;
};
var resolveByPath = (absolutePath) => {
  let content;
  try {
    content = fs3.readFileSync(absolutePath, "utf8");
  } catch (_err) {
    return null;
  }
  const planId = extractPlanId(content, absolutePath);
  if (planId === null) return null;
  const tmRoot = checkStandardRootShortcut(absolutePath) || findStrikethrooRoot(path3.dirname(absolutePath));
  if (!tmRoot) return null;
  return {
    planFile: absolutePath,
    planDir: path3.dirname(absolutePath),
    strikethrooRoot: tmRoot,
    planId
  };
};
var resolveByIdInAncestry = (planId, startPath, searched = /* @__PURE__ */ new Set()) => {
  const tmRoot = findStrikethrooRoot(startPath);
  if (!tmRoot) return null;
  const normalized = path3.normalize(tmRoot);
  if (searched.has(normalized)) return null;
  searched.add(normalized);
  const plans = getAllPlans(tmRoot);
  const match = plans.find((p) => p.id === planId);
  if (match) {
    return {
      planFile: match.file,
      planDir: match.dir,
      strikethrooRoot: tmRoot,
      planId
    };
  }
  const parentOfRoot = path3.dirname(path3.dirname(tmRoot));
  if (parentOfRoot === tmRoot) return null;
  return resolveByIdInAncestry(planId, parentOfRoot, searched);
};
var resolvePlan = (input, startPath = process.cwd()) => {
  if (input === null || input === void 0 || input === "") return null;
  const inputStr = String(input);
  if (inputStr.startsWith("/")) {
    return resolveByPath(inputStr);
  }
  const planId = parseInt(inputStr, 10);
  if (Number.isNaN(planId)) return null;
  return resolveByIdInAncestry(planId, startPath);
};

// src/skill-scripts/validate-plan-blueprint.ts
var VALID_FIELDS = [
  "planFile",
  "planDir",
  "taskCount",
  "blueprintExists",
  "strikethrooRoot",
  "planId"
];
var countTasks = (planDir) => {
  const tasksDir = path4.join(planDir, "tasks");
  if (!fs4.existsSync(tasksDir)) return 0;
  try {
    const stat = fs4.lstatSync(tasksDir);
    if (!stat.isDirectory()) return 0;
    return fs4.readdirSync(tasksDir).filter((f) => f.endsWith(".md")).length;
  } catch (_err) {
    return 0;
  }
};
var checkBlueprintExists = (planFile) => {
  try {
    const content = fs4.readFileSync(planFile, "utf8");
    return /^## Execution Blueprint/m.test(content);
  } catch (_err) {
    return false;
  }
};
var usage = () => {
  const lines = [
    "Plan ID or absolute path is required",
    "",
    "Usage: node validate-plan-blueprint.cjs <plan-id-or-path> [field-name]",
    "",
    "Examples:",
    "  node validate-plan-blueprint.cjs 47",
    "  node validate-plan-blueprint.cjs /path/to/plan.md",
    "  node validate-plan-blueprint.cjs 47 planFile",
    "  node validate-plan-blueprint.cjs 47 blueprintExists"
  ];
  lines.forEach((l) => process.stderr.write(`[ERROR] ${l}
`));
};
var listAvailablePlans = (startPath) => {
  const tmRoot = findStrikethrooRoot(startPath);
  if (!tmRoot) return [];
  const plans = getAllPlans(tmRoot);
  return plans.map((p) => p.name).sort((a, b) => {
    const aMatch = a.match(/^(\d+)--/);
    const bMatch = b.match(/^(\d+)--/);
    if (!aMatch || !bMatch || !aMatch[1] || !bMatch[1]) return 0;
    return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
  });
};
var main = () => {
  const inputId = process.argv[2];
  const fieldName = process.argv[3];
  if (!inputId) {
    usage();
    process.exit(1);
  }
  const numericInput = parseInt(inputId, 10);
  const isNumeric = !Number.isNaN(numericInput);
  const isAbsolutePath = inputId.startsWith("/");
  if (!isNumeric && !isAbsolutePath) {
    process.stderr.write(`[ERROR] Invalid plan ID: "${inputId}" is not a valid number
`);
    process.exit(1);
  }
  const resolved = resolvePlan(inputId);
  if (!resolved) {
    process.stderr.write(`[ERROR] Plan ID ${inputId} not found or invalid
`);
    process.stderr.write("[ERROR] \n");
    const available = listAvailablePlans(process.cwd());
    if (available.length > 0) {
      process.stderr.write("[ERROR] Available plans:\n");
      available.forEach((name) => process.stderr.write(`[ERROR]   ${name}
`));
    }
    process.exit(1);
  }
  const result = {
    planFile: resolved.planFile,
    planDir: resolved.planDir,
    strikethrooRoot: resolved.strikethrooRoot,
    planId: resolved.planId,
    taskCount: countTasks(resolved.planDir),
    blueprintExists: checkBlueprintExists(resolved.planFile) ? "yes" : "no"
  };
  if (fieldName) {
    if (!VALID_FIELDS.includes(fieldName)) {
      process.stderr.write(`[ERROR] Invalid field name: ${fieldName}
`);
      process.stderr.write(`[ERROR] Valid fields: ${VALID_FIELDS.join(", ")}
`);
      process.exit(1);
    }
    const value = result[fieldName];
    process.stdout.write(`${String(value)}
`);
  } else {
    process.stdout.write(`${JSON.stringify(result, null, 2)}
`);
  }
  process.exit(0);
};
if (require.main === module) {
  main();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
