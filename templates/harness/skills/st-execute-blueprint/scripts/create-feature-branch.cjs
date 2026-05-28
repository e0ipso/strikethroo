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

// src/skill-scripts/create-feature-branch.ts
var create_feature_branch_exports = {};
__export(create_feature_branch_exports, {
  _extractPlanName: () => _extractPlanName,
  _sanitizeBranchName: () => _sanitizeBranchName,
  main: () => main
});
module.exports = __toCommonJS(create_feature_branch_exports);
var path4 = __toESM(require("path"));

// src/skill-scripts/shared/git-utils.ts
var import_child_process = require("child_process");
var execGit = (command) => {
  try {
    return (0, import_child_process.execSync)(command, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (_error) {
    return null;
  }
};

// src/skill-scripts/shared/plan-resolve.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));

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

// src/skill-scripts/create-feature-branch.ts
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
var _isGitRepo = () => {
  const result = execGit("git rev-parse --is-inside-work-tree");
  return result === "true";
};
var _getCurrentBranch = () => {
  return execGit("git rev-parse --abbrev-ref HEAD");
};
var _hasUncommittedChanges = () => {
  const status = execGit("git status --porcelain");
  return status !== null && status.length > 0;
};
var _branchExists = (branchName) => {
  const localBranches = execGit("git branch --list");
  if (localBranches && localBranches.split("\n").some((b) => b.trim().replace("* ", "") === branchName)) {
    return true;
  }
  const remoteBranches = execGit("git branch -r --list");
  if (remoteBranches && remoteBranches.split("\n").some((b) => b.trim().includes(branchName))) {
    return true;
  }
  return false;
};
var _sanitizeBranchName = (planName) => {
  return planName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").substring(0, 60);
};
var _extractPlanName = (planDir) => {
  const dirName = path4.basename(planDir);
  const match = dirName.match(/^\d+--(.+)$/);
  return match && match[1] ? match[1] : dirName;
};
var main = (startPath = process.cwd()) => {
  if (process.argv.length < 3) {
    _printError("Missing plan ID argument");
    console.log("Usage: node create-feature-branch.cjs <plan-id-or-path>");
    console.log("Example: node create-feature-branch.cjs 58");
    process.exit(1);
  }
  const inputId = process.argv[2];
  if (!_isGitRepo()) {
    _printError("Not a git repository");
    process.exit(1);
  }
  const resolved = resolvePlan(inputId, startPath);
  if (!resolved) {
    _printError(`Plan "${inputId}" not found or invalid`);
    process.exit(1);
  }
  const { planDir, planId } = resolved;
  _printInfo(`Found plan: ${path4.basename(planDir)}`);
  const currentBranch = _getCurrentBranch();
  if (!currentBranch) {
    _printError("Could not determine current git branch");
    process.exit(1);
  }
  if (currentBranch !== "main" && currentBranch !== "master") {
    _printWarning(`Not on main/master branch (current: ${currentBranch})`);
    _printInfo("Proceeding without creating a new branch");
    process.exit(0);
  }
  if (_hasUncommittedChanges()) {
    _printError("Uncommitted changes detected in working tree");
    _printInfo("Please commit or stash your changes before creating a feature branch");
    process.exit(1);
  }
  const planName = _extractPlanName(planDir);
  const sanitizedName = _sanitizeBranchName(planName);
  const branchName = `feature/${planId}--${sanitizedName}`;
  if (_branchExists(branchName)) {
    _printWarning(`Branch "${branchName}" already exists`);
    _printInfo("Proceeding with existing branch");
    process.exit(0);
  }
  const createResult = execGit(`git checkout -b "${branchName}"`);
  if (createResult === null) {
    _printError(`Failed to create branch "${branchName}"`);
    process.exit(1);
  }
  _printSuccess(`Created and switched to branch: ${branchName}`);
  process.exit(0);
};
if (require.main === module) {
  main();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  _extractPlanName,
  _sanitizeBranchName,
  main
});
