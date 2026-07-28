#!/usr/bin/env node
// Review-category modelling and false-positive suppression heuristics in
// this skill draw on PR-Agent (https://github.com/The-PR-Agent/pr-agent),
// used under its permissive licence. No PR-Agent code is vendored.
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

// src/skill-scripts/code-review.ts
var code_review_exports = {};
__export(code_review_exports, {
  MAX_REVIEW_ROUNDS: () => MAX_REVIEW_ROUNDS,
  _decideRound: () => _decideRound,
  _exitCodeFor: () => _exitCodeFor,
  _readBaseCommit: () => _readBaseCommit,
  _readCumulativeDiff: () => _readCumulativeDiff,
  _readPriorAdjudicated: () => _readPriorAdjudicated,
  buildReviewerPrompt: () => buildReviewerPrompt,
  createFindingsGate: () => createFindingsGate,
  main: () => main,
  parseReviewMandate: () => parseReviewMandate,
  runBoundedReviewRound: () => runBoundedReviewRound,
  runReviewRound: () => runReviewRound
});
module.exports = __toCommonJS(code_review_exports);
var fs6 = __toESM(require("fs"));
var path6 = __toESM(require("path"));

// src/types.ts
var SUPPORTED_HARNESSES = [
  "claude",
  "codex",
  "cursor",
  "gemini",
  "copilot",
  "opencode"
];

