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
  _exitCodeFor: () => _exitCodeFor,
  _extractReviewDocument: () => _extractReviewDocument,
  _makeDeliveryToken: () => _makeDeliveryToken,
  _readBaseCommit: () => _readBaseCommit,
  _readCumulativeDiff: () => _readCumulativeDiff,
  _verdictFor: () => _verdictFor,
  buildReviewerPrompt: () => buildReviewerPrompt,
  createFindingsGate: () => createFindingsGate,
  main: () => main,
  runReview: () => runReview
});
module.exports = __toCommonJS(code_review_exports);
var crypto = __toESM(require("crypto"));
var fs7 = __toESM(require("fs"));
var path8 = __toESM(require("path"));

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
var GIT_OUTPUT_LIMIT = 64 * 1024 * 1024;
var execGit = (command2) => {
  try {
    return (0, import_child_process.execSync)(command2, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: GIT_OUTPUT_LIMIT
    }).trim();
  } catch (_error) {
    return null;
  }
};
var execGitDiffAllowingChanges = (command2) => {
  try {
    return (0, import_child_process.execSync)(command2, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: GIT_OUTPUT_LIMIT
    });
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
var import_crypto2 = require("crypto");
var import_child_process3 = require("child_process");
var fs6 = __toESM(require("fs"));
var os = __toESM(require("os"));
var path7 = __toESM(require("path"));

// src/skill-scripts/shared/harness-configuration.ts
var import_crypto = require("crypto");
var fs4 = __toESM(require("fs"));
var path5 = __toESM(require("path"));

// node_modules/js-yaml/dist/js-yaml.mjs
var NOT_RESOLVED = /* @__PURE__ */ Symbol("NOT_RESOLVED");
var MERGE_KEY = /* @__PURE__ */ Symbol("MERGE_KEY");
function defineScalarTag(tagName, options) {
  return {
    tagName,
    nodeKind: "scalar",
    implicit: options.implicit ?? false,
    matchByTagPrefix: options.matchByTagPrefix ?? false,
    implicitFirstChars: options.implicitFirstChars ?? null,
    resolve: options.resolve,
    identify: options.identify ?? null,
    represent: options.represent ?? ((data) => String(data)),
    representTagName: options.representTagName ?? null
  };
}
function defineSequenceTag(tagName, options) {
  const carrierIsResult = options.finalize === void 0;
  return {
    tagName,
    nodeKind: "sequence",
    implicit: false,
    matchByTagPrefix: options.matchByTagPrefix ?? false,
    create: options.create,
    addItem: options.addItem,
    finalize: options.finalize ?? ((carrier) => carrier),
    carrierIsResult,
    identify: options.identify ?? null,
    represent: options.represent ?? ((data) => data),
    representTagName: options.representTagName ?? null
  };
}
function defineMappingTag(tagName, options) {
  const carrierIsResult = options.finalize === void 0;
  return {
    tagName,
    nodeKind: "mapping",
    implicit: false,
    matchByTagPrefix: options.matchByTagPrefix ?? false,
    create: options.create,
    addPair: options.addPair,
    has: options.has,
    keys: options.keys,
    get: options.get,
    finalize: options.finalize ?? ((carrier) => carrier),
    carrierIsResult,
    identify: options.identify ?? null,
    represent: options.represent ?? ((data) => data),
    representTagName: options.representTagName ?? null
  };
}
var strTag = defineScalarTag("tag:yaml.org,2002:str", {
  resolve: (source) => source,
  identify: (data) => typeof data === "string"
});
var NULL_VALUES$1 = [
  "",
  "~",
  "null",
  "Null",
  "NULL"
];
var nullCoreTag = defineScalarTag("tag:yaml.org,2002:null", {
  implicit: true,
  implicitFirstChars: [
    "",
    "~",
    "n",
    "N"
  ],
  resolve: (source) => {
    if (NULL_VALUES$1.indexOf(source) !== -1) return null;
    return NOT_RESOLVED;
  },
  identify: (object) => object === null,
  represent: () => "null"
});
var nullJsonTag = defineScalarTag("tag:yaml.org,2002:null", {
  implicit: true,
  implicitFirstChars: ["n"],
  resolve: (source, isExplicit) => {
    if (source === "null" || isExplicit && source === "") return null;
    return NOT_RESOLVED;
  },
  identify: (object) => object === null,
  represent: () => "null"
});
var NULL_VALUES = [
  "",
  "~",
  "null",
  "Null",
  "NULL"
];
var nullYaml11Tag = defineScalarTag("tag:yaml.org,2002:null", {
  implicit: true,
  implicitFirstChars: [
    "",
    "~",
    "n",
    "N"
  ],
  resolve: (source) => {
    if (NULL_VALUES.indexOf(source) !== -1) return null;
    return NOT_RESOLVED;
  },
  identify: (object) => object === null,
  represent: () => "null"
});
var TRUE_VALUES$2 = [
  "true",
  "True",
  "TRUE"
];
var FALSE_VALUES$2 = [
  "false",
  "False",
  "FALSE"
];
var boolCoreTag = defineScalarTag("tag:yaml.org,2002:bool", {
  implicit: true,
  implicitFirstChars: [
    "t",
    "T",
    "f",
    "F"
  ],
  resolve: (source) => {
    if (TRUE_VALUES$2.indexOf(source) !== -1) return true;
    if (FALSE_VALUES$2.indexOf(source) !== -1) return false;
    return NOT_RESOLVED;
  },
  identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
  represent: (object) => object ? "true" : "false"
});
var TRUE_VALUES$1 = ["true"];
var FALSE_VALUES$1 = ["false"];
var boolJsonTag = defineScalarTag("tag:yaml.org,2002:bool", {
  implicit: true,
  implicitFirstChars: ["t", "f"],
  resolve: (source) => {
    if (TRUE_VALUES$1.indexOf(source) !== -1) return true;
    if (FALSE_VALUES$1.indexOf(source) !== -1) return false;
    return NOT_RESOLVED;
  },
  identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
  represent: (object) => object ? "true" : "false"
});
var TRUE_VALUES = [
  "true",
  "True",
  "TRUE",
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON"
];
var FALSE_VALUES = [
  "false",
  "False",
  "FALSE",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
var boolYaml11Tag = defineScalarTag("tag:yaml.org,2002:bool", {
  implicit: true,
  implicitFirstChars: [
    "y",
    "Y",
    "n",
    "N",
    "t",
    "T",
    "f",
    "F",
    "o",
    "O"
  ],
  resolve: (source) => {
    if (TRUE_VALUES.indexOf(source) !== -1) return true;
    if (FALSE_VALUES.indexOf(source) !== -1) return false;
    return NOT_RESOLVED;
  },
  identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
  represent: (object) => object ? "true" : "false"
});
var YAML_INTEGER_IMPLICIT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:0o[0-7]+|0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
var YAML_INTEGER_EXPLICIT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
function parseYamlInteger$2(source) {
  let value = source;
  let sign = 1;
  if (value[0] === "-" || value[0] === "+") {
    if (value[0] === "-") sign = -1;
    value = value.slice(1);
  }
  if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
  if (value.startsWith("0o")) return sign * parseInt(value.slice(2), 8);
  if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
  return sign * parseInt(value, 10);
}
function resolveYamlInteger$2(source, isExplicit) {
  if (isExplicit) {
    if (!YAML_INTEGER_EXPLICIT_PATTERN$1.test(source)) return NOT_RESOLVED;
  } else if (!YAML_INTEGER_IMPLICIT_PATTERN$1.test(source)) return NOT_RESOLVED;
  const result = parseYamlInteger$2(source);
  return Number.isFinite(result) ? result : NOT_RESOLVED;
}
var intCoreTag = defineScalarTag("tag:yaml.org,2002:int", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ..."0123456789"
  ],
  resolve: resolveYamlInteger$2,
  identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
  represent: (object) => object.toString(10)
});
var YAML_INTEGER_IMPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^-?(?:0|[1-9][0-9]*)$");
var YAML_INTEGER_EXPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
function parseYamlInteger$1(source) {
  let value = source;
  let sign = 1;
  if (value[0] === "-" || value[0] === "+") {
    if (value[0] === "-") sign = -1;
    value = value.slice(1);
  }
  if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
  if (value.startsWith("0o")) return sign * parseInt(value.slice(2), 8);
  if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
  return sign * parseInt(value, 10);
}
function resolveYamlInteger$1(source, isExplicit) {
  if (isExplicit) {
    if (!YAML_INTEGER_EXPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
  } else if (!YAML_INTEGER_IMPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
  const result = parseYamlInteger$1(source);
  return Number.isFinite(result) ? result : NOT_RESOLVED;
}
var intJsonTag = defineScalarTag("tag:yaml.org,2002:int", {
  implicit: true,
  implicitFirstChars: ["-", ..."0123456789"],
  resolve: resolveYamlInteger$1,
  identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
  represent: (object) => object.toString(10)
});
var YAML_INTEGER_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1_]+|[-+]?0[0-7_]+|[-+]?0x[0-9a-fA-F_]+|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+|[-+]?(?:0|[1-9][0-9_]*))$");
function parseYamlInteger(source) {
  let value = source.replace(/_/g, "");
  let sign = 1;
  if (value[0] === "-" || value[0] === "+") {
    if (value[0] === "-") sign = -1;
    value = value.slice(1);
  }
  if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
  if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
  if (value.includes(":")) {
    let result = 0;
    for (const part of value.split(":")) result = result * 60 + Number(part);
    return sign * result;
  }
  if (value !== "0" && value[0] === "0") return sign * parseInt(value, 8);
  return sign * parseInt(value, 10);
}
function resolveYamlInteger(source) {
  if (!YAML_INTEGER_PATTERN.test(source)) return NOT_RESOLVED;
  const result = parseYamlInteger(source);
  return Number.isFinite(result) ? result : NOT_RESOLVED;
}
var intYaml11Tag = defineScalarTag("tag:yaml.org,2002:int", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ..."0123456789"
  ],
  resolve: resolveYamlInteger,
  identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
  represent: (object) => object.toString(10)
});
var YAML_FLOAT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
var YAML_FLOAT_SPECIAL_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat$2(source) {
  if (!YAML_FLOAT_PATTERN$1.test(source)) return NOT_RESOLVED;
  let value = source.toLowerCase();
  const sign = value[0] === "-" ? -1 : 1;
  if ("+-".includes(value[0])) value = value.slice(1);
  if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  if (value === ".nan") return NaN;
  const result = sign * parseFloat(value);
  if (Number.isFinite(result) || YAML_FLOAT_SPECIAL_PATTERN$1.test(source)) return result;
  return NOT_RESOLVED;
}
function representYamlFloat$2(object) {
  if (isNaN(object)) return ".nan";
  if (object === Number.POSITIVE_INFINITY) return ".inf";
  if (object === Number.NEGATIVE_INFINITY) return "-.inf";
  if (Object.is(object, -0)) return "-0.0";
  const result = object.toString(10);
  return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
var floatCoreTag = defineScalarTag("tag:yaml.org,2002:float", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ".",
    ..."0123456789"
  ],
  resolve: resolveYamlFloat$2,
  identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
  represent: representYamlFloat$2
});
var YAML_FLOAT_IMPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$");
var YAML_FLOAT_EXPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat$1(source, isExplicit) {
  if (isExplicit) {
    if (!YAML_FLOAT_EXPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
    let value = source.toLowerCase();
    const sign = value[0] === "-" ? -1 : 1;
    if ("+-".includes(value[0])) value = value.slice(1);
    if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    if (value === ".nan") return NaN;
    const result2 = sign * parseFloat(value);
    return Number.isFinite(result2) ? result2 : NOT_RESOLVED;
  }
  if (!YAML_FLOAT_IMPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
  const result = Number(source);
  if (Number.isFinite(result)) return result;
  return NOT_RESOLVED;
}
function representYamlFloat$1(object) {
  if (isNaN(object)) return ".nan";
  if (object === Number.POSITIVE_INFINITY) return ".inf";
  if (object === Number.NEGATIVE_INFINITY) return "-.inf";
  if (Object.is(object, -0)) return "-0.0";
  const result = object.toString(10);
  return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
var floatJsonTag = defineScalarTag("tag:yaml.org,2002:float", {
  implicit: true,
  implicitFirstChars: ["-", ..."0123456789"],
  resolve: resolveYamlFloat$1,
  identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
  represent: representYamlFloat$1
});
var YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:(?:[0-9][0-9_]*)?\\.[0-9_]*)(?:[eE][-+][0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
var YAML_FLOAT_SPECIAL_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat(source) {
  if (!YAML_FLOAT_PATTERN.test(source)) return NOT_RESOLVED;
  let value = source.toLowerCase().replace(/_/g, "");
  const sign = value[0] === "-" ? -1 : 1;
  if ("+-".includes(value[0])) value = value.slice(1);
  if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  if (value === ".nan") return NaN;
  let result = 0;
  if (value.includes(":")) {
    for (const part of value.split(":")) result = result * 60 + Number(part);
    result *= sign;
  } else result = sign * parseFloat(value);
  if (Number.isFinite(result) || YAML_FLOAT_SPECIAL_PATTERN.test(source)) return result;
  return NOT_RESOLVED;
}
function representYamlFloat(object) {
  if (isNaN(object)) return ".nan";
  if (object === Number.POSITIVE_INFINITY) return ".inf";
  if (object === Number.NEGATIVE_INFINITY) return "-.inf";
  if (Object.is(object, -0)) return "-0.0";
  const result = object.toString(10);
  return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
var floatYaml11Tag = defineScalarTag("tag:yaml.org,2002:float", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ".",
    ..."0123456789"
  ],
  resolve: resolveYamlFloat,
  identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
  represent: representYamlFloat
});
var mergeTag = defineScalarTag("tag:yaml.org,2002:merge", {
  implicit: true,
  implicitFirstChars: ["<"],
  resolve: (source, isExplicit) => {
    if (source === "<<" || isExplicit && source === "") return MERGE_KEY;
    return NOT_RESOLVED;
  }
});
var BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
function resolveYamlBinary(source) {
  const input = source.replace(/\s/g, "");
  if (input.length % 4 !== 0 || !BASE64_PATTERN.test(input)) return NOT_RESOLVED;
  const binary = atob(input);
  const result = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) result[index] = binary.charCodeAt(index);
  return result;
}
function representYamlBinary(object) {
  let binary = "";
  for (let index = 0; index < object.length; index++) binary += String.fromCharCode(object[index]);
  return btoa(binary);
}
var binaryTag = defineScalarTag("tag:yaml.org,2002:binary", {
  resolve: resolveYamlBinary,
  identify: (object) => Object.prototype.toString.call(object) === "[object Uint8Array]",
  represent: representYamlBinary
});
var YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
var YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
function resolveYamlTimestamp(source) {
  let match = YAML_DATE_REGEXP.exec(source);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(source);
  if (match === null) return NOT_RESOLVED;
  const year = +match[1];
  const month = +match[2] - 1;
  const day = +match[3];
  if (!match[4]) {
    const date2 = new Date(Date.UTC(year, month, day));
    if (date2.getUTCFullYear() !== year || date2.getUTCMonth() !== month || date2.getUTCDate() !== day) return NOT_RESOLVED;
    return date2;
  }
  const hour = +match[4];
  const minute = +match[5];
  const second = +match[6];
  let fraction = 0;
  if (hour > 23 || minute > 59 || second > 59) return NOT_RESOLVED;
  if (match[7]) {
    let value = match[7].slice(0, 3);
    while (value.length < 3) value += "0";
    fraction = +value;
  }
  const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return NOT_RESOLVED;
  if (match[9]) {
    const offsetHour = +match[10];
    const offsetMinute = +(match[11] || 0);
    if (offsetHour > 23 || offsetMinute > 59) return NOT_RESOLVED;
    const offset = (offsetHour * 60 + offsetMinute) * 6e4;
    date.setTime(date.getTime() - (match[9] === "-" ? -offset : offset));
  }
  return date;
}
var timestampTag = defineScalarTag("tag:yaml.org,2002:timestamp", {
  implicit: true,
  implicitFirstChars: [..."0123456789"],
  resolve: resolveYamlTimestamp,
  identify: (object) => object instanceof Date,
  represent: (object) => object.toISOString()
});
var seqTag = defineSequenceTag("tag:yaml.org,2002:seq", {
  create: () => [],
  addItem: (container, item) => {
    container.push(item);
  },
  identify: Array.isArray
});
function isPlainObject(data) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return false;
  const prototype = Object.getPrototypeOf(data);
  return prototype === null || prototype === Object.prototype;
}
function pick(object, keys) {
  const result = {};
  for (const key of keys) if (object[key] !== void 0) result[key] = object[key];
  return result;
}
var omapTag = defineSequenceTag("tag:yaml.org,2002:omap", {
  create: () => ({
    list: [],
    seen: /* @__PURE__ */ new Set()
  }),
  addItem: (carrier, item) => {
    let key;
    if (item instanceof Map) {
      if (item.size !== 1) return "cannot resolve an ordered map item";
      key = item.keys().next().value;
    } else if (isPlainObject(item)) {
      const itemKeys = Object.keys(item);
      if (itemKeys.length !== 1) return "cannot resolve an ordered map item";
      key = itemKeys[0];
    } else return "cannot resolve an ordered map item";
    if (carrier.seen.has(key)) return "duplicate key in ordered map";
    carrier.seen.add(key);
    carrier.list.push(item);
    return "";
  },
  finalize: (carrier) => carrier.list
});
var pairsTag = defineSequenceTag("tag:yaml.org,2002:pairs", {
  create: () => [],
  addItem: (container, item) => {
    if (item instanceof Map) {
      if (item.size !== 1) return "cannot resolve a pairs item";
      container.push(item.entries().next().value);
      return "";
    }
    if (Object.prototype.toString.call(item) !== "[object Object]") return "cannot resolve a pairs item";
    const object = item;
    const keys = Object.keys(object);
    if (keys.length !== 1) return "cannot resolve a pairs item";
    container.push([keys[0], object[keys[0]]]);
    return "";
  }
});
var mapTag = defineMappingTag("tag:yaml.org,2002:map", {
  create: () => ({}),
  identify: isPlainObject,
  represent: (o) => {
    const map = /* @__PURE__ */ new Map();
    for (const key of Object.keys(o)) map.set(key, o[key]);
    return map;
  },
  addPair: (container, key, value) => {
    if (key !== null && typeof key === "object") return "object-based map does not support complex keys";
    const normalizedKey = String(key);
    if (normalizedKey === "__proto__") Object.defineProperty(container, normalizedKey, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    else container[normalizedKey] = value;
    return "";
  },
  has: (container, key) => {
    if (key !== null && typeof key === "object") return false;
    return Object.prototype.hasOwnProperty.call(container, String(key));
  },
  keys: (container) => Object.keys(container),
  get: (container, key) => container[String(key)]
});
var setTag = defineMappingTag("tag:yaml.org,2002:set", {
  create: () => /* @__PURE__ */ new Set(),
  identify: (data) => data instanceof Set,
  represent: (data) => {
    const map = /* @__PURE__ */ new Map();
    for (const key of data) map.set(key, null);
    return map;
  },
  addPair: (container, key, value) => {
    if (value !== null) return "cannot resolve a set item";
    container.add(key);
    return "";
  },
  has: (container, key) => container.has(key),
  keys: (container) => container.keys(),
  get: () => null
});
function createTagDefinitionMap() {
  return {
    scalar: {},
    sequence: {},
    mapping: {}
  };
}
function createTagDefinitionListMap() {
  return {
    scalar: [],
    sequence: [],
    mapping: []
  };
}
function compileTags(tags) {
  const result = [];
  for (const tag of tags) {
    let index = result.length;
    for (let previousIndex = 0; previousIndex < result.length; previousIndex++) {
      const previous = result[previousIndex];
      if (previous.nodeKind === tag.nodeKind && previous.tagName === tag.tagName && previous.matchByTagPrefix === tag.matchByTagPrefix) {
        index = previousIndex;
        break;
      }
    }
    result[index] = tag;
  }
  return result;
}
var Schema = class Schema2 {
  tags;
  implicitScalarTags;
  implicitScalarByFirstChar;
  implicitScalarAnyFirstChar;
  defaultScalarTag;
  defaultSequenceTag;
  defaultMappingTag;
  exact;
  prefix;
  constructor(tags) {
    const compiledTags = compileTags(tags);
    const implicitScalarTags = [];
    const exact = createTagDefinitionMap();
    const prefix = createTagDefinitionListMap();
    for (const tag of compiledTags) {
      if (tag.nodeKind === "scalar" && tag.implicit) {
        if (tag.matchByTagPrefix) throw new Error("Implicit scalar tags cannot match by tag prefix");
        implicitScalarTags.push(tag);
      }
      switch (tag.nodeKind) {
        case "scalar":
          if (tag.matchByTagPrefix) prefix.scalar.push(tag);
          else exact.scalar[tag.tagName] = tag;
          break;
        case "sequence":
          if (tag.matchByTagPrefix) prefix.sequence.push(tag);
          else exact.sequence[tag.tagName] = tag;
          break;
        case "mapping":
          if (tag.matchByTagPrefix) prefix.mapping.push(tag);
          else exact.mapping[tag.tagName] = tag;
          break;
      }
    }
    const implicitScalarAnyFirstChar = implicitScalarTags.filter((tag) => tag.implicitFirstChars === null);
    const keys = /* @__PURE__ */ new Set();
    for (const tag of implicitScalarTags) if (tag.implicitFirstChars !== null) for (const key of tag.implicitFirstChars) keys.add(key);
    const implicitScalarByFirstChar = /* @__PURE__ */ new Map();
    for (const key of keys) implicitScalarByFirstChar.set(key, implicitScalarTags.filter((tag) => tag.implicitFirstChars === null || tag.implicitFirstChars.indexOf(key) !== -1));
    const defaultScalarTag = exact.scalar["tag:yaml.org,2002:str"];
    if (!defaultScalarTag) throw new Error("schema does not define the default scalar tag (tag:yaml.org,2002:str)");
    this.tags = compiledTags;
    this.implicitScalarTags = implicitScalarTags;
    this.implicitScalarByFirstChar = implicitScalarByFirstChar;
    this.implicitScalarAnyFirstChar = implicitScalarAnyFirstChar;
    this.defaultScalarTag = defaultScalarTag;
    this.defaultSequenceTag = exact.sequence["tag:yaml.org,2002:seq"];
    this.defaultMappingTag = exact.mapping["tag:yaml.org,2002:map"];
    this.exact = exact;
    this.prefix = prefix;
  }
  withTags(...tags) {
    let flatTags = [];
    for (const tag of tags) flatTags = flatTags.concat(tag);
    return new Schema2([...this.tags, ...flatTags]);
  }
};
var FAILSAFE_SCHEMA = new Schema([
  strTag,
  seqTag,
  mapTag
]);
var JSON_SCHEMA = new Schema([
  ...FAILSAFE_SCHEMA.tags,
  nullJsonTag,
  boolJsonTag,
  intJsonTag,
  floatJsonTag
]);
var CORE_SCHEMA = new Schema([
  ...FAILSAFE_SCHEMA.tags,
  nullCoreTag,
  boolCoreTag,
  intCoreTag,
  floatCoreTag
]);
var YAML11_SCHEMA = new Schema([
  ...FAILSAFE_SCHEMA.tags,
  nullYaml11Tag,
  boolYaml11Tag,
  intYaml11Tag,
  floatYaml11Tag,
  timestampTag,
  mergeTag,
  binaryTag,
  omapTag,
  pairsTag,
  setTag
]);
var realMapTag = defineMappingTag("tag:yaml.org,2002:map", {
  create: () => /* @__PURE__ */ new Map(),
  addPair: (container, key, value) => {
    container.set(key, value);
    return "";
  },
  has: (container, key) => container.has(key),
  keys: (container) => container.keys(),
  get: (container, key) => container.get(key),
  identify: (data) => data instanceof Map || isPlainObject(data),
  represent: (data) => {
    if (data instanceof Map) return data;
    const map = /* @__PURE__ */ new Map();
    const obj = data;
    for (const key of Object.keys(obj)) map.set(key, obj[key]);
    return map;
  }
});
function normalizeKey(key) {
  if (Array.isArray(key)) {
    const array = Array.prototype.slice.call(key);
    for (let index = 0; index < array.length; index++) {
      if (Array.isArray(array[index])) return null;
      if (typeof array[index] === "object" && Object.prototype.toString.call(array[index]) === "[object Object]") array[index] = "[object Object]";
    }
    return String(array);
  }
  if (typeof key === "object" && Object.prototype.toString.call(key) === "[object Object]") return "[object Object]";
  return String(key);
}
var legacyMapTag = defineMappingTag("tag:yaml.org,2002:map", {
  create: () => ({}),
  identify: isPlainObject,
  represent: (o) => {
    const map = /* @__PURE__ */ new Map();
    for (const key of Object.keys(o)) map.set(key, o[key]);
    return map;
  },
  addPair: (container, key, value) => {
    const normalizedKey = normalizeKey(key);
    if (normalizedKey === null) return "nested arrays are not supported inside keys";
    if (normalizedKey === "__proto__") Object.defineProperty(container, normalizedKey, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    else container[normalizedKey] = value;
    return "";
  },
  has: (container, key) => {
    const normalizedKey = normalizeKey(key);
    return normalizedKey !== null && Object.prototype.hasOwnProperty.call(container, normalizedKey);
  },
  keys: (container) => Object.keys(container),
  get: (container, key) => container[String(key)]
});
var DEFAULT_SNIPPET_OPTIONS = {
  maxLength: 79,
  indent: 1,
  linesBefore: 3,
  linesAfter: 2
};
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  let head = "";
  let tail = "";
  const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
    pos: position - lineStart + head.length
  };
}
function padStart(string, max) {
  return " ".repeat(Math.max(max - string.length, 0)) + string;
}
function makeSnippet(mark, options) {
  if (!mark.buffer) return null;
  const opts = {
    ...DEFAULT_SNIPPET_OPTIONS,
    ...options
  };
  const re = /\r?\n|\r|\0/g;
  const lineStarts = [0];
  const lineEnds = [];
  let match;
  let foundLineNo = -1;
  while (match = re.exec(mark.buffer)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
    if (mark.position <= match.index && foundLineNo < 0) foundLineNo = lineStarts.length - 2;
  }
  if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
  let result = "";
  const lineNoLength = Math.min(mark.line + opts.linesAfter, lineEnds.length).toString().length;
  const maxLineLength = opts.maxLength - (opts.indent + lineNoLength + 3);
  for (let i = 1; i <= opts.linesBefore; i++) {
    if (foundLineNo - i < 0) break;
    const line2 = getLine(mark.buffer, lineStarts[foundLineNo - i], lineEnds[foundLineNo - i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]), maxLineLength);
    result = `${" ".repeat(opts.indent)}${padStart((mark.line - i + 1).toString(), lineNoLength)} | ${line2.str}
${result}`;
  }
  const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += `${" ".repeat(opts.indent)}${padStart((mark.line + 1).toString(), lineNoLength)} | ${line.str}
`;
  result += `${"-".repeat(opts.indent + lineNoLength + 3 + line.pos)}^
`;
  for (let i = 1; i <= opts.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length) break;
    const line2 = getLine(mark.buffer, lineStarts[foundLineNo + i], lineEnds[foundLineNo + i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]), maxLineLength);
    result += `${" ".repeat(opts.indent)}${padStart((mark.line + i + 1).toString(), lineNoLength)} | ${line2.str}
`;
  }
  return result.replace(/\n$/, "");
}
function formatError(exception, compact) {
  let where = "";
  if (!exception.mark) return exception.reason;
  if (exception.mark.name) where += `in "${exception.mark.name}" `;
  where += `(${exception.mark.line + 1}:${exception.mark.column + 1})`;
  if (!compact && exception.mark.snippet) where += `

${exception.mark.snippet}`;
  return `${exception.reason} ${where}`;
}
var YAMLException = class extends Error {
  reason;
  mark;
  constructor(reason, mark) {
    super();
    this.name = "YAMLException";
    this.reason = reason;
    this.mark = mark;
    this.message = formatError(this, false);
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }
  toString(compact) {
    return `${this.name}: ${formatError(this, compact)}`;
  }
};
function throwErrorAt(source, position, message, filename = "") {
  let line = 0;
  let lineStart = 0;
  for (let index = 0; index < position; index++) {
    const ch = source.charCodeAt(index);
    if (ch === 10) {
      line++;
      lineStart = index + 1;
    } else if (ch === 13) {
      line++;
      if (source.charCodeAt(index + 1) === 10) index++;
      lineStart = index + 1;
    }
  }
  const mark = {
    name: filename,
    buffer: source,
    position,
    line,
    column: position - lineStart
  };
  mark.snippet = makeSnippet(mark);
  throw new YAMLException(message, mark);
}
var NO_RANGE$3 = -1;
function simpleEscapeSequence(c) {
  switch (c) {
    case 48:
      return "\0";
    case 97:
      return "\x07";
    case 98:
      return "\b";
    case 116:
      return "	";
    case 9:
      return "	";
    case 110:
      return "\n";
    case 118:
      return "\v";
    case 102:
      return "\f";
    case 114:
      return "\r";
    case 101:
      return "\x1B";
    case 32:
      return " ";
    case 34:
      return '"';
    case 47:
      return "/";
    case 92:
      return "\\";
    case 78:
      return "\x85";
    case 95:
      return "\xA0";
    case 76:
      return "\u2028";
    case 80:
      return "\u2029";
    default:
      return "";
  }
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (let i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
function charFromCodepoint(c) {
  if (c <= 65535) return String.fromCharCode(c);
  return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
}
function fromHexCode$1(c) {
  if (c >= 48 && c <= 57) return c - 48;
  return (c | 32) - 97 + 10;
}
function escapedHexLen$1(c) {
  if (c === 120) return 2;
  if (c === 117) return 4;
  return 8;
}
function skipFoldedBreaks(input, position, end) {
  let breaks = 0;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 10) {
      breaks++;
      position++;
    } else if (ch === 13) {
      breaks++;
      position++;
      if (input.charCodeAt(position) === 10) position++;
    } else if (ch === 32 || ch === 9) position++;
    else break;
  }
  return {
    position,
    breaks
  };
}
function foldedBreaks(count) {
  if (count === 1) return " ";
  return "\n".repeat(count - 1);
}
function getPlainValue(input, start, end) {
  let result = "";
  let position = start;
  let captureStart = start;
  let captureEnd = start;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 10 || ch === 13) {
      result += input.slice(captureStart, captureEnd);
      const fold = skipFoldedBreaks(input, position, end);
      result += foldedBreaks(fold.breaks);
      position = captureStart = captureEnd = fold.position;
    } else {
      position++;
      if (ch !== 32 && ch !== 9) captureEnd = position;
    }
  }
  return result + input.slice(captureStart, captureEnd);
}
function getSingleQuotedValue(input, start, end) {
  let result = "";
  let position = start;
  let captureStart = start;
  let captureEnd = start;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 39) {
      result += input.slice(captureStart, position) + "'";
      position += 2;
      captureStart = captureEnd = position;
    } else if (ch === 10 || ch === 13) {
      result += input.slice(captureStart, captureEnd);
      const fold = skipFoldedBreaks(input, position, end);
      result += foldedBreaks(fold.breaks);
      position = captureStart = captureEnd = fold.position;
    } else {
      position++;
      if (ch !== 32 && ch !== 9) captureEnd = position;
    }
  }
  return result + input.slice(captureStart, end);
}
function getDoubleQuotedValue(input, start, end) {
  let result = "";
  let position = start;
  let captureStart = start;
  let captureEnd = start;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 92) {
      result += input.slice(captureStart, position);
      position++;
      const escaped = input.charCodeAt(position);
      if (escaped === 10 || escaped === 13) position = skipFoldedBreaks(input, position, end).position;
      else if (escaped < 256 && simpleEscapeCheck[escaped]) {
        result += simpleEscapeMap[escaped];
        position++;
      } else {
        let hexLength = escapedHexLen$1(escaped);
        let hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          position++;
          const digit = fromHexCode$1(input.charCodeAt(position));
          hexResult = (hexResult << 4) + digit;
        }
        result += charFromCodepoint(hexResult);
        position++;
      }
      captureStart = captureEnd = position;
    } else if (ch === 10 || ch === 13) {
      result += input.slice(captureStart, captureEnd);
      const fold = skipFoldedBreaks(input, position, end);
      result += foldedBreaks(fold.breaks);
      position = captureStart = captureEnd = fold.position;
    } else {
      position++;
      if (ch !== 32 && ch !== 9) captureEnd = position;
    }
  }
  return result + input.slice(captureStart, end);
}
function getBlockValue(input, start, end, indent, chomping, folded) {
  const textIndent = indent < 0 ? 0 : indent;
  const region = input.slice(start, end).replace(/\r\n?/g, "\n");
  const lines = region === "" ? [] : (region.endsWith("\n") ? region.slice(0, -1) : region).split("\n");
  let result = "";
  let didReadContent = false;
  let emptyLines = 0;
  let atMoreIndented = false;
  for (const line of lines) {
    let column = 0;
    while (column < textIndent && line.charCodeAt(column) === 32) column++;
    if (indent < 0 || column >= line.length) {
      emptyLines++;
      continue;
    }
    const content = line.slice(textIndent);
    const first = content.charCodeAt(0);
    if (folded) if (first === 32 || first === 9) {
      atMoreIndented = true;
      result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
    } else if (atMoreIndented) {
      atMoreIndented = false;
      result += "\n".repeat(emptyLines + 1);
    } else if (emptyLines === 0) {
      if (didReadContent) result += " ";
    } else result += "\n".repeat(emptyLines);
    else result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
    result += content;
    didReadContent = true;
    emptyLines = 0;
  }
  if (chomping === 3) result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
  else if (chomping !== 2) {
    if (didReadContent) result += "\n";
  }
  return result;
}
function getScalarValue(input, scalar) {
  if (scalar.valueStart === NO_RANGE$3) return "";
  const { valueStart, valueEnd } = scalar;
  if (scalar.fast) return input.slice(valueStart, valueEnd);
  switch (scalar.style) {
    case 2:
      return getSingleQuotedValue(input, valueStart, valueEnd);
    case 3:
      return getDoubleQuotedValue(input, valueStart, valueEnd);
    case 4:
      return getBlockValue(input, valueStart, valueEnd, scalar.indent, scalar.chomping, false);
    case 5:
      return getBlockValue(input, valueStart, valueEnd, scalar.indent, scalar.chomping, true);
    default:
      return getPlainValue(input, valueStart, valueEnd);
  }
}
var DEFAULT_TAG_HANDLERS = {
  "!": "!",
  "!!": "tag:yaml.org,2002:"
};
function tagNameFull(rawTag, tagHandlers) {
  if (rawTag.startsWith("!<") && rawTag.endsWith(">")) return decodeURIComponent(rawTag.slice(2, -1));
  const handleEnd = rawTag.indexOf("!", 1);
  const handle = handleEnd === -1 ? "!" : rawTag.slice(0, handleEnd + 1);
  const prefix = tagHandlers?.[handle] ?? DEFAULT_TAG_HANDLERS[handle] ?? handle;
  return decodeURIComponent(prefix) + decodeURIComponent(rawTag.slice(handle.length));
}
var NO_RANGE$2 = -1;
var DEFAULT_CONSTRUCTOR_OPTIONS = {
  filename: "",
  schema: CORE_SCHEMA,
  json: false,
  maxTotalMergeKeys: 1e4,
  maxAliases: -1
};
function eventPosition$1(event) {
  if ("tagStart" in event && event.tagStart !== NO_RANGE$2) return event.tagStart;
  if ("anchorStart" in event && event.anchorStart !== NO_RANGE$2) return event.anchorStart;
  if ("valueStart" in event && event.valueStart !== NO_RANGE$2) return event.valueStart;
  if ("start" in event) return event.start;
  return 0;
}
function throwError$1(state, message) {
  throwErrorAt(state.source, state.position, message, state.filename);
}
function finalizeCollection(state, position, tag, carrier) {
  try {
    return tag.finalize(carrier);
  } catch (error) {
    if (error instanceof YAMLException) throw error;
    throwErrorAt(state.source, position, error instanceof Error ? error.message : String(error), state.filename);
  }
}
function lookupTag(exact, prefix, tagName) {
  const exactTag = exact[tagName];
  if (exactTag) return exactTag;
  for (const tag of prefix) if (tagName.startsWith(tag.tagName)) return tag;
}
function findExplicitTag(state, exact, prefix, tagName, nodeKind) {
  const tag = lookupTag(exact, prefix, tagName);
  if (tag) return tag;
  throwError$1(state, `unknown ${nodeKind} tag !<${tagName}>`);
}
function constructScalar(state, event) {
  const source = getScalarValue(state.source, event);
  const rawTag = event.tagStart === NO_RANGE$2 ? "" : state.source.slice(event.tagStart, event.tagEnd);
  const strTag2 = state.schema.defaultScalarTag;
  if (rawTag !== "") {
    if (rawTag === "!") return {
      value: source,
      tag: strTag2
    };
    const tagName = tagNameFull(rawTag, state.tagHandlers);
    const scalarTag = lookupTag(state.schema.exact.scalar, state.schema.prefix.scalar, tagName);
    if (scalarTag) {
      const result = scalarTag.resolve(source, true, tagName);
      if (result === NOT_RESOLVED) throwError$1(state, `cannot resolve a node with !<${tagName}> explicit tag`);
      return {
        value: result,
        tag: scalarTag
      };
    }
    const collectionTagDef = lookupTag(state.schema.exact.mapping, state.schema.prefix.mapping, tagName) ?? lookupTag(state.schema.exact.sequence, state.schema.prefix.sequence, tagName);
    if (collectionTagDef) {
      if (source !== "") throwError$1(state, `cannot resolve a node with !<${tagName}> explicit tag`);
      const carrier = collectionTagDef.create(tagName);
      return {
        value: collectionTagDef.carrierIsResult ? carrier : finalizeCollection(state, state.position, collectionTagDef, carrier),
        tag: collectionTagDef
      };
    }
    throwError$1(state, `unknown scalar tag !<${tagName}>`);
  }
  if (event.style === 1) {
    const candidates = state.schema.implicitScalarByFirstChar.get(source.charAt(0)) ?? state.schema.implicitScalarAnyFirstChar;
    for (const tag of candidates) {
      const result = tag.resolve(source, false, tag.tagName);
      if (result !== NOT_RESOLVED) return {
        value: result,
        tag
      };
    }
  }
  return {
    value: strTag2.resolve(source, false, strTag2.tagName),
    tag: strTag2
  };
}
function collectionTag(state, event, exact, prefix, defaultTagName, nodeKind) {
  const rawTag = event.tagStart === NO_RANGE$2 ? "" : state.source.slice(event.tagStart, event.tagEnd);
  const tagName = rawTag === "" || rawTag === "!" ? defaultTagName : tagNameFull(rawTag, state.tagHandlers);
  return {
    tagName,
    tag: findExplicitTag(state, exact, prefix, tagName, nodeKind)
  };
}
function isMappingTag(tag) {
  return tag.nodeKind === "mapping";
}
function mergeKeys(state, frame, source, sourceTag) {
  for (const sourceKey of sourceTag.keys(source)) {
    if (state.maxTotalMergeKeys !== -1 && ++state.totalMergeKeys > state.maxTotalMergeKeys) throwError$1(state, `merge keys exceeded maxTotalMergeKeys (${state.maxTotalMergeKeys})`);
    if (frame.tag.has(frame.value, sourceKey)) continue;
    const err = frame.tag.addPair(frame.value, sourceKey, sourceTag.get(source, sourceKey));
    if (err) throwError$1(state, err);
    (frame.overridable ??= /* @__PURE__ */ new Set()).add(sourceKey);
  }
}
function mergeSource(state, frame, source, sourceTag) {
  state.position = frame.keyPosition;
  if (isMappingTag(sourceTag)) mergeKeys(state, frame, source, sourceTag);
  else if (sourceTag.nodeKind === "sequence" && Array.isArray(source)) for (const element of source) mergeKeys(state, frame, element, frame.tag);
  else throwError$1(state, "cannot merge mappings; the provided source object is unacceptable");
}
function addMappingValue(state, frame, key, value, tag) {
  state.position = frame.keyPosition;
  if (key === MERGE_KEY) {
    mergeSource(state, frame, value, tag);
    return;
  }
  if (!state.json && frame.tag.has(frame.value, key) && !frame.overridable?.has(key)) throwError$1(state, "duplicated mapping key");
  const err = frame.tag.addPair(frame.value, key, value);
  if (err) throwError$1(state, err);
  frame.overridable?.delete(key);
}
function addValue(state, value, tag) {
  const frame = state.frames[state.frames.length - 1];
  if (frame.kind === "document") {
    frame.value = value;
    frame.hasValue = true;
  } else if (frame.kind === "sequence") {
    if (frame.merge) {
      if (!isMappingTag(tag)) throwError$1(state, "cannot merge mappings; the provided source object is unacceptable");
    }
    const err = frame.tag.addItem(frame.value, value, frame.index++);
    if (err) throwError$1(state, err);
  } else if (frame.hasKey) {
    const key = frame.key;
    frame.key = void 0;
    frame.hasKey = false;
    addMappingValue(state, frame, key, value, tag);
  } else {
    frame.key = value;
    frame.keyPosition = state.position;
    frame.hasKey = true;
  }
}
function storeAnchor(state, event, value, tag, isValueFinal) {
  if (event.anchorStart !== NO_RANGE$2) {
    const anchor = {
      value,
      tag,
      isValueFinal
    };
    state.anchors.set(state.source.slice(event.anchorStart, event.anchorEnd), anchor);
    return anchor;
  }
  return null;
}
function constructFromEvents(events, options) {
  const state = {
    ...DEFAULT_CONSTRUCTOR_OPTIONS,
    ...options,
    events,
    documents: [],
    eventIndex: 0,
    position: 0,
    frames: [],
    anchors: /* @__PURE__ */ new Map(),
    tagHandlers: /* @__PURE__ */ Object.create(null),
    totalMergeKeys: 0,
    aliasCount: 0
  };
  while (state.eventIndex < state.events.length) {
    const event = state.events[state.eventIndex++];
    state.position = eventPosition$1(event);
    switch (event.type) {
      case 1:
        state.anchors = /* @__PURE__ */ new Map();
        state.aliasCount = 0;
        state.tagHandlers = /* @__PURE__ */ Object.create(null);
        for (const directive of event.directives) if (directive.kind === "tag") state.tagHandlers[directive.handle] = directive.prefix;
        state.frames.push({
          kind: "document",
          position: state.position,
          value: void 0,
          hasValue: false
        });
        break;
      case 4: {
        const { value, tag } = constructScalar(state, event);
        storeAnchor(state, event, value, tag, true);
        addValue(state, value, tag);
        break;
      }
      case 2: {
        const definition = collectionTag(state, event, state.schema.exact.sequence, state.schema.prefix.sequence, "tag:yaml.org,2002:seq", "sequence");
        const value = definition.tag.create(definition.tagName);
        const anchor = storeAnchor(state, event, value, definition.tag, definition.tag.carrierIsResult);
        const parent = state.frames[state.frames.length - 1];
        const merge = parent !== void 0 && parent.kind === "mapping" && parent.hasKey && parent.key === MERGE_KEY;
        state.frames.push({
          kind: "sequence",
          position: state.position,
          value,
          tag: definition.tag,
          anchor,
          index: 0,
          merge
        });
        break;
      }
      case 3: {
        const definition = collectionTag(state, event, state.schema.exact.mapping, state.schema.prefix.mapping, "tag:yaml.org,2002:map", "mapping");
        const value = definition.tag.create(definition.tagName);
        const anchor = storeAnchor(state, event, value, definition.tag, definition.tag.carrierIsResult);
        state.frames.push({
          kind: "mapping",
          position: state.position,
          value,
          tag: definition.tag,
          anchor,
          key: void 0,
          keyPosition: state.position,
          hasKey: false,
          overridable: null
        });
        break;
      }
      case 5: {
        if (state.maxAliases !== -1 && ++state.aliasCount > state.maxAliases) throwError$1(state, `aliases exceeded maxAliases (${state.maxAliases})`);
        const name = state.source.slice(event.anchorStart, event.anchorEnd);
        const anchor = state.anchors.get(name);
        if (!anchor) throwError$1(state, `unidentified alias "${name}"`);
        if (!anchor.isValueFinal) throwError$1(state, `recursive alias "${name}" is not supported for tag ${anchor.tag.tagName} because it uses finalize()`);
        addValue(state, anchor.value, anchor.tag);
        break;
      }
      case 6: {
        const frame = state.frames.pop();
        if (frame.kind === "document") state.documents.push(frame.value);
        else {
          const value = frame.tag.carrierIsResult ? frame.value : finalizeCollection(state, frame.position, frame.tag, frame.value);
          if (frame.anchor) {
            frame.anchor.value = value;
            frame.anchor.isValueFinal = true;
          }
          addValue(state, value, frame.tag);
        }
        break;
      }
    }
  }
  return state.documents;
}
var NO_RANGE$1 = -1;
var HAS_OWN = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
var NS_URI_CHAR = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$,_.!~*'()\[\]])`;
var NS_TAG_CHAR = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$.~*'()_])`;
var PATTERN_TAG_URI = new RegExp(`^(?:${NS_URI_CHAR})*$`);
var PATTERN_TAG_SUFFIX = new RegExp(`^(?:${NS_TAG_CHAR})+$`);
var PATTERN_TAG_PREFIX = new RegExp(`^(?:!(?:${NS_URI_CHAR})*|${NS_TAG_CHAR}(?:${NS_URI_CHAR})*)$`);
var DEFAULT_PARSER_OPTIONS = {
  filename: "",
  maxDepth: 100
};
function addDocumentEvent(state, explicitStart, explicitEnd) {
  state.events.push({
    type: 1,
    explicitStart,
    explicitEnd,
    directives: state.directives
  });
}
function addSequenceEvent(state, start, anchorStart, anchorEnd, tagStart, tagEnd, style) {
  state.events.push({
    type: 2,
    start,
    anchorStart,
    anchorEnd,
    tagStart,
    tagEnd,
    style
  });
}
function addMappingEvent(state, start, anchorStart, anchorEnd, tagStart, tagEnd, style) {
  state.events.push({
    type: 3,
    start,
    anchorStart,
    anchorEnd,
    tagStart,
    tagEnd,
    style
  });
}
function addScalarEvent(state, valueStart, valueEnd, anchorStart, anchorEnd, tagStart, tagEnd, style, chomping = 1, indent = -1, fast = false) {
  state.events.push({
    type: 4,
    valueStart,
    valueEnd,
    anchorStart,
    anchorEnd,
    tagStart,
    tagEnd,
    style,
    chomping,
    indent,
    fast
  });
}
function addAliasEvent(state, anchorStart, anchorEnd) {
  state.events.push({
    type: 5,
    anchorStart,
    anchorEnd
  });
}
function addPopEvent(state) {
  state.events.push({ type: 6 });
}
function addEmptyScalarEvent(state) {
  addScalarEvent(state, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, 1);
}
function emptyProperties() {
  return {
    anchorStart: NO_RANGE$1,
    anchorEnd: NO_RANGE$1,
    tagStart: NO_RANGE$1,
    tagEnd: NO_RANGE$1
  };
}
function snapshotState(state) {
  return {
    position: state.position,
    line: state.line,
    lineStart: state.lineStart,
    lineIndent: state.lineIndent,
    firstTabInLine: state.firstTabInLine,
    eventsLength: state.events.length
  };
}
function restoreState(state, snapshot) {
  state.position = snapshot.position;
  state.line = snapshot.line;
  state.lineStart = snapshot.lineStart;
  state.lineIndent = snapshot.lineIndent;
  state.firstTabInLine = snapshot.firstTabInLine;
  state.events.length = snapshot.eventsLength;
}
function throwError(state, message) {
  throwErrorAt(state.input.slice(0, state.length), state.position, message, state.filename);
}
function isEol(c) {
  return c === 10 || c === 13;
}
function isWhiteSpace(c) {
  return c === 9 || c === 32;
}
function isWsOrEol(c) {
  return isWhiteSpace(c) || isEol(c);
}
function isWsOrEolOrEnd(c) {
  return c === 0 || isWsOrEol(c);
}
function isFlowIndicator(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromDecimalCode(c) {
  return c >= 48 && c <= 57 ? c - 48 : -1;
}
function fromHexCode(c) {
  if (c >= 48 && c <= 57) return c - 48;
  const lc = c | 32;
  if (lc >= 97 && lc <= 102) return lc - 97 + 10;
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) return 2;
  if (c === 117) return 4;
  if (c === 85) return 8;
  return 0;
}
function isSimpleEscape(c) {
  return c === 48 || c === 97 || c === 98 || c === 116 || c === 9 || c === 110 || c === 118 || c === 102 || c === 114 || c === 101 || c === 32 || c === 34 || c === 47 || c === 92 || c === 78 || c === 95 || c === 76 || c === 80;
}
function consumeLineBreak(state) {
  if (state.input.charCodeAt(state.position) === 10) state.position++;
  else {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) state.position++;
  }
  state.line++;
  state.lineStart = state.position;
  state.lineIndent = 0;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments) {
  let lineBreaks = 0;
  let ch = state.input.charCodeAt(state.position);
  let hasSeparation = state.position === state.lineStart || isWsOrEol(state.input.charCodeAt(state.position - 1));
  while (ch !== 0) {
    while (isWhiteSpace(ch)) {
      hasSeparation = true;
      if (ch === 9 && state.firstTabInLine === -1) state.firstTabInLine = state.position;
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && hasSeparation && ch === 35) do
      ch = state.input.charCodeAt(++state.position);
    while (!isEol(ch) && ch !== 0);
    if (!isEol(ch)) break;
    consumeLineBreak(state);
    lineBreaks++;
    hasSeparation = true;
    ch = state.input.charCodeAt(state.position);
    while (ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
  }
  return lineBreaks;
}
function testDocumentSeparator(state, position = state.position) {
  const ch = state.input.charCodeAt(position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(position + 1) && ch === state.input.charCodeAt(position + 2)) {
    const following = state.input.charCodeAt(position + 3);
    return following === 0 || isWsOrEol(following);
  }
  return false;
}
function skipUntilLineEnd(state) {
  let ch = state.input.charCodeAt(state.position);
  while (ch !== 0 && !isEol(ch)) ch = state.input.charCodeAt(++state.position);
}
function checkPrintable(state, start, end) {
  if (PATTERN_NON_PRINTABLE.test(state.input.slice(start, end))) throwError(state, "the stream contains non-printable characters");
}
function readTagProperty(state, props, inFlow) {
  if (state.input.charCodeAt(state.position) !== 33) return false;
  if (props.tagStart !== NO_RANGE$1) throwError(state, "duplication of a tag property");
  const start = state.position;
  let isVerbatim = false;
  let isNamed = false;
  let tagHandle = "!";
  let ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  }
  let suffixStart = state.position;
  let tagName;
  if (isVerbatim) {
    while (ch !== 0 && ch !== 62) ch = state.input.charCodeAt(++state.position);
    if (ch !== 62) throwError(state, "unexpected end of the stream within a verbatim tag");
    tagName = state.input.slice(suffixStart, state.position);
    state.position++;
  } else {
    while (ch !== 0 && !isWsOrEol(ch) && !(inFlow && isFlowIndicator(ch))) {
      if (ch === 33) if (!isNamed) {
        tagHandle = state.input.slice(suffixStart - 1, state.position + 1);
        if (!PATTERN_TAG_HANDLE.test(tagHandle)) throwError(state, "named tag handle cannot contain such characters");
        isNamed = true;
        suffixStart = state.position + 1;
      } else throwError(state, "tag suffix cannot contain exclamation marks");
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(suffixStart, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) throwError(state, "tag suffix cannot contain flow indicator characters");
  }
  if (tagName && !(isVerbatim ? PATTERN_TAG_URI.test(tagName) : PATTERN_TAG_SUFFIX.test(tagName))) throwError(state, `tag name cannot contain such characters: ${tagName}`);
  if (!isVerbatim && tagHandle !== "!" && tagHandle !== "!!" && !HAS_OWN.call(state.tagHandlers, tagHandle)) throwError(state, `undeclared tag handle "${tagHandle}"`);
  props.tagStart = start;
  props.tagEnd = state.position;
  return true;
}
function readAnchorProperty(state, props) {
  if (state.input.charCodeAt(state.position) !== 38) return false;
  if (props.anchorStart !== NO_RANGE$1) throwError(state, "duplication of an anchor property");
  state.position++;
  const start = state.position;
  while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position)) && !isFlowIndicator(state.input.charCodeAt(state.position))) state.position++;
  if (state.position === start) throwError(state, "name of an anchor node must contain at least one character");
  props.anchorStart = start;
  props.anchorEnd = state.position;
  return true;
}
function readAlias(state, props) {
  if (state.input.charCodeAt(state.position) !== 42) return false;
  if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) throwError(state, "alias node should not have any properties");
  state.position++;
  const start = state.position;
  while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position)) && !isFlowIndicator(state.input.charCodeAt(state.position))) state.position++;
  if (state.position === start) throwError(state, "name of an alias node must contain at least one character");
  addAliasEvent(state, start, state.position);
  return true;
}
function readFlowScalarBreak(state, nodeIndent) {
  skipSeparationSpace(state, false);
  if (state.lineIndent < nodeIndent) throwError(state, "deficient indentation");
}
function readSingleQuotedScalar(state, nodeIndent, props) {
  if (state.input.charCodeAt(state.position) !== 39) return false;
  state.position++;
  const start = state.position;
  let simple = true;
  while (state.input.charCodeAt(state.position) !== 0) {
    const ch = state.input.charCodeAt(state.position);
    if (ch === 39) {
      if (state.input.charCodeAt(state.position + 1) === 39) {
        simple = false;
        state.position += 2;
        continue;
      }
      const end = state.position;
      state.position++;
      addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, 2, 1, -1, simple);
      return true;
    }
    if (isEol(ch)) {
      simple = false;
      readFlowScalarBreak(state, nodeIndent);
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a single quoted scalar");
    else if (ch !== 9 && ch < 32) throwError(state, "expected valid JSON character");
    else state.position++;
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent, props) {
  if (state.input.charCodeAt(state.position) !== 34) return false;
  state.position++;
  const start = state.position;
  let simple = true;
  while (state.input.charCodeAt(state.position) !== 0) {
    const ch = state.input.charCodeAt(state.position);
    if (ch === 34) {
      const end = state.position;
      state.position++;
      addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, 3, 1, -1, simple);
      return true;
    }
    if (ch === 92) {
      simple = false;
      const escaped = state.input.charCodeAt(++state.position);
      if (isEol(escaped)) readFlowScalarBreak(state, nodeIndent);
      else if (isSimpleEscape(escaped)) state.position++;
      else {
        let hexLength = escapedHexLen(escaped);
        if (hexLength === 0) throwError(state, "unknown escape sequence");
        while (hexLength-- > 0) {
          state.position++;
          if (fromHexCode(state.input.charCodeAt(state.position)) < 0) throwError(state, "expected hexadecimal character");
        }
        state.position++;
      }
    } else if (isEol(ch)) {
      simple = false;
      readFlowScalarBreak(state, nodeIndent);
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a double quoted scalar");
    else if (ch !== 9 && ch < 32) throwError(state, "expected valid JSON character");
    else state.position++;
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readBlockScalar(state, parentIndent, props) {
  const ch = state.input.charCodeAt(state.position);
  let chomping = 1;
  let indent = -1;
  let detectedIndent = false;
  if (ch !== 124 && ch !== 62) return false;
  const style = ch === 124 ? 4 : 5;
  state.position++;
  while (state.input.charCodeAt(state.position) !== 0) {
    const current = state.input.charCodeAt(state.position);
    const digit = fromDecimalCode(current);
    if (current === 43 || current === 45) {
      if (chomping !== 1) throwError(state, "repeat of a chomping mode identifier");
      chomping = current === 43 ? 3 : 2;
      state.position++;
    } else if (digit >= 0) {
      if (digit === 0) throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      if (detectedIndent) throwError(state, "repeat of an indentation width identifier");
      indent = parentIndent + digit - 1;
      detectedIndent = true;
      state.position++;
    } else break;
  }
  let hadWhitespace = false;
  while (isWhiteSpace(state.input.charCodeAt(state.position))) {
    hadWhitespace = true;
    state.position++;
  }
  if (hadWhitespace && state.input.charCodeAt(state.position) === 35) skipUntilLineEnd(state);
  if (isEol(state.input.charCodeAt(state.position))) consumeLineBreak(state);
  else if (state.input.charCodeAt(state.position) !== 0) throwError(state, "a line break is expected");
  let contentIndent = detectedIndent ? indent : -1;
  let maxLeadingIndent = 0;
  const valueStart = state.position;
  let valueEnd = state.position;
  while (state.input.charCodeAt(state.position) !== 0) {
    const linePosition = state.position;
    let column = 0;
    while (state.input.charCodeAt(linePosition + column) === 32) column++;
    const first = state.input.charCodeAt(linePosition + column);
    if (first === 0) {
      if (contentIndent >= 0) {
        if (column > contentIndent) valueEnd = linePosition + column;
      } else if (column > 0) valueEnd = linePosition + column;
      break;
    }
    if (linePosition === state.lineStart && testDocumentSeparator(state, linePosition)) break;
    if (!detectedIndent && contentIndent === -1 && isEol(first)) maxLeadingIndent = Math.max(maxLeadingIndent, column);
    if (!detectedIndent && contentIndent === -1 && !isEol(first)) {
      if (first === 9 && column < parentIndent) {
        state.position = linePosition + column;
        throwError(state, "tab characters must not be used in indentation");
      }
      if (column < maxLeadingIndent) {
        state.position = linePosition + column;
        throwError(state, "bad indentation of a mapping entry");
      }
    }
    if (contentIndent === -1 && first !== 0 && !isEol(first) && column < parentIndent) {
      state.lineIndent = column;
      state.position = linePosition + column;
      break;
    }
    if (!detectedIndent && first !== 0 && !isEol(first) && contentIndent === -1) contentIndent = column;
    const requiredIndent = contentIndent === -1 ? parentIndent + 1 : contentIndent;
    if (first !== 0 && !isEol(first) && column < requiredIndent) {
      state.lineIndent = column;
      state.position = linePosition + column;
      break;
    }
    skipUntilLineEnd(state);
    valueEnd = state.position;
    if (isEol(state.input.charCodeAt(state.position))) {
      consumeLineBreak(state);
      valueEnd = state.position;
    }
  }
  checkPrintable(state, valueStart, valueEnd);
  addScalarEvent(state, valueStart, valueEnd, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, style, chomping, contentIndent);
  return true;
}
function canStartPlainScalar(state, nodeContext) {
  const ch = state.input.charCodeAt(state.position);
  const inFlow = nodeContext === CONTEXT_FLOW_IN;
  if (ch === 0 || isWsOrEol(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96 || inFlow && isFlowIndicator(ch)) return false;
  if (ch === 63 || ch === 45) {
    const following = state.input.charCodeAt(state.position + 1);
    if (isWsOrEolOrEnd(following) || inFlow && isFlowIndicator(following)) return false;
  }
  return true;
}
function readPlainScalar(state, nodeIndent, nodeContext, props) {
  if (!canStartPlainScalar(state, nodeContext)) return false;
  const start = state.position;
  let end = state.position;
  let ch = state.input.charCodeAt(state.position);
  const inFlow = nodeContext === CONTEXT_FLOW_IN;
  let multiline = false;
  while (ch !== 0) {
    if (state.position === state.lineStart && testDocumentSeparator(state)) break;
    if (ch === 58) {
      const following = state.input.charCodeAt(state.position + 1);
      if (isWsOrEolOrEnd(following) || inFlow && isFlowIndicator(following)) break;
    } else if (ch === 35) {
      if (isWsOrEol(state.input.charCodeAt(state.position - 1))) break;
    } else if (inFlow && isFlowIndicator(ch)) break;
    else if (isEol(ch)) {
      const savedPosition = state.position;
      const savedLine = state.line;
      const savedLineStart = state.lineStart;
      const savedLineIndent = state.lineIndent;
      skipSeparationSpace(state, false);
      if (state.lineIndent >= nodeIndent) {
        multiline = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      }
      state.position = savedPosition;
      state.line = savedLine;
      state.lineStart = savedLineStart;
      state.lineIndent = savedLineIndent;
      break;
    }
    if (!isWhiteSpace(ch)) end = state.position + 1;
    ch = state.input.charCodeAt(++state.position);
  }
  if (end === start) return false;
  checkPrintable(state, start, end);
  addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, 1, 1, -1, !multiline);
  return true;
}
function skipFlowSeparationSpace(state, nodeIndent) {
  const startLine = state.line;
  skipSeparationSpace(state, true);
  if (state.line > startLine && state.lineIndent < nodeIndent || state.firstTabInLine !== -1 && state.lineIndent < nodeIndent) throwError(state, "deficient indentation");
}
function readFlowCollection(state, nodeIndent, props) {
  const ch = state.input.charCodeAt(state.position);
  const isMapping = ch === 123;
  const start = state.position;
  let readNext = true;
  if (ch !== 91 && ch !== 123) return false;
  const terminator = isMapping ? 125 : 93;
  if (isMapping) addMappingEvent(state, start, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, 2);
  else addSequenceEvent(state, start, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, 2);
  state.position++;
  while (state.input.charCodeAt(state.position) !== 0) {
    skipFlowSeparationSpace(state, nodeIndent);
    let ch2 = state.input.charCodeAt(state.position);
    if (ch2 === terminator) {
      state.position++;
      addPopEvent(state);
      return true;
    } else if (!readNext) throwError(state, "missed comma between flow collection entries");
    else if (ch2 === 44) throwError(state, "expected the node content, but found ','");
    let isPair = false;
    let isExplicitPair = false;
    if (ch2 === 63 && isWsOrEol(state.input.charCodeAt(state.position + 1))) {
      isPair = isExplicitPair = true;
      state.position += 1;
      skipFlowSeparationSpace(state, nodeIndent);
    }
    const entryLine = state.line;
    const entryStart = snapshotState(state);
    const keyWasRead = parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    skipFlowSeparationSpace(state, nodeIndent);
    ch2 = state.input.charCodeAt(state.position);
    if ((isMapping || isExplicitPair || state.line === entryLine) && ch2 === 58) {
      isPair = true;
      state.position++;
      skipFlowSeparationSpace(state, nodeIndent);
      if (!isMapping) {
        restoreState(state, entryStart);
        addMappingEvent(state, entryStart.position, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, 2);
        if (!parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true)) addEmptyScalarEvent(state);
        skipFlowSeparationSpace(state, nodeIndent);
        state.position++;
        skipFlowSeparationSpace(state, nodeIndent);
      } else if (!keyWasRead) addEmptyScalarEvent(state);
      if (!parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true)) addEmptyScalarEvent(state);
      skipFlowSeparationSpace(state, nodeIndent);
      if (!isMapping) addPopEvent(state);
    } else if (isMapping && isPair) {
      if (!keyWasRead) addEmptyScalarEvent(state);
      addEmptyScalarEvent(state);
    } else if (isMapping) addEmptyScalarEvent(state);
    else if (isPair) {
      restoreState(state, entryStart);
      addMappingEvent(state, entryStart.position, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, 2);
      parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      addEmptyScalarEvent(state);
      addPopEvent(state);
    }
    ch2 = state.input.charCodeAt(state.position);
    if (ch2 === 44) {
      readNext = true;
      state.position++;
    } else readNext = false;
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockSequence(state, nodeIndent, props) {
  if (state.firstTabInLine !== -1 || state.input.charCodeAt(state.position) !== 45 || !isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) return false;
  addSequenceEvent(state, state.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, 1);
  while (state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    const entryLine = state.line;
    state.position++;
    const hadBreak = skipSeparationSpace(state, true) > 0;
    if (state.firstTabInLine !== -1 && state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) throwError(state, "bad indentation of a sequence entry");
    if (hadBreak && state.lineIndent <= nodeIndent) addEmptyScalarEvent(state);
    else parseNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    skipSeparationSpace(state, true);
    if (state.lineIndent < nodeIndent || state.position >= state.length) break;
    if (state.lineIndent > nodeIndent) throwError(state, "bad indentation of a sequence entry");
    if (state.line === entryLine && state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) throwError(state, "bad indentation of a sequence entry");
  }
  addPopEvent(state);
  return true;
}
function readBlockMapping(state, nodeIndent, flowIndent, props) {
  let atExplicitKey = false;
  let detected = false;
  let mappingOpened = false;
  let pendingExplicitKey = false;
  if (state.firstTabInLine !== -1) return false;
  let ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    const following = state.input.charCodeAt(state.position + 1);
    const entryLine = state.line;
    if ((ch === 63 || ch === 58) && isWsOrEolOrEnd(following)) {
      if (!mappingOpened) {
        addMappingEvent(state, state.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, 1);
        mappingOpened = true;
      }
      if (ch === 63) {
        if (atExplicitKey) addEmptyScalarEvent(state);
        detected = true;
        atExplicitKey = true;
      } else if (atExplicitKey) atExplicitKey = false;
      else {
        addEmptyScalarEvent(state);
        detected = true;
        atExplicitKey = false;
      }
      state.position += 1;
      pendingExplicitKey = true;
    } else {
      if (atExplicitKey) {
        addEmptyScalarEvent(state);
        atExplicitKey = false;
      }
      const beforeKey = snapshotState(state);
      if (!parseNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) break;
      if (state.line === entryLine) {
        ch = state.input.charCodeAt(state.position);
        while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!isWsOrEolOrEnd(ch)) throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          if (!mappingOpened) {
            restoreState(state, beforeKey);
            addMappingEvent(state, beforeKey.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, 1);
            mappingOpened = true;
            parseNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true);
            ch = state.input.charCodeAt(state.position);
            while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
            state.position++;
          }
          detected = true;
          atExplicitKey = false;
          pendingExplicitKey = false;
        } else if (detected) throwError(state, "expected ':' after a mapping key");
        else {
          if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) {
            restoreState(state, beforeKey);
            return false;
          }
          return true;
        }
      } else if (detected) throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      else {
        if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) {
          restoreState(state, beforeKey);
          return false;
        }
        return true;
      }
    }
    if (parseNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, pendingExplicitKey)) pendingExplicitKey = false;
    if (!atExplicitKey) {
      if (pendingExplicitKey) {
        addEmptyScalarEvent(state);
        pendingExplicitKey = false;
      }
    }
    skipSeparationSpace(state, true);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === entryLine || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a mapping entry");
    else if (state.lineIndent < nodeIndent) break;
  }
  if (!detected) return false;
  if (atExplicitKey) addEmptyScalarEvent(state);
  if (mappingOpened) addPopEvent(state);
  return true;
}
function parseNode(state, parentIndent, nodeContext, allowToSeek, allowCompact, allowPropertyMapping = true) {
  if (state.depth >= state.maxDepth) throwError(state, `nesting exceeded maxDepth (${state.maxDepth})`);
  state.depth++;
  let indentStatus = 1;
  let atNewLine = false;
  let hasContent = false;
  let propertyStart = null;
  const props = emptyProperties();
  let allowBlockScalars = nodeContext === CONTEXT_BLOCK_OUT || nodeContext === CONTEXT_BLOCK_IN;
  let allowBlockCollections = allowBlockScalars;
  const allowBlockStyles = allowBlockScalars;
  if (allowToSeek && skipSeparationSpace(state, true)) {
    atNewLine = true;
    if (state.lineIndent > parentIndent) indentStatus = 1;
    else if (state.lineIndent === parentIndent) indentStatus = 0;
    else indentStatus = -1;
  }
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    state.depth--;
    return false;
  }
  if (indentStatus === 1) while (true) {
    const ch = state.input.charCodeAt(state.position);
    const propertyState = snapshotState(state);
    if (atNewLine && indentStatus !== 1 && (ch === 33 || ch === 38)) break;
    if (atNewLine && allowBlockStyles && (props.tagStart !== NO_RANGE$1 || props.anchorStart !== NO_RANGE$1) && (ch === 33 || ch === 38)) {
      const fallbackState = snapshotState(state);
      const flowIndent = parentIndent + 1;
      if (readBlockMapping(state, state.position - state.lineStart, flowIndent, props) && state.events[fallbackState.eventsLength]?.type === 3) {
        state.depth--;
        return true;
      }
      restoreState(state, fallbackState);
    }
    if (atNewLine && (ch === 33 && props.tagStart !== NO_RANGE$1 || ch === 38 && props.anchorStart !== NO_RANGE$1)) break;
    if (!readTagProperty(state, props, nodeContext === CONTEXT_FLOW_IN) && !readAnchorProperty(state, props)) break;
    if (propertyStart === null) propertyStart = propertyState;
    if (skipSeparationSpace(state, true)) {
      atNewLine = true;
      allowBlockCollections = allowBlockStyles;
      if (state.lineIndent > parentIndent) indentStatus = 1;
      else if (state.lineIndent === parentIndent) indentStatus = 0;
      else indentStatus = -1;
    } else allowBlockCollections = false;
  }
  if (allowBlockCollections) allowBlockCollections = atNewLine || allowCompact;
  if (indentStatus === 1 || nodeContext === CONTEXT_BLOCK_OUT) {
    const flowIndent = nodeContext === CONTEXT_FLOW_IN || nodeContext === CONTEXT_FLOW_OUT ? parentIndent : parentIndent + 1;
    const blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) if (allowBlockCollections && (readBlockSequence(state, blockIndent, props) || readBlockMapping(state, blockIndent, flowIndent, props)) || readFlowCollection(state, flowIndent, props)) hasContent = true;
    else {
      const ch = state.input.charCodeAt(state.position);
      if (propertyStart !== null && allowPropertyMapping && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62) {
        const fallbackState = snapshotState(state);
        const propertyIndent = propertyStart.position - propertyStart.lineStart;
        restoreState(state, propertyStart);
        if (readBlockMapping(state, propertyIndent, flowIndent, emptyProperties()) && state.events[fallbackState.eventsLength]?.type === 3) hasContent = true;
        else restoreState(state, fallbackState);
      }
      if (!hasContent && (allowBlockScalars && readBlockScalar(state, flowIndent, props) || readSingleQuotedScalar(state, flowIndent, props) || readDoubleQuotedScalar(state, flowIndent, props) || readAlias(state, props) || readPlainScalar(state, flowIndent, nodeContext, props))) hasContent = true;
    }
    else if (indentStatus === 0) hasContent = allowBlockCollections && readBlockSequence(state, blockIndent, props);
  }
  allowBlockScalars = allowBlockScalars && !hasContent;
  if (!hasContent && (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1 || allowBlockScalars)) {
    addScalarEvent(state, NO_RANGE$1, NO_RANGE$1, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, 1);
    hasContent = true;
  }
  state.depth--;
  return hasContent || props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1;
}
function readDirective(state) {
  if (state.lineIndent > 0 || state.input.charCodeAt(state.position) !== 37) return false;
  state.position++;
  const nameStart = state.position;
  while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position))) state.position++;
  const name = state.input.slice(nameStart, state.position);
  const args = [];
  if (name.length === 0) throwError(state, "directive name must not be less than one character in length");
  while (state.input.charCodeAt(state.position) !== 0 && !isEol(state.input.charCodeAt(state.position))) {
    while (isWhiteSpace(state.input.charCodeAt(state.position))) state.position++;
    if (state.input.charCodeAt(state.position) === 35 || isEol(state.input.charCodeAt(state.position)) || state.input.charCodeAt(state.position) === 0) break;
    const start = state.position;
    while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position))) state.position++;
    args.push(state.input.slice(start, state.position));
  }
  if (isEol(state.input.charCodeAt(state.position))) consumeLineBreak(state);
  if (name === "YAML") {
    if (state.directives.some((directive) => directive.kind === "yaml")) throwError(state, "duplication of %YAML directive");
    if (args.length !== 1) throwError(state, "YAML directive accepts exactly one argument");
    const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) throwError(state, "ill-formed argument of the YAML directive");
    if (parseInt(match[1], 10) !== 1) throwError(state, "unacceptable YAML version of the document");
    state.directives.push({
      kind: "yaml",
      version: args[0]
    });
  } else if (name === "TAG") {
    if (args.length !== 2) throwError(state, "TAG directive accepts exactly two arguments");
    const [handle, prefix] = args;
    if (!PATTERN_TAG_HANDLE.test(handle)) throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    if (HAS_OWN.call(state.tagHandlers, handle)) throwError(state, `there is a previously declared suffix for "${handle}" tag handle`);
    if (!PATTERN_TAG_PREFIX.test(prefix)) throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    state.tagHandlers[handle] = prefix;
    state.directives.push({
      kind: "tag",
      handle,
      prefix
    });
  }
  return true;
}
function readDocument(state) {
  state.directives = [];
  state.tagHandlers = /* @__PURE__ */ Object.create(null);
  let hasDirectives = false;
  skipSeparationSpace(state, true);
  while (readDirective(state)) {
    hasDirectives = true;
    skipSeparationSpace(state, true);
  }
  let explicitStart = false;
  let explicitEnd = false;
  let allowCompact = true;
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 3))) {
    explicitStart = true;
    const markerLine = state.line;
    state.position += 3;
    skipSeparationSpace(state, true);
    allowCompact = state.line > markerLine;
  } else if (hasDirectives) throwError(state, "directives end mark is expected");
  const documentEventIndex = state.events.length;
  if (!explicitStart && state.position === state.lineStart && state.input.charCodeAt(state.position) === 46 && testDocumentSeparator(state)) {
    state.position += 3;
    skipSeparationSpace(state, true);
    return;
  }
  addDocumentEvent(state, explicitStart, false);
  if (!parseNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, allowCompact, allowCompact)) addEmptyScalarEvent(state);
  skipSeparationSpace(state, true);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    explicitEnd = state.input.charCodeAt(state.position) === 46;
    if (explicitEnd) {
      const markerLine = state.line;
      state.position += 3;
      skipSeparationSpace(state, true);
      if (state.line === markerLine && state.position < state.length) throwError(state, "end of the stream or a document separator is expected");
    }
  }
  const documentEvent = state.events[documentEventIndex];
  if (documentEvent?.type === 1) documentEvent.explicitEnd = explicitEnd;
  addPopEvent(state);
  if (!explicitEnd && state.position < state.length && !(state.position === state.lineStart && testDocumentSeparator(state))) throwError(state, "end of the stream or a document separator is expected");
}
function parseEvents(input, options) {
  const length = input.length;
  const state = {
    ...DEFAULT_PARSER_OPTIONS,
    ...options,
    input: `${input}\0`,
    length,
    position: 0,
    line: 0,
    lineStart: 0,
    lineIndent: 0,
    firstTabInLine: -1,
    depth: 0,
    directives: [],
    tagHandlers: /* @__PURE__ */ Object.create(null),
    events: []
  };
  const nullpos = input.indexOf("\0");
  if (nullpos !== -1) throwErrorAt(input, nullpos, "null byte is not allowed in input", state.filename);
  if (state.input.charCodeAt(state.position) === 65279) state.position++;
  while (state.position < state.length) {
    skipSeparationSpace(state, true);
    if (state.position >= state.length) break;
    const documentStart = state.position;
    readDocument(state);
    if (state.position === documentStart)
      throwError(state, "can not read a document");
  }
  return state.events;
}
var DEFAULT_LOAD_OPTIONS = {
  ...DEFAULT_PARSER_OPTIONS,
  ...DEFAULT_CONSTRUCTOR_OPTIONS
};
function loadDocuments(input, options = {}) {
  const opts = {
    ...DEFAULT_LOAD_OPTIONS,
    ...options
  };
  const source = String(input);
  const PARSER_OPT_KEYS = Object.keys(DEFAULT_PARSER_OPTIONS);
  const CONSTRUCTOR_OPT_KEYS = Object.keys(DEFAULT_CONSTRUCTOR_OPTIONS);
  return constructFromEvents(parseEvents(source, pick(opts, PARSER_OPT_KEYS)), {
    ...pick(opts, CONSTRUCTOR_OPT_KEYS),
    source
  });
}
function load(input, options) {
  const documents = loadDocuments(input, options);
  if (documents.length === 0) throw new YAMLException("expected a document, but the input is empty");
  if (documents.length === 1) return documents[0];
  throw new YAMLException("expected a single document in the stream, but found more");
}
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEFAULT_PRESENTER_OPTIONS = {
  indent: 2,
  seqNoIndent: false,
  seqInlineFirst: true,
  sortKeys: false,
  lineWidth: 80,
  flowBracketPadding: false,
  flowSkipCommaSpace: false,
  flowSkipColonSpace: false,
  quoteFlowKeys: false,
  quoteStyle: "single",
  forceQuotes: false,
  tagBeforeAnchor: false
};
var DEFAULT_DUMP_SCHEMA = YAML11_SCHEMA.withTags({
  ...intYaml11Tag,
  resolve: (source, isExplicit, tagName) => {
    const result = intYaml11Tag.resolve(source, isExplicit, tagName);
    return result === NOT_RESOLVED ? intCoreTag.resolve(source, isExplicit, tagName) : result;
  }
}, {
  ...floatYaml11Tag,
  resolve: (source, isExplicit, tagName) => {
    const result = floatYaml11Tag.resolve(source, isExplicit, tagName);
    return result === NOT_RESOLVED ? floatCoreTag.resolve(source, isExplicit, tagName) : result;
  }
});
var DEFAULT_DUMP_OPTIONS = {
  ...DEFAULT_PRESENTER_OPTIONS,
  schema: DEFAULT_DUMP_SCHEMA,
  skipInvalid: false,
  noRefs: false,
  flowLevel: -1,
  transform: () => {
  }
};

