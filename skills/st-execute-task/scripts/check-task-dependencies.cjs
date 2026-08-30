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

// src/skill-scripts/check-task-dependencies.ts
var check_task_dependencies_exports = {};
__export(check_task_dependencies_exports, {
  _main: () => _main
});
module.exports = __toCommonJS(check_task_dependencies_exports);
var fs5 = __toESM(require("fs"));
var path5 = __toESM(require("path"));

// src/skill-scripts/shared/plan-resolve.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));

// src/skill-scripts/shared/root.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var EXPECTED_SCHEMA = true ? 4 : 4;
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

// src/skill-scripts/shared/task-file.ts
var fs4 = __toESM(require("fs"));
var path4 = __toESM(require("path"));
var extractFrontmatter = (content) => {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  return match && match[1] ? match[1] : null;
};
var findTaskFile = (planDir, taskId) => {
  const taskDir = path4.join(planDir, "tasks");
  if (!fs4.existsSync(taskDir)) return null;
  const idStr = String(taskId);
  const variations = [idStr, idStr.padStart(2, "0"), idStr.replace(/^0+/, "") || "0"];
  const uniqueVariations = [...new Set(variations)];
  try {
    const files = fs4.readdirSync(taskDir);
    return uniqueVariations.reduce((acc, v) => {
      if (acc) return acc;
      const match = files.find((f) => f.startsWith(`${v}--`) && f.endsWith(".md"));
      return match ? path4.join(taskDir, match) : null;
    }, null) ?? null;
  } catch (_err) {
    return null;
  }
};
var extractDependencies = (frontmatter) => {
  const lines = frontmatter.split("\n");
  const dependencies = [];
  let inDependenciesSection = false;
  for (const line of lines) {
    if (line.match(/^dependencies:/)) {
      inDependenciesSection = true;
      const arrayMatch = line.match(/\[(.*)\]/);
      if (arrayMatch && arrayMatch[1]) {
        const deps = arrayMatch[1].split(",").map((dep) => dep.trim().replace(/['"]/g, "")).filter((dep) => dep.length > 0);
        dependencies.push(...deps);
        inDependenciesSection = false;
      }
      continue;
    }
    if (inDependenciesSection && line.match(/^[^ ]/) && !line.match(/^[ \t]*-/)) {
      inDependenciesSection = false;
    }
    if (inDependenciesSection && line.match(/^[ \t]*-/)) {
      const dep = line.replace(/^[ \t]*-[ \t]*/, "").replace(/[ \t]*$/, "").replace(/['"]/g, "");
      if (dep.length > 0) dependencies.push(dep);
    }
  }
  return dependencies;
};
var extractStatus = (frontmatter) => {
  for (const line of frontmatter.split("\n")) {
    if (line.match(/^status:/)) {
      return line.replace(/^status:[ \t]*/, "").replace(/^["']/, "").replace(/["']$/, "").trim();
    }
  }
  return null;
};
var collectTaskReadinessIssues = (planDir, taskId) => {
  const issues = [];
  const taskFile = findTaskFile(planDir, taskId);
  const idLabel = String(taskId);
  if (!taskFile || !fs4.existsSync(taskFile)) {
    issues.push({ taskId: idLabel, kind: "missing", detail: "task file not found" });
    return issues;
  }
  const taskContent = fs4.readFileSync(taskFile, "utf8");
  const frontmatter = extractFrontmatter(taskContent);
  if (!frontmatter) {
    issues.push({ taskId: idLabel, kind: "missing", detail: "task frontmatter not found" });
    return issues;
  }
  const status = extractStatus(frontmatter);
  if (status === "needs-clarification") {
    issues.push({
      taskId: idLabel,
      kind: "needs-clarification",
      detail: "status is needs-clarification"
    });
  }
  for (const depId of extractDependencies(frontmatter)) {
    const depFile = findTaskFile(planDir, depId);
    if (!depFile || !fs4.existsSync(depFile)) {
      issues.push({
        taskId: idLabel,
        kind: "unresolved-dependency",
        detail: `dependency ${depId} not found`
      });
      continue;
    }
    const depContent = fs4.readFileSync(depFile, "utf8");
    const depFrontmatter = extractFrontmatter(depContent);
    if (!depFrontmatter) {
      issues.push({
        taskId: idLabel,
        kind: "unresolved-dependency",
        detail: `dependency ${depId} has no frontmatter`
      });
      continue;
    }
    const depStatus = extractStatus(depFrontmatter);
    if (depStatus !== "completed") {
      issues.push({
        taskId: idLabel,
        kind: "unresolved-dependency",
        detail: `dependency ${depId} status is ${depStatus ?? "unknown"}`
      });
    }
  }
  return issues;
};

// src/skill-scripts/check-task-dependencies.ts
var _printError = (message) => {
  console.error(`ERROR: ${message}`);
};
var _printSuccess = (message) => {
  console.log(`\u2713 ${message}`);
};
var _printWarning = (message) => {
  console.log(`\u26A0 ${message}`);
};
var _printInfo = (message) => {
  console.log(message);
};
var _main = (startPath = process.cwd()) => {
  if (process.argv.length !== 4) {
    _printError("Invalid number of arguments");
    console.log("Usage: node check-task-dependencies.cjs <plan-id-or-path> <task-id>");
    console.log("Example: node check-task-dependencies.cjs 16 03");
    process.exit(1);
  }
  const inputId = process.argv[2];
  const taskId = process.argv[3];
  if (!inputId || !taskId) {
    _printError("Invalid arguments");
    process.exit(1);
  }
  const resolved = resolvePlan(inputId, startPath);
  if (!resolved) {
    _printError(`Plan "${inputId}" not found or invalid`);
    process.exit(1);
  }
  const { planDir, planId } = resolved;
  _printInfo(`Found plan directory: ${planDir}`);
  const taskFile = findTaskFile(planDir, taskId);
  if (!taskFile) {
    _printError(`Task with ID ${taskId} not found in plan ${planId}`);
    process.exit(1);
  }
  _printInfo(`Checking task: ${path5.basename(taskFile)}`);
  console.log("");
  const issues = collectTaskReadinessIssues(planDir, taskId);
  const dependencyIssues = issues.filter((issue) => issue.kind === "unresolved-dependency");
  const blockingIssues = issues.filter((issue) => issue.kind !== "unresolved-dependency");
  if (blockingIssues.length > 0) {
    for (const issue of blockingIssues) {
      _printError(issue.detail);
    }
    process.exit(1);
  }
  const taskContent = fs5.readFileSync(taskFile, "utf8");
  const frontmatter = extractFrontmatter(taskContent);
  if (!frontmatter) {
    _printError("Could not extract frontmatter from task file");
    process.exit(1);
  }
  const dependencies = extractDependencies(frontmatter);
  if (dependencies.length === 0) {
    _printSuccess("Task has no dependencies - ready to execute!");
    process.exit(0);
  }
  _printInfo("Task dependencies found:");
  dependencies.forEach((dep) => {
    console.log(`  - Task ${dep}`);
  });
  console.log("");
  _printInfo("Checking dependency status...");
  console.log("");
  let resolvedCount = 0;
  for (const depId of dependencies) {
    const depFile = findTaskFile(planDir, depId);
    const depFrontmatter = depFile ? extractFrontmatter(fs5.readFileSync(depFile, "utf8")) : null;
    const depStatus = depFrontmatter ? extractStatus(depFrontmatter) : null;
    if (depStatus === "completed") {
      _printSuccess(`Task ${depId} - Status: completed \u2713`);
      resolvedCount++;
    } else {
      _printWarning(`Task ${depId} - Status: ${depStatus ?? "unknown"} \u2717`);
    }
  }
  console.log("");
  _printInfo("=========================================");
  _printInfo("Dependency Check Summary");
  _printInfo("=========================================");
  _printInfo(`Total dependencies: ${dependencies.length}`);
  _printInfo(`Resolved: ${resolvedCount}`);
  _printInfo(`Unresolved: ${dependencies.length - resolvedCount}`);
  console.log("");
  if (dependencyIssues.length === 0) {
    _printSuccess(`All dependencies are resolved! Task ${taskId} is ready to execute.`);
    process.exit(0);
  }
  _printError(`Task ${taskId} has unresolved dependencies:`);
  dependencyIssues.forEach((issue) => {
    console.log(issue.detail);
  });
  _printInfo("Please complete the dependencies before executing this task.");
  process.exit(1);
};
if (require.main === module) {
  _main();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  _main
});