// src/skill-scripts/shared/git-utils.ts
var import_child_process = require("child_process");
var execGit = (command2) => {
  try {
    return (0, import_child_process.execSync)(command2, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (_error) {
    return null;
  }
};
var execGitDiffAllowingChanges = (command2) => {
  try {
    return (0, import_child_process.execSync)(command2, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (error) {
    const failure = error;
    if (failure.status === 1 && typeof failure.stdout === "string") return failure.stdout;
    return null;
  }
};

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

// src/skill-scripts/shared/plan-resolve.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));

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

// src/skill-scripts/shared/harness-availability.ts
var fs5 = __toESM(require("fs"));
var path5 = __toESM(require("path"));
var import_child_process3 = require("child_process");

// src/skill-scripts/shared/external-dispatch.ts
var fs4 = __toESM(require("fs"));
var path4 = __toESM(require("path"));
var import_child_process2 = require("child_process");
var command = (executable, argv, request) => ({
  executable,
  argv,
  cwd: request.workspace,
  stdin: request.prompt
});
var modelArgv = (model) => model === void 0 ? [] : ["--model", model];
var EXTERNAL_HARNESS_ADAPTERS = {
  claude: {
    executable: "claude",
    buildCommand: (request) => command(
      "claude",
      [
        "-p",
        ...modelArgv(request.model),
        ...request.reasoningEffort === void 0 ? [] : ["--effort", request.reasoningEffort]
      ],
      request
    ),
    authenticationArgv: () => ["auth", "status"]
  },
  codex: {
    executable: "codex",
    buildCommand: (request) => command(
      "codex",
      [
        "exec",
        ...modelArgv(request.model),
        ...request.reasoningEffort === void 0 ? [] : ["--config", `model_reasoning_effort=${request.reasoningEffort}`],
        "-"
      ],
      request
    ),
    authenticationArgv: () => ["login", "status"]
  },
  cursor: {
    executable: "cursor-agent",
    buildCommand: (request) => command("cursor-agent", ["--print", ...modelArgv(request.model)], request),
    authenticationArgv: () => ["status"]
  },
  gemini: {
    executable: "gemini",
    // The empty positional prompt is the existing contract — content travels on
    // stdin. It stays even when the model pair is dropped.
    buildCommand: (request) => command("gemini", ["--prompt", "", ...modelArgv(request.model)], request),
    authenticationArgv: () => ["auth", "status"]
  },
  copilot: {
    executable: "copilot",
    buildCommand: (request) => command("copilot", ["-p", "", ...modelArgv(request.model)], request),
    authenticationArgv: () => ["auth", "status"]
  },
  opencode: {
    executable: "opencode",
    buildCommand: (request) => command(
      "opencode",
      [
        "run",
        ...modelArgv(request.model),
        ...request.reasoningEffort === void 0 ? [] : ["--variant", request.reasoningEffort],
        "-"
      ],
      request
    ),
    authenticationArgv: () => ["auth", "list"]
  }
};
var adapterKeys = Object.keys(EXTERNAL_HARNESS_ADAPTERS).sort();
var harnessKeys = [...SUPPORTED_HARNESSES].sort();
if (adapterKeys.join("\0") !== harnessKeys.join("\0")) {
  throw new Error("External harness adapter registry does not cover SUPPORTED_HARNESSES exactly.");
}
var reviewCommandRequest = (request) => ({
  workspace: request.workspace,
  prompt: request.prompt
});
var executableOnPath = (executable) => (process.env.PATH ?? "").split(path4.delimiter).some((directory) => {
  if (!directory) return false;
  const candidate = path4.join(directory, executable);
  try {
    return fs4.statSync(candidate).isFile();
  } catch {
    return false;
  }
});
var runProcess = (executable, argv, cwd, stdin, inheritOutput = false) => new Promise((resolve3, reject) => {
  let settled = false;
  const fail = (error) => {
    if (settled) return;
    settled = true;
    reject(error);
  };
  const child = (0, import_child_process2.spawn)(executable, argv, {
    cwd,
    shell: false,
    stdio: [
      stdin === void 0 ? "ignore" : "pipe",
      inheritOutput ? "inherit" : "ignore",
      inheritOutput ? "inherit" : "ignore"
    ]
  });
  child.once("error", fail);
  child.once("close", (code) => {
    if (settled) return;
    settled = true;
    resolve3({ exitCode: code ?? 1 });
  });
  if (stdin !== void 0) {
    child.stdin.once("error", fail);
    try {
      child.stdin.end(stdin);
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  }
});
var dependencies = {
  executableExists: executableOnPath,
  authenticate: async (commandSpec, adapter) => {
    try {
      const result = await runProcess(
        commandSpec.executable,
        adapter.authenticationArgv(),
        commandSpec.cwd
      );
      return result.exitCode === 0 ? { ok: true } : { ok: false, detail: `${commandSpec.executable} authentication check failed.` };
    } catch (error) {
      return {
        ok: false,
        detail: `${commandSpec.executable} authentication check failed: ${errorMessage(error)}`
      };
    }
  },
  launch: (commandSpec) => runProcess(commandSpec.executable, commandSpec.argv, commandSpec.cwd, commandSpec.stdin, true)
};
var errorMessage = (error) => error instanceof Error ? error.message : String(error);
var prepareLaunch = async (harness, input, active, guard) => {
  const adapter = EXTERNAL_HARNESS_ADAPTERS[harness];
  if (!adapter) {
    return {
      kind: "fallback",
      reason: "adapter-unavailable",
      detail: `No adapter is registered for ${harness}.`
    };
  }
  const blocked = guard?.();
  if (blocked) return blocked;
  if (!active.executableExists(adapter.executable)) {
    return {
      kind: "fallback",
      reason: "executable-unavailable",
      detail: `${adapter.executable} is unavailable.`
    };
  }
  const commandSpec = adapter.buildCommand(input);
  const authentication = await active.authenticate(commandSpec, adapter);
  if (!authentication.ok) {
    return {
      kind: "fallback",
      reason: "authentication-failed",
      detail: authentication.detail ?? `${adapter.executable} authentication check failed.`
    };
  }
  return { kind: "ready", command: commandSpec };
};
var launchPrepared = async (prepared, active, label) => {
  if (prepared.kind === "fallback") return prepared;
  try {
    const launched = await active.launch(prepared.command);
    return launched.exitCode === 0 ? { kind: "launched-success", exitCode: 0 } : { kind: "launched-failure", exitCode: launched.exitCode };
  } catch (error) {
    return {
      kind: "infrastructure-failure",
      detail: `External ${label} process failed: ${errorMessage(error)}`
    };
  }
};
var dispatchReview = async (request, overrides = {}) => {
  const active = { ...dependencies, ...overrides };
  const prepared = await prepareLaunch(request.harness, reviewCommandRequest(request), active);
  return launchPrepared(prepared, active, "review");
};

// src/skill-scripts/shared/harness-availability.ts
var AVAILABILITY_REGISTRY_VERSION = 1;
var AVAILABLE_TTL_MS = 30 * 60 * 1e3;
var UNAVAILABLE_TTL_MS = 5 * 60 * 1e3;
var PROBE_TIMEOUT_MS = 2e4;
var AVAILABILITY_CACHE_RELATIVE_PATH = path5.join("runtime", "harness-availability.json");
var PROBE_PROMPT = "Reply with OK.";
var probeCommand = (executable, argv, cwd, stdin = PROBE_PROMPT) => ({ executable, argv, cwd, stdin });
var HARNESS_AVAILABILITY_REGISTRY = {
  claude: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: "claude",
    buildCommand: (cwd) => probeCommand("claude", ["-p"], cwd)
  },
  codex: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: "codex",
    buildCommand: (cwd) => probeCommand("codex", ["exec", "-"], cwd)
  },
  cursor: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: "cursor-agent",
    buildCommand: (cwd) => probeCommand("cursor-agent", ["--print"], cwd)
  },
  gemini: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: "gemini",
    buildCommand: (cwd) => probeCommand("gemini", ["--prompt", PROBE_PROMPT], cwd, "")
  },
  copilot: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: "copilot",
    buildCommand: (cwd) => probeCommand("copilot", ["-p", PROBE_PROMPT], cwd, "")
  },
  opencode: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: "opencode",
    buildCommand: (cwd) => probeCommand("opencode", ["run", "-"], cwd)
  }
};
var registryKeys = Object.keys(HARNESS_AVAILABILITY_REGISTRY).sort();
var harnessKeys2 = [...SUPPORTED_HARNESSES].sort();
if (registryKeys.join("\0") !== harnessKeys2.join("\0")) {
  throw new Error("Harness availability registry does not cover SUPPORTED_HARNESSES exactly.");
}
for (const harness of SUPPORTED_HARNESSES) {
  const availability = HARNESS_AVAILABILITY_REGISTRY[harness];
  if (availability.executable !== EXTERNAL_HARNESS_ADAPTERS[harness].executable) {
    throw new Error(`Harness availability executable disagrees with the ${harness} adapter.`);
  }
}
var safeReason = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const firstLine = value.replace(/[\r\n]+/g, " ").trim().slice(0, 200);
  return firstLine || fallback;
};
var isOutcome = (value) => {
  if (!value || typeof value !== "object") return false;
  const entry = value;
  return typeof entry.available === "boolean" && typeof entry.observedAt === "number" && Number.isFinite(entry.observedAt) && typeof entry.expiresAt === "number" && Number.isFinite(entry.expiresAt) && typeof entry.reason === "string";
};
var readCache = (cachePath) => {
  try {
    const parsed = JSON.parse(fs5.readFileSync(cachePath, "utf8"));
    if (!parsed || typeof parsed !== "object") throw new Error("invalid cache");
    const record = parsed;
    if (record.version !== 1 || !record.harnesses || typeof record.harnesses !== "object") {
      throw new Error("invalid cache");
    }
    const harnesses = {};
    for (const harness of SUPPORTED_HARNESSES) {
      const candidate = record.harnesses[harness];
      if (isOutcome(candidate)) harnesses[harness] = candidate;
    }
    return { version: 1, harnesses };
  } catch {
    return { version: 1, harnesses: {} };
  }
};
var writeCache = (cachePath, harness, outcome) => {
  fs5.mkdirSync(path5.dirname(cachePath), { recursive: true });
  const cache = readCache(cachePath);
  const existing = cache.harnesses[harness];
  if (!existing || existing.observedAt <= outcome.observedAt) {
    cache.harnesses[harness] = {
      available: outcome.available,
      observedAt: outcome.observedAt,
      expiresAt: outcome.expiresAt,
      reason: outcome.reason
    };
  }
  const temporary = `${cachePath}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  try {
    fs5.writeFileSync(temporary, `${JSON.stringify(cache, null, 2)}
`, { mode: 384 });
    fs5.renameSync(temporary, cachePath);
  } finally {
    try {
      fs5.unlinkSync(temporary);
    } catch {
    }
  }
};
var runProbe = (command2, timeoutMs) => new Promise((resolve3) => {
  let settled = false;
  let diagnostics = "";
  const finish = (result) => {
    if (settled) return;
    settled = true;
    resolve3(result);
  };
  const child = (0, import_child_process3.spawn)(command2.executable, command2.argv, {
    cwd: command2.cwd,
    shell: false,
    stdio: ["pipe", "ignore", "pipe"]
  });
  const timer = setTimeout(() => {
    child.kill("SIGKILL");
    finish({ exitCode: 1, timedOut: true, detail: "Probe timed out." });
  }, timeoutMs);
  child.stderr?.on("data", (chunk) => {
    if (diagnostics.length < 400) diagnostics += String(chunk).slice(0, 400 - diagnostics.length);
  });
  child.once("error", (error) => {
    clearTimeout(timer);
    finish({ exitCode: 1, detail: error.message });
  });
  child.once("close", (code) => {
    clearTimeout(timer);
    finish({ exitCode: code ?? 1, detail: diagnostics });
  });
  child.stdin?.on("error", () => void 0);
  child.stdin?.end(command2.stdin);
});
var defaultDependencies = {
  now: Date.now,
  runProbe
};
var checkHarnessAvailability = async (request, overrides = {}) => {
  const active = { ...defaultDependencies, ...overrides };
  const now = active.now();
  if (request.harness === void 0 || request.harness === request.currentHarness) {
    return {
      harness: request.harness ?? request.currentHarness,
      available: true,
      observedAt: now,
      expiresAt: now,
      reason: "Native/current harness targets do not require a probe.",
      source: "bypass"
    };
  }
  const harness = request.harness;
  const cachePath = path5.join(request.strikethrooRoot, AVAILABILITY_CACHE_RELATIVE_PATH);
  const cached = readCache(cachePath).harnesses[harness];
  if (cached && cached.expiresAt > now) return { harness, ...cached, source: "cache" };
  const definition = HARNESS_AVAILABILITY_REGISTRY[harness];
  let probe;
  try {
    probe = await active.runProbe(definition.buildCommand(request.workspace), PROBE_TIMEOUT_MS);
  } catch (error) {
    probe = { exitCode: 1, detail: error instanceof Error ? error.message : String(error) };
  }
  const available = probe.exitCode === 0 && !probe.timedOut;
  const reason = available ? "Harness probe succeeded." : safeReason(
    probe.detail,
    probe.timedOut ? "Harness probe timed out." : "Harness probe failed."
  );
  const outcome = {
    harness,
    available,
    observedAt: now,
    expiresAt: now + (available ? AVAILABLE_TTL_MS : UNAVAILABLE_TTL_MS),
    reason,
    source: "probe"
  };
  try {
    writeCache(cachePath, harness, outcome);
  } catch {
  }
  return outcome;
};

// src/skill-scripts/shared/harness-discovery.ts
var discoverHarnesses = async (request, overrides = {}) => {
  const outcomes = await Promise.all(
    SUPPORTED_HARNESSES.map(async (harness) => {
      try {
        return await checkHarnessAvailability(
          {
            strikethrooRoot: request.strikethrooRoot,
            workspace: request.workspace,
            harness,
            currentHarness: request.currentHarness
          },
          overrides
        );
      } catch (error) {
        const now = Date.now();
        return {
          harness,
          available: false,
          observedAt: now,
          expiresAt: now,
          reason: error instanceof Error ? error.message : "Harness availability check failed.",
          source: "probe"
        };
      }
    })
  );
  const reviewerCandidates = SUPPORTED_HARNESSES.filter((harness) => {
    if (harness === request.currentHarness) return false;
    const outcome = outcomes.find((candidate) => candidate.harness === harness);
    return outcome?.available === true;
  });
  return { outcomes, reviewerCandidates };
};

// src/skill-scripts/shared/review-findings.ts
var import_child_process4 = require("child_process");
var SEVERITY_RANK = { critical: 4, major: 3, minor: 2, info: 1 };
var CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };
var MAX_REVIEW_ROUNDS = 3;
var DEFAULT_SEVERITY_FLOOR = "major";
var DEFAULT_CONFIDENCE_FLOOR = "high";
var XMLLINT_TIMEOUT_MS = 3e4;
var isSeverity = (value) => value in SEVERITY_RANK;
var isConfidence = (value) => value in CONFIDENCE_RANK;
var SEVERITY_FLOOR_RE = /^[ \t]*#{0,6}[ \t]*severity floor[ \t]*:[ \t]*`?([a-z]+)`?/im;
var CONFIDENCE_FLOOR_RE = /^[ \t]*#{0,6}[ \t]*confidence floor[ \t]*:[ \t]*`?([a-z]+)`?/im;
var ROUND_BUDGET_RE = /^[ \t]*#{0,6}[ \t]*round budget[ \t]*:[ \t]*`?(-?\d{1,9})`?/im;
var parseReviewMandate = (hookContent) => {
  const notes = [];
  const severityMatch = SEVERITY_FLOOR_RE.exec(hookContent);
  const statedSeverity = (severityMatch?.[1] ?? "").toLowerCase();
  let severityFloor = DEFAULT_SEVERITY_FLOOR;
  if (isSeverity(statedSeverity)) {
    severityFloor = statedSeverity;
  } else {
    notes.push(
      `The hook states no recognised severity floor, so the compiled default \`${DEFAULT_SEVERITY_FLOOR}\` applies.`
    );
  }
  const confidenceMatch = CONFIDENCE_FLOOR_RE.exec(hookContent);
  const statedConfidence = (confidenceMatch?.[1] ?? "").toLowerCase();
  let confidenceFloor = DEFAULT_CONFIDENCE_FLOOR;
  if (isConfidence(statedConfidence)) {
    confidenceFloor = statedConfidence;
  } else {
    notes.push(
      `The hook states no recognised confidence floor, so the compiled default \`${DEFAULT_CONFIDENCE_FLOOR}\` applies.`
    );
  }
  const budgetMatch = ROUND_BUDGET_RE.exec(hookContent);
  let roundBudget = MAX_REVIEW_ROUNDS;
  if (budgetMatch === null) {
    notes.push(
      `The hook states no round budget, so the compiled ceiling of ${MAX_REVIEW_ROUNDS} rounds applies.`
    );
  } else {
    const stated = Number(budgetMatch[1]);
    if (!Number.isInteger(stated) || stated < 1) {
      notes.push(
        `The hook states a round budget of "${budgetMatch[1]}", which is not a positive whole number of rounds, so the compiled ceiling of ${MAX_REVIEW_ROUNDS} applies.`
      );
    } else if (stated > MAX_REVIEW_ROUNDS) {
      notes.push(
        `The hook states a round budget of ${stated}, above the compiled ceiling of ${MAX_REVIEW_ROUNDS}. The ceiling is enforced in code and cannot be raised by editing the hook, so ${MAX_REVIEW_ROUNDS} rounds apply.`
      );
    } else {
      roundBudget = stated;
    }
  }
  return { severityFloor, confidenceFloor, roundBudget, notes };
};
var validateAgainstSchema = (xsdFile, xmlFile, timeoutMs = XMLLINT_TIMEOUT_MS) => new Promise((resolve3) => {
  let settled = false;
  let diagnostics = "";
  const finish = (result) => {
    if (settled) return;
    settled = true;
    resolve3(result);
  };
  const child = (0, import_child_process4.spawn)("xmllint", ["--nonet", "--schema", xsdFile, xmlFile, "--noout"], {
    shell: false,
    stdio: ["ignore", "ignore", "pipe"]
  });
  const timer = setTimeout(() => {
    child.kill("SIGKILL");
    finish({
      kind: "validator-unavailable",
      detail: `xmllint did not return a verdict on ${xmlFile} within ${timeoutMs} ms, so the findings could not be validated.`
    });
  }, timeoutMs);
  child.stderr?.on("data", (chunk) => {
    if (diagnostics.length < 2e3) {
      diagnostics += String(chunk).slice(0, 2e3 - diagnostics.length);
    }
  });
  child.once("error", (error) => {
    clearTimeout(timer);
    const code = error.code;
    finish({
      kind: "validator-unavailable",
      detail: code === "ENOENT" ? "`xmllint` was not found on PATH. The review gate validates every emitted review.xml against the vendored schema and cannot certify findings without it. Install libxml2-utils (or your platform equivalent) and re-run." : `\`xmllint\` could not be run (${code ?? "unknown error"}): ${error.message}`
    });
  });
  child.once("close", (code) => {
    clearTimeout(timer);
    finish(
      code === 0 ? { kind: "valid" } : {
        kind: "invalid",
        detail: diagnostics.trim() || `xmllint exited ${code ?? "with no status"}.`
      }
    );
  });
});
var SUMMARY_LIMIT = 400;
var decodeEntities = (text) => text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_match, digits) => String.fromCodePoint(Number(digits))).replace(
  /&#x([0-9a-fA-F]+);/g,
  (_match, hex) => String.fromCodePoint(parseInt(hex, 16))
).replace(/&amp;/g, "&");
var localName = (raw) => {
  const colon = raw.indexOf(":");
  return colon === -1 ? raw : raw.slice(colon + 1);
};
var ATTRIBUTE_RE = /([A-Za-z_:][-.\w:]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
var parseAttributes = (source) => {
  const attributes = {};
  ATTRIBUTE_RE.lastIndex = 0;
  let match = ATTRIBUTE_RE.exec(source);
  while (match !== null) {
    attributes[localName(match[1])] = decodeEntities(match[2] ?? match[3] ?? "");
    match = ATTRIBUTE_RE.exec(source);
  }
  return attributes;
};
var findTagEnd = (xml, start) => {
  let quote = null;
  for (let index = start + 1; index < xml.length; index += 1) {
    const character = xml[index];
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") return index + 1;
  }
  return xml.length;
};
var lineRange = (attributes) => {
  const newStart = attributes["new-line-start"];
  const newEnd = attributes["new-line-end"];
  if (newStart !== void 0) return `new:${newStart}-${newEnd ?? newStart}`;
  const oldStart = attributes["old-line-start"];
  const oldEnd = attributes["old-line-end"];
  if (oldStart !== void 0) return `old:${oldStart}-${oldEnd ?? oldStart}`;
  return null;
};
var parseReviewFindings = (xml) => {
  const findings = [];
  let file = null;
  let comment = null;
  let capture = null;
  let buffer = "";
  let index = 0;
  const appendText = (text) => {
    if (capture !== null) buffer += text;
  };
  while (index < xml.length) {
    const open = xml.indexOf("<", index);
    if (open === -1) break;
    if (open > index) appendText(decodeEntities(xml.slice(index, open)));
    if (xml.startsWith("<!--", open)) {
      const end = xml.indexOf("-->", open + 4);
      index = end === -1 ? xml.length : end + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", open)) {
      const end = xml.indexOf("]]>", open + 9);
      appendText(xml.slice(open + 9, end === -1 ? xml.length : end));
      index = end === -1 ? xml.length : end + 3;
      continue;
    }
    if (xml.startsWith("<?", open)) {
      const end = xml.indexOf("?>", open + 2);
      index = end === -1 ? xml.length : end + 2;
      continue;
    }
    if (xml.startsWith("<!", open)) {
      index = findTagEnd(xml, open);
      continue;
    }
    const tagEnd = findTagEnd(xml, open);
    const raw = xml.slice(open + 1, tagEnd - 1);
    index = tagEnd;
    const closing = raw.startsWith("/");
    const selfClosing = !closing && raw.trimEnd().endsWith("/");
    const body = closing ? raw.slice(1) : selfClosing ? raw.trimEnd().slice(0, -1) : raw;
    const nameMatch = /^\s*([^\s/>]+)/.exec(body);
    if (nameMatch === null) continue;
    const name = localName(nameMatch[1]);
    const rest = body.slice(nameMatch[0].length);
    if (closing) {
      if (name === "body" && capture === "body") {
        if (comment !== null) comment.summary = buffer.trim().slice(0, SUMMARY_LIMIT);
        capture = null;
      } else if (name === "category" && capture === "category") {
        if (comment !== null) comment.category = buffer.trim() || null;
        capture = null;
      } else if (name === "comment") {
        if (comment !== null) findings.push({ ...comment });
        comment = null;
        capture = null;
      } else if (name === "file") {
        file = null;
      }
      continue;
    }
    const attributes = parseAttributes(rest);
    if (name === "file") {
      if (!selfClosing) file = attributes["path"] ?? "";
      continue;
    }
    if (name === "comment") {
      const severity = attributes["severity"] ?? "";
      const confidence = attributes["confidence"] ?? "";
      comment = {
        file: file ?? "",
        location: lineRange(attributes),
        // Absent, empty, and unrecognised all become null, and null falls below
        // every floor. This is the one place the fail-safe default lives.
        severity: isSeverity(severity) ? severity : null,
        confidence: isConfidence(confidence) ? confidence : null,
        category: null,
        hasSuggestion: false,
        summary: ""
      };
      capture = null;
      if (selfClosing) {
        findings.push({ ...comment });
        comment = null;
      }
      continue;
    }
    if (comment === null) continue;
    if (name === "body") {
      capture = "body";
      buffer = "";
    } else if (name === "category") {
      capture = "category";
      buffer = "";
    } else if (name === "suggestion") {
      comment.hasSuggestion = true;
    }
  }
  return findings;
};
var partitionFindings = (findings, severityFloor, confidenceFloor) => {
  const actionable = [];
  const recorded = [];
  let aboveFloor = 0;
  let aboveFloorWithoutSuggestion = 0;
  for (const finding of findings) {
    const reasons = [];
    if (finding.severity === null) {
      reasons.push("severity-absent");
    } else if (SEVERITY_RANK[finding.severity] < SEVERITY_RANK[severityFloor]) {
      reasons.push("severity-below-floor");
    }
    if (finding.confidence === null) {
      reasons.push("confidence-absent");
    } else if (CONFIDENCE_RANK[finding.confidence] < CONFIDENCE_RANK[confidenceFloor]) {
      reasons.push("confidence-below-floor");
    }
    const clearsFloors = reasons.length === 0;
    if (clearsFloors) aboveFloor += 1;
    if (!finding.hasSuggestion) {
      reasons.push("no-suggestion");
      if (clearsFloors) aboveFloorWithoutSuggestion += 1;
    }
    if (reasons.length === 0) {
      actionable.push(finding);
    } else {
      recorded.push({ ...finding, reasons });
    }
  }
  return {
    severityFloor,
    confidenceFloor,
    actionable,
    recorded,
    counts: {
      total: findings.length,
      aboveFloor,
      belowFloor: findings.length - aboveFloor,
      actionable: actionable.length,
      recorded: recorded.length,
      aboveFloorWithoutSuggestion
    }
  };
};

// src/skill-scripts/code-review.ts
var HOOK_RELATIVE_PATH = path6.join("config", "hooks", "CODE_REVIEW.md");
var XSD_RELATIVE_PATH = path6.join("config", "schemas", "self-review-v2.xsd");
var REVIEW_DIR_NAME = "review";
var BASE_COMMIT_FILE_NAME = "base-commit.json";
var REVIEW_FILE_NAME = "review.xml";
var FINDINGS_FILE_NAME = "findings.json";
var SHA_RE = /^[0-9a-f]{40}$/i;
var errorMessage2 = (error) => error instanceof Error ? error.message : String(error);
var readFileOrNull = (filePath) => {
  try {
    return fs6.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
};
var createFindingsGate = (mandate) => async (context) => {
  const roundDir = path6.dirname(context.reviewFile);
  const findingsFile = path6.join(roundDir, FINDINGS_FILE_NAME);
  const record = (payload) => {
    try {
      fs6.mkdirSync(roundDir, { recursive: true });
      fs6.writeFileSync(findingsFile, `${JSON.stringify(payload, null, 2)}
`, "utf8");
    } catch (error) {
      throw new Error(
        `The review round's findings partition could not be written to ${findingsFile}: ${errorMessage2(error)}`
      );
    }
  };
  const base = {
    round: context.round,
    reviewFile: context.reviewFile,
    xsdFile: context.xsdFile,
    severityFloor: mandate.severityFloor,
    confidenceFloor: mandate.confidenceFloor
  };
  if (!fs6.existsSync(context.reviewFile)) {
    const detail = `The reviewer did not write ${context.reviewFile}. A round with no findings document cannot be read as a round with no findings.`;
    record({ ...base, status: "findings-absent", detail, actionable: [], recorded: [] });
    return { kind: "findings-absent", detail };
  }
  const validation = await validateAgainstSchema(context.xsdFile, context.reviewFile);
  if (validation.kind === "validator-unavailable") {
    record({
      ...base,
      status: "validator-unavailable",
      detail: validation.detail,
      actionable: [],
      recorded: []
    });
    return { kind: "validator-unavailable", detail: validation.detail };
  }
  if (validation.kind === "invalid") {
    const detail = `${context.reviewFile} does not validate against ${context.xsdFile}, so its findings were not thresholded and none of them was applied. xmllint reported: ${validation.detail}`;
    record({ ...base, status: "schema-invalid", detail, actionable: [], recorded: [] });
    return { kind: "schema-invalid", detail };
  }
  const xml = readFileOrNull(context.reviewFile);
  if (xml === null) {
    const detail = `${context.reviewFile} validated but could not then be read.`;
    record({ ...base, status: "findings-absent", detail, actionable: [], recorded: [] });
    return { kind: "findings-absent", detail };
  }
  const partition = partitionFindings(
    parseReviewFindings(xml),
    mandate.severityFloor,
    mandate.confidenceFloor
  );
  record({
    ...base,
    status: "evaluated",
    counts: partition.counts,
    actionable: partition.actionable,
    recorded: partition.recorded
  });
  return {
    kind: "evaluated",
    aboveFloor: partition.counts.aboveFloor,
    belowFloor: partition.counts.belowFloor,
    actionable: partition.counts.actionable,
    recorded: partition.counts.recorded,
    total: partition.counts.total,
    aboveFloorWithoutSuggestion: partition.counts.aboveFloorWithoutSuggestion,
    severityFloor: mandate.severityFloor,
    confidenceFloor: mandate.confidenceFloor,
    findingsFile
  };
};
var _readBaseCommit = (filePath) => {
  const raw = readFileOrNull(filePath);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const candidate = parsed.baseCommit;
      if (typeof candidate === "string" && SHA_RE.test(candidate)) return candidate;
    }
  } catch {
    return null;
  }
  return null;
};
var GENERATED_ATTRIBUTES = ["linguist-generated", "linguist-vendored"];
var attributeExcluded = (workspace, files) => {
  const excluded = /* @__PURE__ */ new Set();
  if (files.length === 0) return excluded;
  const report = execGit(
    `git -C ${JSON.stringify(workspace)} check-attr ${GENERATED_ATTRIBUTES.join(" ")} -- ` + files.map((file) => JSON.stringify(file)).join(" ")
  );
  if (report === null) return excluded;
  for (const line of report.split("\n")) {
    const marker = line.lastIndexOf(": ");
    if (marker === -1 || line.slice(marker + 2).trim() !== "true") continue;
    const withoutValue = line.slice(0, marker);
    const attribute = withoutValue.lastIndexOf(": ");
    if (attribute === -1) continue;
    excluded.add(withoutValue.slice(0, attribute));
  }
  return excluded;
};
var excludedPaths = (workspace, baseCommit) => {
  const changed = execGit(`git -C ${JSON.stringify(workspace)} diff --name-only ${baseCommit} --`);
  if (changed === null || changed.trim() === "") return [];
  const files = changed.split("\n").filter((line) => line.trim() !== "");
  return [...attributeExcluded(workspace, files)];
};
var untrackedPaths = (workspace) => {
  const listed = execGit(
    `git -c core.quotePath=false -C ${JSON.stringify(workspace)} ls-files --others --exclude-standard`
  );
  if (listed === null || listed.trim() === "") return [];
  const files = listed.split("\n").filter((line) => line.trim() !== "");
  const excluded = attributeExcluded(workspace, files);
  return files.filter((file) => !excluded.has(file));
};
var untrackedDiff = (workspace, file) => execGitDiffAllowingChanges(
  `git -C ${JSON.stringify(workspace)} diff --no-index --src-prefix=a/ --dst-prefix=b/ -- /dev/null ${JSON.stringify(file)}`
);
var _readCumulativeDiff = (workspace, baseCommit) => {
  const exclusions = excludedPaths(workspace, baseCommit).map((file) => ` ${JSON.stringify(`:(exclude,literal)${file}`)}`).join("");
  const tracked = execGit(
    `git -C ${JSON.stringify(workspace)} diff ${baseCommit} -- .${exclusions}`
  );
  if (tracked === null) return null;
  const added = untrackedPaths(workspace).map((file) => untrackedDiff(workspace, file)).filter((diff) => diff !== null && diff.trim() !== "");
  return [tracked, ...added].filter((part) => part.trim() !== "").join("\n");
};
var defaultDependencies2 = {
  discover: discoverHarnesses,
  dispatch: dispatchReview,
  readDiff: _readCumulativeDiff,
  validatorAvailable: () => executableOnPath("xmllint")
};
var readReviewerSkill = () => {
  const skillFile = path6.resolve(__dirname, "..", "SKILL.md");
  const content = readFileOrNull(skillFile);
  return content === null ? "Load the `st-code-review` skill and follow its Operating Procedure. If that skill is not installed on this harness, follow the mandate below exactly." : content;
};
var renderAdjudicated = (findings) => {
  if (findings.length === 0) {
    return "None. This is the first round, or no earlier finding has been ruled on.";
  }
  return findings.map((finding) => {
    const attributes = [
      finding.severity === void 0 ? null : `severity=${finding.severity}`,
      finding.confidence === void 0 ? null : `confidence=${finding.confidence}`
    ].filter((part) => part !== null).join(" ");
    const where = finding.location === void 0 ? finding.file : `${finding.file}:${finding.location}`;
    return `- [${finding.disposition}] ${where}${attributes ? ` (${attributes})` : ""} \u2014 ${finding.summary}`;
  }).join("\n");
};
var buildReviewerPrompt = (input) => [
  `Strikethroo code review gate \u2014 Plan ${input.planId}, review round ${input.round}.`,
  "",
  "You are the independent reviewer, running on a different harness than the one",
  "that wrote this code. You detect; you never fix. Do not edit, create, or delete",
  "source files. Do not run formatters. Do not commit. Your entire output is one",
  "review.xml at the path named below, plus a short report of the counts.",
  "",
  `Repository / workspace root: ${input.workspace}`,
  `Strikethroo workspace root: ${input.strikethrooRoot}`,
  `Plan document (read it in full): ${input.planFile}`,
  `Review mandate hook: ${input.hookFile}`,
  `Findings schema to validate against: ${input.xsdFile}`,
  `Base commit anchoring this plan's scope: ${input.baseCommit}`,
  `Round: ${input.round}`,
  `Write your findings to: ${input.reviewFile}`,
  "",
  "## Review mandate (authoritative \u2014 it overrides the reviewer instructions below)",
  "",
  input.hookContent.trim(),
  "",
  "## Reviewer instructions",
  "",
  input.skillInstructions.trim(),
  "",
  "## Prior adjudicated findings \u2014 do not re-litigate these",
  "",
  renderAdjudicated(input.adjudicatedFindings),
  "",
  "## Cumulative diff",
  "",
  `Produced with \`git diff ${input.baseCommit} --\` in ${input.workspace}: the recorded`,
  "base commit against the current working tree. Committed phase work and",
  "uncommitted changes are both in scope. Review this diff, not an incremental one.",
  input.diff.trim().length === 0 ? "\nThe cumulative diff is empty. Emit a <review> with no <file> children and report\nzero findings. That is not an error." : `
<<<BEGIN CUMULATIVE DIFF>>>
${input.diff}
<<<END CUMULATIVE DIFF>>>`,
  ""
].join("\n");
var asAdjudicated = (value, disposition) => {
  if (!Array.isArray(value)) return [];
  const adjudicated = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== "object") continue;
    const finding = entry;
    if (typeof finding["file"] !== "string") continue;
    adjudicated.push({
      file: finding["file"],
      ...typeof finding["location"] === "string" ? { location: finding["location"] } : {},
      ...typeof finding["severity"] === "string" ? { severity: finding["severity"] } : {},
      ...typeof finding["confidence"] === "string" ? { confidence: finding["confidence"] } : {},
      summary: typeof finding["summary"] === "string" ? finding["summary"] : "",
      disposition
    });
  }
  return adjudicated;
};
var _readPriorAdjudicated = (planDir, round) => {
  const carried = /* @__PURE__ */ new Map();
  for (let prior = 1; prior < round; prior += 1) {
    const raw = readFileOrNull(
      path6.join(planDir, REVIEW_DIR_NAME, `round-${prior}`, FINDINGS_FILE_NAME)
    );
    if (raw === null) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || typeof parsed !== "object") continue;
      const partition = parsed;
      const roundFindings = [
        ...asAdjudicated(partition["actionable"], "applied"),
        ...asAdjudicated(partition["recorded"], "recorded-below-floor")
      ];
      for (const finding of roundFindings) {
        carried.set(`${finding.file}|${finding.location ?? ""}|${finding.summary}`, finding);
      }
    } catch {
      continue;
    }
  }
  return [...carried.values()];
};
var skip = (reason, detail) => ({
  kind: "skipped",
  reason,
  detail
});
var resolveReviewContext = (startPath, validatorAvailable = () => executableOnPath("xmllint")) => {
  const strikethrooRoot = findStrikethrooRoot(startPath);
  if (!strikethrooRoot) {
    return {
      kind: "ended",
      result: {
        kind: "infrastructure-failure",
        detail: `No Strikethroo workspace was found from ${startPath}.`
      }
    };
  }
  const hookFile = path6.join(strikethrooRoot, HOOK_RELATIVE_PATH);
  const hookContent = readFileOrNull(hookFile);
  if (hookContent === null) {
    return {
      kind: "ended",
      result: skip(
        "hook-absent",
        `No code review mandate at ${hookFile}, so the review gate was skipped. Re-run \`npx strikethroo init\` to add it.`
      )
    };
  }
  if (hookContent.trim().length === 0) {
    return {
      kind: "ended",
      result: skip(
        "hook-empty",
        `The code review mandate at ${hookFile} is empty, which is the documented way to disable the gate, so the review gate was skipped.`
      )
    };
  }
  const xsdFile = path6.join(strikethrooRoot, XSD_RELATIVE_PATH);
  if (!fs6.existsSync(xsdFile)) {
    return {
      kind: "ended",
      result: skip(
        "xsd-absent",
        `No findings schema at ${xsdFile}, so findings could not be validated and the review gate was skipped. Re-run \`npx strikethroo init\` to add it.`
      )
    };
  }
  if (!validatorAvailable()) {
    return {
      kind: "ended",
      result: skip(
        "validator-absent",
        "No `xmllint` on PATH, so emitted findings could not be validated against the vendored schema and the review gate was skipped. Install libxml2-utils (Debian/Ubuntu), libxml2 (Homebrew), or your platform equivalent to enable the gate."
      )
    };
  }
  return {
    kind: "resolved",
    context: {
      strikethrooRoot,
      workspace: path6.dirname(path6.dirname(strikethrooRoot)),
      hookFile,
      hookContent,
      xsdFile,
      mandate: parseReviewMandate(hookContent)
    }
  };
};
var runReviewRound = async (request, overrides = {}) => {
  const dependencies2 = { ...defaultDependencies2, ...overrides };
  const startPath = request.startPath ?? process.cwd();
  const resolution = resolveReviewContext(startPath, dependencies2.validatorAvailable);
  if (resolution.kind === "ended") return resolution.result;
  const { strikethrooRoot, workspace, hookFile, hookContent, xsdFile, mandate } = resolution.context;
  const resolved = resolvePlan(request.plan, startPath);
  if (!resolved) {
    return {
      kind: "infrastructure-failure",
      detail: `Plan "${request.plan}" was not found or is invalid.`
    };
  }
  const { planDir, planFile, planId } = resolved;
  const baseCommitFile = path6.join(planDir, REVIEW_DIR_NAME, BASE_COMMIT_FILE_NAME);
  const baseCommit = _readBaseCommit(baseCommitFile);
  if (baseCommit === null) {
    return skip(
      "base-commit-absent",
      `No base commit was recorded at ${baseCommitFile}, so the review had no anchored diff scope and the review gate was skipped.`
    );
  }
  const discovery = await dependencies2.discover({
    strikethrooRoot,
    workspace,
    currentHarness: request.currentHarness
  });
  const harness = discovery.reviewerCandidates[0];
  if (harness === void 0) {
    return skip(
      "no-reviewer-candidate",
      `No harness other than \`${request.currentHarness}\` is installed and responsive, so the review gate was skipped.`
    );
  }
  const diff = dependencies2.readDiff(workspace, baseCommit);
  if (diff === null) {
    return {
      kind: "infrastructure-failure",
      detail: `git diff ${baseCommit} failed in ${workspace}. The base commit was recorded, so this is a real failure rather than an absent-scope skip.`
    };
  }
  if (diff.trim() === "") {
    return skip(
      "empty-diff",
      `The diff from ${baseCommit} to the working tree in ${workspace} is empty, so there was nothing to review. No reviewer was dispatched, and no round was certified.`
    );
  }
  const roundDir = path6.join(planDir, REVIEW_DIR_NAME, `round-${request.round}`);
  const reviewFile = path6.join(roundDir, REVIEW_FILE_NAME);
  try {
    fs6.mkdirSync(roundDir, { recursive: true });
  } catch (error) {
    return {
      kind: "infrastructure-failure",
      detail: `Could not create the review round directory ${roundDir}: ${errorMessage2(error)}`
    };
  }
  const prompt = buildReviewerPrompt({
    planId,
    planFile,
    strikethrooRoot,
    workspace,
    hookFile,
    hookContent,
    xsdFile,
    baseCommit,
    round: request.round,
    reviewFile,
    diff,
    adjudicatedFindings: request.adjudicatedFindings ?? _readPriorAdjudicated(planDir, request.round),
    skillInstructions: readReviewerSkill()
  });
  const dispatched = await dependencies2.dispatch({ harness, workspace, prompt });
  if (dispatched.kind === "infrastructure-failure") {
    return { kind: "infrastructure-failure", detail: dispatched.detail };
  }
  if (dispatched.kind === "fallback") {
    return {
      kind: "fallback",
      harness,
      round: request.round,
      reason: dispatched.reason,
      detail: dispatched.detail
    };
  }
  if (dispatched.kind === "launched-failure") {
    return {
      kind: "launched-failure",
      harness,
      round: request.round,
      reviewFile,
      exitCode: dispatched.exitCode,
      detail: `The ${harness} reviewer exited ${dispatched.exitCode}.`
    };
  }
  const evaluate = dependencies2.evaluateFindings ?? createFindingsGate(mandate);
  const findingsGate = await evaluate({
    reviewFile,
    xsdFile,
    planDir,
    round: request.round
  });
  return {
    kind: "reviewed",
    harness,
    round: request.round,
    baseCommit,
    reviewFile,
    reviewFilePresent: fs6.existsSync(reviewFile),
    findingsGate
  };
};
var _decideRound = (outcome, round, roundBudget) => {
  if (outcome.kind !== "evaluated") {
    return { kind: "round-failed", detail: outcome.detail };
  }
  const recorded = `${outcome.recorded} finding(s) were recorded without being applied, of which ${outcome.aboveFloorWithoutSuggestion} cleared both floors but carried no local fix. See ${outcome.findingsFile}.`;
  if (outcome.actionable === 0) {
    return {
      kind: "gate-passed",
      detail: `No finding cleared the \`${outcome.severityFloor}\` severity floor and the \`${outcome.confidenceFloor}\` confidence floor with a local fix attached, so the review gate passed on round ${round}. ${recorded}`
    };
  }
  if (round >= roundBudget) {
    return {
      kind: "budget-exhausted",
      actionable: outcome.actionable,
      detail: `Round ${round} of an enforced ${roundBudget}-round budget still reports ${outcome.actionable} actionable finding(s), so the review gate halts with the budget exhausted. The plan stays in \`plans/\` and every round's findings are recorded under its \`review/\` directory. ${recorded}`
    };
  }
  return {
    kind: "fix-and-continue",
    nextRound: round + 1,
    actionable: outcome.actionable,
    detail: `${outcome.actionable} finding(s) clear both floors and carry a local fix. Dispatch them on the implementer route, re-run POST_EXECUTION in full, then run round ${round + 1} of ${roundBudget}. ${recorded}`
  };
};
var runBoundedReviewRound = async (request, overrides = {}) => {
  const startPath = request.startPath ?? process.cwd();
  const resolution = resolveReviewContext(
    startPath,
    { ...defaultDependencies2, ...overrides }.validatorAvailable
  );
  if (resolution.kind === "ended") return resolution.result;
  const { mandate } = resolution.context;
  if (request.round > mandate.roundBudget) {
    return {
      kind: "budget-exhausted",
      round: request.round,
      roundBudget: mandate.roundBudget,
      roundCeiling: MAX_REVIEW_ROUNDS,
      mandateNotes: mandate.notes,
      detail: `Round ${request.round} was requested, but the review gate enforces a ${mandate.roundBudget}-round budget (compiled ceiling ${MAX_REVIEW_ROUNDS}). No reviewer was dispatched. The plan stays in \`plans/\` and the rounds already run are recorded under its \`review/\` directory.`
    };
  }
  const result = await runReviewRound(request, overrides);
  if (result.kind !== "reviewed") return result;
  return {
    ...result,
    decision: _decideRound(result.findingsGate, request.round, mandate.roundBudget),
    roundBudget: mandate.roundBudget,
    roundCeiling: MAX_REVIEW_ROUNDS,
    mandateNotes: mandate.notes
  };
};
var emit = (result, exitCode) => {
  process.stdout.write(`${JSON.stringify(result)}
`);
  process.exit(exitCode);
};
var _exitCodeFor = (result) => {
  if (result.kind === "infrastructure-failure") return 2;
  if (result.kind === "launched-failure") return 1;
  if (result.kind === "budget-exhausted") return 1;
  if (result.kind === "reviewed" && result.decision !== void 0) {
    return result.decision.kind === "budget-exhausted" || result.decision.kind === "round-failed" ? 1 : 0;
  }
  return 0;
};
var main = async (startPath = process.cwd()) => {
  const [planArg, harnessArg, roundArg] = process.argv.slice(2);
  if (!planArg || !harnessArg || !SUPPORTED_HARNESSES.includes(harnessArg)) {
    emit(
      {
        kind: "infrastructure-failure",
        detail: `Usage: code-review.cjs <plan-id-or-path> <current-harness> [round]. <current-harness> is one of: ${SUPPORTED_HARNESSES.join(", ")}.`
      },
      2
    );
  }
  const round = roundArg === void 0 ? 1 : Number(roundArg);
  if (!Number.isInteger(round) || round < 1) {
    emit(
      { kind: "infrastructure-failure", detail: `Round "${roundArg}" is not a positive integer.` },
      2
    );
  }
  const result = await runBoundedReviewRound({
    plan: planArg,
    currentHarness: harnessArg,
    round,
    startPath
  });
  emit(result, _exitCodeFor(result));
};
if (require.main === module) {
  main().catch((error) => {
    emit(
      {
        kind: "infrastructure-failure",
        detail: `Code review gate infrastructure failed: ${errorMessage2(error)}`
      },
      2
    );
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MAX_REVIEW_ROUNDS,
  _decideRound,
  _exitCodeFor,
  _readBaseCommit,
  _readCumulativeDiff,
  _readPriorAdjudicated,
  buildReviewerPrompt,
  createFindingsGate,
  main,
  parseReviewMandate,
  runBoundedReviewRound,
  runReviewRound
});