// src/skill-scripts/shared/execution-routing.ts
var path4 = __toESM(require("path"));
var WORKSPACE_CONFIG_RELPATH = path4.join("config", "config.yaml");

// src/skill-scripts/shared/harness-configuration.ts
var HARNESS_CONFIGURATION_SECTION = "harnesses";
var HARNESS_CONFIGURATION_NORMALIZATION_VERSION = 1;
var isPlainObject2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var hashHarnessCliArgs = (harness, cliArgs, normalizationVersion = HARNESS_CONFIGURATION_NORMALIZATION_VERSION) => (0, import_crypto.createHash)("sha256").update(
  JSON.stringify({
    schema: normalizationVersion,
    harness,
    cliArgs
  }),
  "utf8"
).digest("hex");
var normalizeInvocation = (harness, cliArgs) => {
  const immutableArgs = Object.freeze([...cliArgs]);
  return Object.freeze({
    cliArgs: immutableArgs,
    cliArgsHash: hashHarnessCliArgs(harness, immutableArgs)
  });
};
var emptyConfiguration = () => Object.freeze(
  Object.fromEntries(
    SUPPORTED_HARNESSES.map((harness) => [harness, normalizeInvocation(harness, [])])
  )
);
var validateHarnessEntry = (harness, raw, errors) => {
  const entryPath = `config.yaml ${HARNESS_CONFIGURATION_SECTION}.${harness}`;
  if (!isPlainObject2(raw)) {
    errors.push(`${entryPath} must be a mapping.`);
    return null;
  }
  for (const key of Object.keys(raw)) {
    if (key !== "cli_args") errors.push(`${entryPath}.${key} is not supported.`);
  }
  if (!("cli_args" in raw)) return normalizeInvocation(harness, []);
  if (!Array.isArray(raw.cli_args)) {
    errors.push(`${entryPath}.cli_args must be an array of exact strings.`);
    return null;
  }
  const cliArgs = [];
  raw.cli_args.forEach((value, index) => {
    const valuePath = `${entryPath}.cli_args[${index}]`;
    if (typeof value !== "string" || value.length === 0) {
      errors.push(`${valuePath} must be a non-empty string.`);
      return;
    }
    if (value.includes("\0")) {
      errors.push(`${valuePath} must not contain a NUL character.`);
      return;
    }
    cliArgs.push(value);
  });
  return normalizeInvocation(harness, cliArgs);
};
var loadHarnessConfiguration = (strikethrooRoot) => {
  const configPath = path5.join(strikethrooRoot, WORKSPACE_CONFIG_RELPATH);
  let contents;
  try {
    contents = fs4.readFileSync(configPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return { kind: "config", config: emptyConfiguration() };
    }
    return {
      kind: "invalid",
      errors: [
        `config.yaml could not be read: ${error instanceof Error ? error.message : String(error)}`
      ]
    };
  }
  let document;
  try {
    document = load(contents);
  } catch (error) {
    return {
      kind: "invalid",
      errors: [
        `config.yaml is not valid YAML: ${error instanceof Error ? error.message : String(error)}`
      ]
    };
  }
  if (document === null || document === void 0) {
    return { kind: "config", config: emptyConfiguration() };
  }
  if (!isPlainObject2(document)) {
    return { kind: "invalid", errors: ["config.yaml must be a YAML mapping."] };
  }
  const section = document[HARNESS_CONFIGURATION_SECTION];
  if (section === null || section === void 0) {
    return { kind: "config", config: emptyConfiguration() };
  }
  if (!isPlainObject2(section)) {
    return {
      kind: "invalid",
      errors: [`config.yaml ${HARNESS_CONFIGURATION_SECTION} must be a YAML mapping.`]
    };
  }
  const errors = [];
  const supportedHarnesses = new Set(SUPPORTED_HARNESSES);
  for (const harness of Object.keys(section)) {
    if (!supportedHarnesses.has(harness)) {
      errors.push(`config.yaml ${HARNESS_CONFIGURATION_SECTION}.${harness} is not supported.`);
    }
  }
  const entries = {};
  for (const harness of SUPPORTED_HARNESSES) {
    if (!(harness in section)) {
      entries[harness] = normalizeInvocation(harness, []);
      continue;
    }
    const entry = validateHarnessEntry(harness, section[harness], errors);
    if (entry) entries[harness] = entry;
  }
  if (errors.length > 0) return { kind: "invalid", errors };
  return { kind: "config", config: Object.freeze(entries) };
};

