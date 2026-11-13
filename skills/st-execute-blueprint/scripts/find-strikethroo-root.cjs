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

// src/skill-scripts/find-strikethroo-root.ts
var find_strikethroo_root_exports = {};
__export(find_strikethroo_root_exports, {
  main: () => main
});
module.exports = __toCommonJS(find_strikethroo_root_exports);

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
var checkWorkspaceSchema = (strikethrooRoot) => {
  let metadata;
  try {
    metadata = JSON.parse(
      fs.readFileSync(path.join(strikethrooRoot, ".init-metadata.json"), "utf8")
    );
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
var discoverStrikethrooRoot = (startPath = process.cwd()) => {
  let directory = path.resolve(startPath);
  for (; ; ) {
    const root = getStrikethrooAt(directory);
    if (root) return root;
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
};
var findStrikethrooRoot = (startPath = process.cwd()) => {
  const root = discoverStrikethrooRoot(startPath);
  if (root) checkWorkspaceSchema(root);
  return root;
};

// src/skill-scripts/find-strikethroo-root.ts
var main = () => {
  const startPath = process.argv[2] || process.cwd();
  const root = findStrikethrooRoot(startPath);
  if (!root) {
    process.stderr.write(
      `Could not find .ai/strikethroo root from ${startPath} or any parent directory.
`
    );
    process.exit(1);
  }
  process.stdout.write(`${root}
`);
  process.exit(0);
};
if (require.main === module) {
  main();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