// src/skill-scripts/shared/external-dispatch.ts
var fs5 = __toESM(require("fs"));
var path6 = __toESM(require("path"));
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
        ...request.cliArgs,
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
        ...request.cliArgs,
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
    buildCommand: (request) => command(
      "cursor-agent",
      ["--print", ...request.cliArgs, ...modelArgv(request.model)],
      request
    ),
    authenticationArgv: () => ["status"]
  },
  gemini: {
    executable: "gemini",
    // The empty positional prompt is the existing contract — content travels on
    // stdin. It stays even when the model pair is dropped.
    buildCommand: (request) => command("gemini", ["--prompt", "", ...request.cliArgs, ...modelArgv(request.model)], request),
    authenticationArgv: () => ["auth", "status"]
  },
  copilot: {
    executable: "copilot",
    buildCommand: (request) => command("copilot", ["-p", "", ...request.cliArgs, ...modelArgv(request.model)], request),
    authenticationArgv: () => ["auth", "status"]
  },
  opencode: {
    executable: "opencode",
    buildCommand: (request) => command(
      "opencode",
      [
        "run",
        ...request.cliArgs,
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
  cliArgs: request.cliArgs ?? [],
  workspace: request.workspace,
  prompt: request.prompt
});
var executableOnPath = (executable) => (/[\\/]/.test(executable) ? [""] : (process.env.PATH ?? "").split(path6.delimiter)).some(
  (directory) => {
    if (!directory && !/[\\/]/.test(executable)) return false;
    const candidate = directory === "" ? executable : path6.join(directory, executable);
    try {
      return fs5.statSync(candidate).isFile();
    } catch {
      return false;
    }
  }
);
var CAPTURED_STDOUT_LIMIT = 262144;
var STDIO_SLOTS = {
  ignore: { stdout: "ignore" },
  inherit: { stdout: "inherit" },
  capture: { stdout: "pipe" }
};
var runProcess = (executable, argv, cwd, stdin, outputMode = "ignore") => new Promise((resolve4, reject) => {
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
      STDIO_SLOTS[outputMode].stdout,
      outputMode === "ignore" ? "ignore" : "inherit"
    ]
  });
  let captured = "";
  if (outputMode === "capture") {
    child.stdout.setEncoding("utf8");
    child.stdout.once("error", fail);
    child.stdout.on("data", (chunk) => {
      process.stderr.write(chunk);
      captured += chunk;
      if (captured.length > CAPTURED_STDOUT_LIMIT) {
        captured = captured.slice(captured.length - CAPTURED_STDOUT_LIMIT);
      }
    });
  }
  child.once("error", fail);
  child.once("close", (code) => {
    if (settled) return;
    settled = true;
    resolve4({
      exitCode: code ?? 1,
      ...outputMode === "capture" ? { stdout: captured } : {}
    });
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
  launch: (commandSpec, options) => runProcess(
    commandSpec.executable,
    commandSpec.argv,
    commandSpec.cwd,
    commandSpec.stdin,
    options?.captureStdout === true ? "capture" : "inherit"
  )
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
  const executable = adapter.executable;
  if (!active.executableExists(executable)) {
    return {
      kind: "fallback",
      reason: "executable-unavailable",
      detail: `${executable} is unavailable.`
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
var launchPrepared = async (prepared, active, label, captureStdout = false) => {
  if (prepared.kind === "fallback") return prepared;
  try {
    const launched = await active.launch(prepared.command, { captureStdout });
    const stdout = launched.stdout === void 0 ? {} : { stdout: launched.stdout };
    return launched.exitCode === 0 ? { kind: "launched-success", exitCode: 0, ...stdout } : { kind: "launched-failure", exitCode: launched.exitCode, ...stdout };
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
  return launchPrepared(prepared, active, "review", true);
};

// src/skill-scripts/shared/harness-availability.ts
var AVAILABILITY_REGISTRY_VERSION = 3;
var AVAILABLE_TTL_MS = 30 * 60 * 1e3;
var UNAVAILABLE_TTL_MS = 5 * 60 * 1e3;
var PROBE_TIMEOUT_MS = 2e4;
var AVAILABILITY_CACHE_RELATIVE_PATH = path7.join("runtime", "harness-availability.json");
var CACHE_VERSION = 2;
var availabilityDefinition = (harness) => {
  const adapter = EXTERNAL_HARNESS_ADAPTERS[harness];
  return {
    executable: adapter.executable,
    buildCommand: (cwd, cliArgs, prompt) => adapter.buildCommand({ cliArgs, workspace: cwd, prompt })
  };
};
var HARNESS_AVAILABILITY_REGISTRY = Object.freeze(
  Object.fromEntries(
    SUPPORTED_HARNESSES.map((harness) => [harness, availabilityDefinition(harness)])
  )
);
var resolveExecutable = (executable) => {
  const extensions = process.platform === "win32" ? ["", ...(process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")] : [""];
  const directories = /[\\/]/.test(executable) ? [""] : (process.env.PATH ?? "").split(path7.delimiter).filter(Boolean);
  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = path7.resolve(directory, `${executable}${extension}`);
      try {
        fs6.accessSync(
          candidate,
          process.platform === "win32" ? fs6.constants.F_OK : fs6.constants.X_OK
        );
        if (fs6.statSync(candidate).isFile()) return fs6.realpathSync(candidate);
      } catch {
      }
    }
  }
  return void 0;
};
var runProbe = (command2, timeoutMs) => new Promise((resolve4) => {
  let settled = false;
  let timedOut = false;
  const finish = (result) => {
    if (settled) return;
    settled = true;
    resolve4(result);
  };
  const child = (0, import_child_process3.spawn)(command2.executable, command2.argv, {
    cwd: command2.cwd,
    shell: false,
    stdio: ["pipe", "ignore", "ignore"]
  });
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, timeoutMs);
  child.once("error", () => {
    clearTimeout(timer);
    finish({ exitCode: 1, timedOut });
  });
  child.once("close", (code) => {
    clearTimeout(timer);
    finish({ exitCode: code ?? 1, timedOut });
  });
  child.stdin?.on("error", () => void 0);
  child.stdin?.end(command2.stdin);
});
var defaultDependencies = {
  now: Date.now,
  resolveExecutable,
  runProbe
};
var isHarness = (value) => typeof value === "string" && SUPPORTED_HARNESSES.includes(value);
var isCacheEntry = (value) => {
  if (!value || typeof value !== "object") return false;
  const entry = value;
  return typeof entry.key === "string" && isHarness(entry.harness) && typeof entry.available === "boolean" && typeof entry.observedAt === "number" && Number.isFinite(entry.observedAt) && typeof entry.expiresAt === "number" && Number.isFinite(entry.expiresAt) && typeof entry.reason === "string";
};
var emptyCache = () => ({ version: CACHE_VERSION, entries: [] });
var readCache = (cachePath) => {
  try {
    const parsed = JSON.parse(fs6.readFileSync(cachePath, "utf8"));
    if (!parsed || typeof parsed !== "object") return emptyCache();
    const record = parsed;
    if (record.version !== CACHE_VERSION || !Array.isArray(record.entries)) return emptyCache();
    return { version: CACHE_VERSION, entries: record.entries.filter(isCacheEntry) };
  } catch {
    return emptyCache();
  }
};
var writeCache = (cachePath, entry) => {
  fs6.mkdirSync(path7.dirname(cachePath), { recursive: true });
  const cache = readCache(cachePath);
  const existingIndex = cache.entries.findIndex((candidate) => candidate.key === entry.key);
  if (existingIndex === -1) cache.entries.push(entry);
  else if (cache.entries[existingIndex].observedAt <= entry.observedAt) {
    cache.entries[existingIndex] = entry;
  }
  const temporary = `${cachePath}.${process.pid}.${(0, import_crypto2.randomUUID)()}.tmp`;
  try {
    fs6.writeFileSync(temporary, `${JSON.stringify(cache, null, 2)}
`, { mode: 384 });
    fs6.renameSync(temporary, cachePath);
  } finally {
    try {
      fs6.unlinkSync(temporary);
    } catch {
    }
  }
};
var cacheKey = (harness, executableIdentity, invocation) => (0, import_crypto2.createHash)("sha256").update(
  JSON.stringify({
    harness,
    executableIdentity,
    cliArgsHash: invocation.cliArgsHash,
    normalizationVersion: HARNESS_CONFIGURATION_NORMALIZATION_VERSION,
    probeRegistryVersion: AVAILABILITY_REGISTRY_VERSION
  })
).digest("hex");
var readinessEvidence = () => {
  const nonce = (0, import_crypto2.randomUUID)();
  return {
    file: "strikethroo-readiness.txt",
    content: `strikethroo-readiness:${nonce}
`
  };
};
var readinessPrompt = (evidence) => `Run a shell command that creates ${evidence.file} in the current workspace with the exact UTF-8 content ${JSON.stringify(evidence.content)}. Do not use a file editing tool.
STRIKETHROO_READINESS=${JSON.stringify(evidence)}
`;
var initializeProbeWorkspace = () => {
  const workspace = fs6.mkdtempSync(path7.join(os.tmpdir(), "strikethroo-harness-probe-"));
  const initialized = (0, import_child_process3.spawnSync)("git", ["init", "--quiet"], {
    cwd: workspace,
    shell: false,
    stdio: "ignore",
    timeout: 5e3
  });
  if (initialized.status === 0 && !initialized.error) return workspace;
  fs6.rmSync(workspace, { recursive: true, force: true });
  return void 0;
};
var hasReadinessEvidence = (workspace, evidence) => {
  const target = path7.join(workspace, evidence.file);
  try {
    return fs6.lstatSync(target).isFile() && fs6.readFileSync(target, "utf8") === evidence.content;
  } catch {
    return false;
  }
};
var outcome = (harness, available, now, reason) => ({
  harness,
  available,
  observedAt: now,
  expiresAt: now + (available ? AVAILABLE_TTL_MS : UNAVAILABLE_TTL_MS),
  reason,
  source: "probe"
});
var invocationFor = (request, harness) => {
  if (request.invocation) return request.invocation;
  const loaded = loadHarnessConfiguration(request.strikethrooRoot);
  return loaded.kind === "config" ? loaded.config[harness] : void 0;
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
  const invocation = invocationFor(request, harness);
  if (!invocation) return outcome(harness, false, now, "Harness configuration is invalid.");
  const definition = HARNESS_AVAILABILITY_REGISTRY[harness];
  const executableIdentity = active.resolveExecutable(definition.executable);
  if (!executableIdentity)
    return outcome(harness, false, now, "Harness executable is unavailable.");
  const key = cacheKey(harness, executableIdentity, invocation);
  const cachePath = path7.join(request.strikethrooRoot, AVAILABILITY_CACHE_RELATIVE_PATH);
  const cached = readCache(cachePath).entries.find(
    (entry) => entry.key === key && entry.expiresAt > now
  );
  if (cached) {
    const { key: _key, ...cachedOutcome } = cached;
    return { ...cachedOutcome, source: "cache" };
  }
  const complete = (result) => {
    const { source: _source, ...cacheEntry } = result;
    try {
      writeCache(cachePath, { key, ...cacheEntry });
    } catch {
    }
    return result;
  };
  const probeWorkspace = initializeProbeWorkspace();
  if (!probeWorkspace) {
    return complete(outcome(harness, false, now, "Harness readiness check failed."));
  }
  try {
    const evidence = readinessEvidence();
    const command2 = definition.buildCommand(
      probeWorkspace,
      invocation.cliArgs,
      readinessPrompt(evidence)
    );
    const probe = await active.runProbe(
      { ...command2, executable: executableIdentity },
      PROBE_TIMEOUT_MS
    );
    const available = probe.exitCode === 0 && !probe.timedOut && hasReadinessEvidence(probeWorkspace, evidence);
    return complete(
      outcome(
        harness,
        available,
        now,
        available ? "Harness readiness verified." : "Harness readiness check failed."
      )
    );
  } finally {
    fs6.rmSync(probeWorkspace, { recursive: true, force: true });
  }
};

// src/skill-scripts/shared/harness-discovery.ts
var discoverHarnesses = async (request, overrides = {}) => {
  const configuration = loadHarnessConfiguration(request.strikethrooRoot);
  if (configuration.kind === "invalid") {
    const now = (overrides.now ?? Date.now)();
    return {
      outcomes: SUPPORTED_HARNESSES.map((harness) => ({
        harness,
        available: harness === request.currentHarness,
        observedAt: now,
        expiresAt: now,
        reason: harness === request.currentHarness ? "Native/current harness targets do not require a probe." : "Harness configuration is invalid.",
        source: harness === request.currentHarness ? "bypass" : "probe"
      })),
      reviewerCandidates: [],
      configurationErrors: configuration.errors
    };
  }
  const outcomes = await Promise.all(
    SUPPORTED_HARNESSES.map(async (harness) => {
      try {
        return await checkHarnessAvailability(
          {
            strikethrooRoot: request.strikethrooRoot,
            workspace: request.workspace,
            harness,
            currentHarness: request.currentHarness,
            invocation: configuration.config[harness]
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
    const outcome2 = outcomes.find((candidate) => candidate.harness === harness);
    return outcome2?.available === true;
  });
  const reviewerInvocations = Object.fromEntries(
    reviewerCandidates.map((harness) => [harness, { cliArgs: configuration.config[harness].cliArgs }])
  );
  return { outcomes, reviewerCandidates, reviewerInvocations };
};

// src/skill-scripts/shared/review-findings.ts
var import_child_process4 = require("child_process");
var SEVERITIES = ["critical", "major", "minor", "info"];
var CONFIDENCES = ["high", "medium", "low"];
var XMLLINT_TIMEOUT_MS = 3e4;
var isSeverity = (value) => SEVERITIES.includes(value);
var isConfidence = (value) => CONFIDENCES.includes(value);
var validateAgainstSchema = (xsdFile, xmlFile, timeoutMs = XMLLINT_TIMEOUT_MS) => new Promise((resolve4) => {
  let settled = false;
  let diagnostics = "";
  const finish = (result) => {
    if (settled) return;
    settled = true;
    resolve4(result);
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
        // Absent, empty, and unrecognised all become null. The label is
        // advisory, so an unreadable one is dropped rather than guessed at.
        severity: isSeverity(severity) ? severity : null,
        confidence: isConfidence(confidence) ? confidence : null,
        category: null,
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
    }
  }
  return findings;
};
var countFindings = (findings) => {
  const counts = {
    total: findings.length,
    critical: 0,
    major: 0,
    minor: 0,
    info: 0,
    unlabelled: 0
  };
  for (const finding of findings) {
    if (finding.severity === null) counts.unlabelled += 1;
    else counts[finding.severity] += 1;
  }
  return counts;
};

// src/skill-scripts/code-review.ts
var HOOK_RELATIVE_PATH = path8.join("config", "hooks", "CODE_REVIEW.md");
var XSD_RELATIVE_PATH = path8.join("config", "schemas", "self-review-v2.xsd");
var REVIEW_DIR_NAME = "review";
var BASE_COMMIT_FILE_NAME = "base-commit.json";
var REVIEW_FILE_NAME = "review.xml";
var FINDINGS_FILE_NAME = "findings.json";
var TRANSCRIPT_FILE_NAME = "reviewer-output.txt";
var SHA_RE = /^[0-9a-f]{40}$/i;
var errorMessage2 = (error) => error instanceof Error ? error.message : String(error);
var readFileOrNull = (filePath) => {
  try {
    return fs7.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
};
var writeTranscript = (reviewDir, transcript) => {
  if (transcript === void 0 || transcript === "") return;
  try {
    fs7.mkdirSync(reviewDir, { recursive: true });
    fs7.writeFileSync(path8.join(reviewDir, TRANSCRIPT_FILE_NAME), transcript, "utf8");
  } catch {
  }
};
var createFindingsGate = () => async (context) => {
  const reviewDir = path8.dirname(context.reviewFile);
  const findingsFile = path8.join(reviewDir, FINDINGS_FILE_NAME);
  const record = (payload) => {
    try {
      fs7.mkdirSync(reviewDir, { recursive: true });
      fs7.writeFileSync(findingsFile, `${JSON.stringify(payload, null, 2)}
`, "utf8");
    } catch (error) {
      throw new Error(
        `The review findings could not be written to ${findingsFile}: ${errorMessage2(error)}`
      );
    }
  };
  const base = { reviewFile: context.reviewFile, xsdFile: context.xsdFile };
  const delivered = _extractReviewDocument(context.reviewerStdout, context.deliveryToken);
  if (delivered === null) {
    const detail = "The reviewer printed no complete findings document between this dispatch's delimiters. A round with no findings document cannot be read as a round with no findings.";
    record({ ...base, status: "findings-absent", detail, findings: [] });
    return { kind: "findings-absent", detail };
  }
  try {
    fs7.mkdirSync(reviewDir, { recursive: true });
    fs7.writeFileSync(
      context.reviewFile,
      delivered.endsWith("\n") ? delivered : `${delivered}
`,
      "utf8"
    );
  } catch (error) {
    throw new Error(
      `The delivered findings document could not be written to ${context.reviewFile}: ` + errorMessage2(error)
    );
  }
  const validation = await validateAgainstSchema(context.xsdFile, context.reviewFile);
  if (validation.kind === "validator-unavailable") {
    record({
      ...base,
      status: "validator-unavailable",
      detail: validation.detail,
      findings: []
    });
    return { kind: "validator-unavailable", detail: validation.detail };
  }
  if (validation.kind === "invalid") {
    const detail = `${context.reviewFile} does not validate against ${context.xsdFile}, so its findings could not be certified and none of them was recorded. xmllint reported: ${validation.detail}`;
    record({ ...base, status: "schema-invalid", detail, findings: [] });
    return { kind: "schema-invalid", detail };
  }
  const xml = readFileOrNull(context.reviewFile);
  if (xml === null) {
    const detail = `${context.reviewFile} validated but could not then be read.`;
    record({ ...base, status: "findings-absent", detail, findings: [] });
    return { kind: "findings-absent", detail };
  }
  const findings = parseReviewFindings(xml);
  const counts = countFindings(findings);
  record({ ...base, status: "evaluated", counts, findings });
  return { kind: "evaluated", counts, findingsFile };
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
  const changed = execGit(
    `git -C ${JSON.stringify(workspace)} diff --no-renames --name-only ${baseCommit} --`
  );
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
  const skillFile = path8.resolve(__dirname, "..", "SKILL.md");
  const content = readFileOrNull(skillFile);
  return content === null ? "Load the `st-code-review` skill and follow its Operating Procedure. If that skill is not installed on this harness, follow the mandate below exactly." : content;
};
var _makeDeliveryToken = () => crypto.randomBytes(6).toString("hex");
var beginMarker = (token) => `<<<BEGIN REVIEW XML ${token}>>>`;
var endMarker = (token) => `<<<END REVIEW XML ${token}>>>`;
var ANSI_PATTERN = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
var _extractReviewDocument = (stdout, token) => {
  const clean = stdout.replace(ANSI_PATTERN, "");
  const begin = beginMarker(token);
  const end = endMarker(token);
  let searchFrom = clean.length;
  while (searchFrom >= 0) {
    const endIndex = clean.lastIndexOf(end, searchFrom);
    if (endIndex === -1) return null;
    const beginIndex = clean.lastIndexOf(begin, endIndex);
    if (beginIndex === -1) return null;
    const inner = clean.slice(beginIndex + begin.length, endIndex).trim();
    if (inner.startsWith("<?xml") || inner.startsWith("<review")) return inner;
    searchFrom = beginIndex - 1;
  }
  return null;
};
var buildReviewerPrompt = (input) => [
  `Strikethroo code review gate \u2014 Plan ${input.planId}.`,
  "",
  "You are the independent reviewer, running on a different harness than the one",
  "that wrote this code. You detect; you never fix. Do not edit, create, or delete",
  "source files. Do not run formatters. Do not commit. Your entire output is one",
  "findings document, printed as described below, plus a short report of the counts.",
  "",
  `Repository / workspace root: ${input.workspace}`,
  `Strikethroo workspace root: ${input.strikethrooRoot}`,
  `Plan document (read it in full): ${input.planFile}`,
  `Review mandate hook: ${input.hookFile}`,
  `Findings schema to validate against: ${input.xsdFile}`,
  `Base commit anchoring this plan's scope: ${input.baseCommit}`,
  "",
  "## How to deliver your findings",
  "",
  "Print the complete findings document as the final thing you print, between these",
  "exact lines:",
  "",
  beginMarker(input.deliveryToken),
  // The placeholder deliberately does not begin with `<?xml` or `<review`.
  // `_extractReviewDocument` rejects a region on exactly that test, which is what
  // stops a reviewer that echoes these instructions back from being read as a
  // delivered document. A placeholder shaped like a real document would defeat
  // it — keep this line prose, here and in any mirror of it.
  "... the complete findings document, beginning with its XML declaration ...",
  endMarker(input.deliveryToken),
  "",
  "Copy those two lines from this dispatch; never invent a token. Print nothing after",
  "the closing line. Do not write the document to a file \u2014 this channel is the only",
  "one that is read. The document is validated against the schema named above, so an",
  "incomplete or invented document fails the review. Being unable to read the",
  "repository is not a reason to emit this block: a review you could not perform is a",
  "failed review, and emitting well-formed XML instead of reporting that failure is a",
  "worse outcome than the failure.",
  "",
  "## Review mandate (authoritative \u2014 it overrides the reviewer instructions below)",
  "",
  input.hookContent.trim(),
  "",
  "## Reviewer instructions",
  "",
  input.skillInstructions.trim(),
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
  const hookFile = path8.join(strikethrooRoot, HOOK_RELATIVE_PATH);
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
  const xsdFile = path8.join(strikethrooRoot, XSD_RELATIVE_PATH);
  if (!fs7.existsSync(xsdFile)) {
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
      workspace: path8.dirname(path8.dirname(strikethrooRoot)),
      hookFile,
      hookContent,
      xsdFile
    }
  };
};
var runReview = async (request, overrides = {}) => {
  const dependencies2 = { ...defaultDependencies2, ...overrides };
  const startPath = request.startPath ?? process.cwd();
  const resolution = resolveReviewContext(startPath, dependencies2.validatorAvailable);
  if (resolution.kind === "ended") return resolution.result;
  const { strikethrooRoot, workspace, hookFile, hookContent, xsdFile } = resolution.context;
  const resolved = resolvePlan(request.plan, startPath);
  if (!resolved) {
    return {
      kind: "infrastructure-failure",
      detail: `Plan "${request.plan}" was not found or is invalid.`
    };
  }
  const { planDir, planFile, planId } = resolved;
  const baseCommitFile = path8.join(planDir, REVIEW_DIR_NAME, BASE_COMMIT_FILE_NAME);
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
  if (discovery.configurationErrors !== void 0) {
    return {
      kind: "infrastructure-failure",
      detail: `Harness invocation configuration is invalid: ${discovery.configurationErrors.join(
        " "
      )}`
    };
  }
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
  const reviewDir = path8.join(planDir, REVIEW_DIR_NAME);
  const reviewFile = path8.join(reviewDir, REVIEW_FILE_NAME);
  try {
    fs7.mkdirSync(reviewDir, { recursive: true });
  } catch (error) {
    return {
      kind: "infrastructure-failure",
      detail: `Could not create the review directory ${reviewDir}: ${errorMessage2(error)}`
    };
  }
  const staleArtifacts = [reviewFile, path8.join(reviewDir, TRANSCRIPT_FILE_NAME)];
  for (const stale of staleArtifacts) {
    try {
      fs7.rmSync(stale, { force: true });
    } catch (error) {
      return {
        kind: "infrastructure-failure",
        detail: `Could not remove the stale review artifact ${stale}: ${errorMessage2(error)}`
      };
    }
  }
  const deliveryToken = _makeDeliveryToken();
  const prompt = buildReviewerPrompt({
    planId,
    planFile,
    strikethrooRoot,
    workspace,
    hookFile,
    hookContent,
    xsdFile,
    baseCommit,
    diff,
    skillInstructions: readReviewerSkill(),
    deliveryToken
  });
  const invocation = discovery.reviewerInvocations?.[harness];
  const dispatched = await dependencies2.dispatch({
    harness,
    workspace,
    prompt,
    ...invocation === void 0 ? {} : {
      cliArgs: invocation.cliArgs
    }
  });
  if (dispatched.kind === "infrastructure-failure") {
    return { kind: "infrastructure-failure", detail: dispatched.detail };
  }
  if (dispatched.kind === "fallback") {
    return {
      kind: "fallback",
      harness,
      reason: dispatched.reason,
      detail: dispatched.detail
    };
  }
  if (dispatched.kind === "launched-failure") {
    writeTranscript(reviewDir, dispatched.stdout);
    return {
      kind: "launched-failure",
      harness,
      reviewFile,
      exitCode: dispatched.exitCode,
      detail: `The ${harness} reviewer exited ${dispatched.exitCode}.`
    };
  }
  const evaluate = dependencies2.evaluateFindings ?? createFindingsGate();
  const findingsGate = await evaluate({
    reviewFile,
    xsdFile,
    planDir,
    reviewerStdout: dispatched.stdout ?? "",
    deliveryToken
  });
  if (findingsGate.kind !== "evaluated") {
    writeTranscript(reviewDir, dispatched.stdout);
  }
  return {
    kind: "reviewed",
    harness,
    baseCommit,
    reviewFile,
    reviewFilePresent: fs7.existsSync(reviewFile),
    verdict: _verdictFor(findingsGate),
    findingsGate
  };
};
var _verdictFor = (outcome2) => {
  if (outcome2.kind !== "evaluated") {
    return { kind: "review-failed", detail: outcome2.detail };
  }
  const { counts, findingsFile } = outcome2;
  if (counts.total === 0) {
    return {
      kind: "review-recorded",
      detail: `The reviewer raised no findings. See ${findingsFile}.`
    };
  }
  const byLabel = SEVERITIES.filter((label) => counts[label] > 0).map((label) => `${counts[label]} ${label}`).concat(counts.unlabelled > 0 ? [`${counts.unlabelled} unlabelled`] : []).join(", ");
  return {
    kind: "review-recorded",
    detail: `The reviewer raised ${counts.total} finding(s) (${byLabel}). They are recorded, not applied: read them and decide which to act on. See ${findingsFile}.`
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
  if (result.kind === "reviewed") return result.verdict.kind === "review-failed" ? 1 : 0;
  return 0;
};
var main = async (startPath = process.cwd()) => {
  const [planArg, harnessArg] = process.argv.slice(2);
  if (!planArg || !harnessArg || !SUPPORTED_HARNESSES.includes(harnessArg)) {
    emit(
      {
        kind: "infrastructure-failure",
        detail: `Usage: code-review.cjs <plan-id-or-path> <current-harness>. <current-harness> is one of: ${SUPPORTED_HARNESSES.join(", ")}.`
      },
      2
    );
  }
  const result = await runReview({
    plan: planArg,
    currentHarness: harnessArg,
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
  _exitCodeFor,
  _extractReviewDocument,
  _makeDeliveryToken,
  _readBaseCommit,
  _readCumulativeDiff,
  _verdictFor,
  buildReviewerPrompt,
  createFindingsGate,
  main,
  runReview
});
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 5.2.1 https://github.com/nodeca/js-yaml @license MIT *)
*/
