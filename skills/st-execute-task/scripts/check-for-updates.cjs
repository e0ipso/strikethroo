"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
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

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports2, module2) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module2.exports = debug;
  }
});

// node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/semver/internal/constants.js"(exports2, module2) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module2.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports2, module2) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports2 = module2.exports = {};
    var re = exports2.re = [];
    var safeRe = exports2.safeRe = [];
    var src = exports2.src = [];
    var safeSrc = exports2.safeSrc = [];
    var t = exports2.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports2.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports2.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports2.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports2, module2) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module2.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports2, module2) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module2.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports2, module2) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var isPrereleaseIdentifier = (prerelease2, identifier) => {
      const identifiers = identifier.split(".");
      if (identifiers.length > prerelease2.length) {
        return false;
      }
      for (let i = 0; i < identifiers.length; i++) {
        if (compareIdentifiers(prerelease2[i], identifiers[i]) !== 0) {
          return false;
        }
      }
      return true;
    };
    var SemVer2 = class _SemVer {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease2 = [identifier, base];
              if (identifierBase === false) {
                prerelease2 = [identifier];
              }
              if (isPrereleaseIdentifier(this.prerelease, identifier)) {
                const prereleaseBase = this.prerelease[identifier.split(".").length];
                if (isNaN(prereleaseBase)) {
                  this.prerelease = prerelease2;
                }
              } else {
                this.prerelease = prerelease2;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module2.exports = SemVer2;
  }
});

// node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/semver/functions/parse.js"(exports2, module2) {
    "use strict";
    var SemVer2 = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer2) {
        return version;
      }
      try {
        return new SemVer2(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module2.exports = parse;
  }
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/semver/functions/valid.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var valid2 = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module2.exports = valid2;
  }
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/semver/functions/prerelease.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var prerelease2 = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module2.exports = prerelease2;
  }
});

// src/skill-scripts/check-for-updates.ts
var check_for_updates_exports = {};
__export(check_for_updates_exports, {
  main: () => main
});
module.exports = __toCommonJS(check_for_updates_exports);

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

// src/skill-scripts/shared/update-check.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var import_child_process = require("child_process");
var import_semver = __toESM(require_semver());
var import_valid = __toESM(require_valid());
var import_prerelease = __toESM(require_prerelease());

// src/types.ts
var SUPPORTED_HARNESSES = [
  "claude",
  "codex",
  "cursor",
  "gemini",
  "copilot",
  "opencode"
];

// src/resolve-init-harnesses.ts
function normalizeSavedHarnesses(saved) {
  if (!Array.isArray(saved) || saved.length === 0) {
    return void 0;
  }
  const harnesses = saved.map((entry) => String(entry).trim().toLowerCase());
  const invalid = harnesses.filter((h) => !SUPPORTED_HARNESSES.includes(h));
  if (invalid.length > 0 || harnesses.length === 0) {
    return void 0;
  }
  return Array.from(new Set(harnesses));
}

// src/skill-scripts/shared/safe-fs.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var import_crypto = require("crypto");
var DEFAULT_MAX_READ_BYTES = 8 * 1024 * 1024;
var fail = (error, message) => ({ error, message });
var errno = (err) => typeof err === "object" && err !== null && "code" in err ? String(err.code) : void 0;
var canonicalRootOf = (root) => {
  try {
    return fs2.realpathSync.native(path2.resolve(root));
  } catch {
    return fail("not-found", "Workspace root does not exist.");
  }
};
var resolveContained = (root, input, options = {}) => {
  if (typeof input !== "string" || input.includes("\0")) {
    return fail("invalid-path", "Path is not valid.");
  }
  const givenRoot = path2.resolve(root);
  const canonicalRoot = canonicalRootOf(givenRoot);
  if (typeof canonicalRoot !== "string") return canonicalRoot;
  const rel = path2.isAbsolute(input) ? path2.relative(givenRoot, input) : input;
  const target = path2.resolve(canonicalRoot, rel);
  const relative2 = path2.relative(canonicalRoot, target);
  if (path2.isAbsolute(relative2) || relative2 === ".." || relative2.startsWith(`..${path2.sep}`) || relative2.includes("\0")) {
    return fail("outside-root", "Path is outside the workspace root.");
  }
  const kind = options.expect ?? "file";
  const parts = relative2 === "" ? [] : relative2.split(path2.sep);
  let current = canonicalRoot;
  let stats;
  try {
    stats = fs2.lstatSync(canonicalRoot);
  } catch {
    return fail("fs-error", "Could not inspect path.");
  }
  for (let i = 0; i < parts.length; i += 1) {
    const isLeaf = i === parts.length - 1;
    current = path2.join(current, parts[i]);
    try {
      stats = fs2.lstatSync(current);
    } catch (err) {
      const code = errno(err);
      if (code === "ENOENT" || code === "ENOTDIR") {
        if (isLeaf && options.allowMissingLeaf) {
          return { path: current, relative: relative2, exists: false };
        }
        return fail("not-found", "Path does not exist.");
      }
      return fail("fs-error", "Could not inspect path.");
    }
    if (stats.isSymbolicLink()) {
      return fail("symlink", "Symbolic links inside the workspace are not allowed.");
    }
    if (!isLeaf && !stats.isDirectory()) {
      return fail("not-a-directory", "A path component is not a directory.");
    }
  }
  if (kind === "directory" && !stats.isDirectory()) {
    return fail("not-a-directory", "Path is not a directory.");
  }
  if (kind === "file" && !stats.isFile()) {
    return fail("not-a-file", "Path is not a regular file.");
  }
  return { path: current, relative: relative2, exists: true, stats };
};
var planAtomicWrite = (root, input, options) => {
  const mustExist = options.mustExist === true;
  const resolved = resolveContained(root, input, { allowMissingLeaf: !mustExist });
  if ("error" in resolved) return resolved;
  if (mustExist && !resolved.exists) return fail("not-found", "Path does not exist.");
  const target = resolved.path;
  const mode = options.mode ?? (resolved.exists && resolved.stats ? resolved.stats.mode & 511 : 384);
  const temp = path2.join(
    path2.dirname(target),
    `.${path2.basename(target)}.${(0, import_crypto.randomBytes)(8).toString("hex")}.tmp`
  );
  return { target, temp, mode, mustExist };
};
var recheckTarget = (target, mustExist) => {
  try {
    const again = fs2.lstatSync(target);
    if (again.isSymbolicLink()) {
      return fail("symlink", "Symbolic links inside the workspace are not allowed.");
    }
    if (!again.isFile()) return fail("not-a-file", "Path is not a regular file.");
  } catch (err) {
    if (errno(err) !== "ENOENT") return fail("fs-error", "Could not inspect path.");
    if (mustExist) return fail("not-found", "Path does not exist.");
  }
  return void 0;
};
var writeFileAtomicSync = (root, input, content, options = {}) => {
  const plan = planAtomicWrite(root, input, options);
  if ("error" in plan) return plan;
  const { target, temp, mode, mustExist } = plan;
  let fd;
  let renamed = false;
  try {
    fd = fs2.openSync(temp, "wx", 384);
    fs2.writeFileSync(fd, content);
    fs2.fsyncSync(fd);
    if (mode !== 384) fs2.fchmodSync(fd, mode);
    fs2.closeSync(fd);
    fd = void 0;
    const refused = recheckTarget(target, mustExist);
    if (refused) return refused;
    fs2.renameSync(temp, target);
    renamed = true;
    return { path: target };
  } catch {
    return fail("fs-error", "Could not write file.");
  } finally {
    if (fd !== void 0) {
      try {
        fs2.closeSync(fd);
      } catch {
      }
    }
    if (!renamed) {
      try {
        fs2.unlinkSync(temp);
      } catch {
      }
    }
  }
};

// src/skill-scripts/shared/update-check.ts
var DEFAULT_SKILL_VERSION = true ? "4.7.0" : (() => {
  try {
    return null.version;
  } catch {
    return "0.0.0";
  }
})();
var GITHUB_LATEST_RELEASE_URL = "https://api.github.com/repos/e0ipso/strikethroo/releases/latest";
var UPDATE_COMMAND = "npx strikethroo@latest update";
var BUNDLED_UPDATE_NOTICE_TEMPLATE = "A newer Strikethroo release is available. Run `{{updateCommand}}` to update.";
var BUNDLED_HARNESS_UPDATE_NOTICE = "A newer Strikethroo release is available. Ask the user which harnesses to use, then run `{{updateCommand}}` with `--harnesses <list>`.";
var UPDATE_NOTICE_TEMPLATE_RELATIVE = path3.join(
  "config",
  "templates",
  "UPDATE_NOTICE_TEMPLATE.md"
);
var REQUEST_TIMEOUT_MS = 2e3;
var MAX_RESPONSE_BYTES = 65536;
var ATTEMPT_INTERVAL_MS = 24 * 60 * 60 * 1e3;
var NOTICE_INTERVAL_MS = 24 * 60 * 60 * 1e3;
var LOCK_STALE_MS = 3e4;
var STATE_RELATIVE_PATH = path3.join("runtime", "update-check.json");
var LOCK_RELATIVE_PATH = path3.join("runtime", "update-check.lock");
var defaultFetchLatestRelease = async () => {
  try {
    const response = await fetch(GITHUB_LATEST_RELEASE_URL, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "strikethroo-update-check"
      }
    });
    if (!response.ok) return null;
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    const payload = JSON.parse(text);
    if (payload.prerelease || payload.draft) return null;
    return stableRelease(payload.tag_name);
  } catch {
    return null;
  }
};
var defaultFindProjectRoot = (strikethrooRoot) => {
  try {
    const output = (0, import_child_process.execFileSync)("git", ["-C", strikethrooRoot, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return output || null;
  } catch {
    return null;
  }
};
var defaultIsStatePathGitignored = (projectRoot, statePath) => {
  try {
    (0, import_child_process.execFileSync)("git", ["check-ignore", "-q", "--", statePath], {
      cwd: projectRoot,
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
};
var readJsonFile = (filePath) => {
  try {
    if (!fs3.existsSync(filePath)) return null;
    const parsed = JSON.parse(fs3.readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};
var parseLock = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.pid !== "number" || typeof parsed.claimedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
};
var isLockStale = (lock, nowMs) => {
  const claimedAt = Date.parse(lock.claimedAt);
  if (Number.isNaN(claimedAt)) return true;
  return nowMs - claimedAt >= LOCK_STALE_MS;
};
var defaultTryAcquireLock = (lockPath, now) => {
  try {
    fs3.mkdirSync(path3.dirname(lockPath), { recursive: true });
    const fd = fs3.openSync(lockPath, "wx");
    try {
      const payload = { pid: process.pid, claimedAt: new Date(now()).toISOString() };
      fs3.writeFileSync(fd, JSON.stringify(payload));
    } finally {
      fs3.closeSync(fd);
    }
    return true;
  } catch (err) {
    const code = err.code;
    if (code !== "EEXIST") return false;
    try {
      const lock = parseLock(fs3.readFileSync(lockPath, "utf8"));
      const stale = lock ? isLockStale(lock, now()) : now() - fs3.statSync(lockPath).mtimeMs >= LOCK_STALE_MS;
      if (!stale) return false;
      if (lock && Number.isInteger(lock.pid) && lock.pid > 0) {
        try {
          process.kill(lock.pid, 0);
          return false;
        } catch (error) {
          if (error.code !== "ESRCH") return false;
        }
      }
      fs3.unlinkSync(lockPath);
    } catch {
      return false;
    }
    return defaultTryAcquireLock(lockPath, now);
  }
};
var defaultReleaseLock = (lockPath) => {
  try {
    const lock = parseLock(fs3.readFileSync(lockPath, "utf8"));
    if (lock?.pid === process.pid) fs3.unlinkSync(lockPath);
  } catch {
  }
};
var defaultWriteTextFile = (filePath, contents) => {
  try {
    const dir = path3.dirname(filePath);
    fs3.mkdirSync(dir, { recursive: true });
    return !("error" in writeFileAtomicSync(dir, path3.basename(filePath), contents));
  } catch {
    return false;
  }
};
var compareToRelease = (localVersion, release) => {
  if (!localVersion || !release) return "unknown";
  const local = (0, import_valid.default)(localVersion);
  const remote = (0, import_valid.default)(release);
  if (!local || !remote) return "unknown";
  const order = new import_semver.default(local).compare(remote);
  return order < 0 ? "outdated" : order > 0 ? "ahead" : "current";
};
var stableRelease = (value) => {
  if (typeof value !== "string") return null;
  const version = (0, import_valid.default)(value.replace(/^v/i, ""));
  return version && (0, import_prerelease.default)(version) === null ? version : null;
};
var intervalElapsed = (timestamp, nowMs, intervalMs) => {
  const last = typeof timestamp === "string" ? Date.parse(timestamp) : NaN;
  return Number.isNaN(last) || nowMs - last >= intervalMs;
};
var interpolateNoticeTemplate = (template, result) => template.replace(
  /\{\{(updateCommand|latestRelease|workspaceVersion|skillVersion)\}\}/g,
  (_, key) => result[key] ?? "unknown"
);
var readNoticeTemplate = (strikethrooRoot, readTextFile) => {
  const workspaceTemplate = readTextFile(
    path3.join(strikethrooRoot, UPDATE_NOTICE_TEMPLATE_RELATIVE)
  );
  return workspaceTemplate?.trim() || BUNDLED_UPDATE_NOTICE_TEMPLATE;
};
var buildNotice = (strikethrooRoot, result, readTextFile) => {
  if (!result.noticeEligible) return void 0;
  if (result.needsHarnessPrompt) {
    return interpolateNoticeTemplate(BUNDLED_HARNESS_UPDATE_NOTICE, result);
  }
  return interpolateNoticeTemplate(readNoticeTemplate(strikethrooRoot, readTextFile), result);
};
var emptyUpdateCheckResult = (skillVersion) => ({
  noticeEligible: false,
  needsHarnessPrompt: false,
  updateCommand: UPDATE_COMMAND,
  latestRelease: null,
  workspaceVersion: null,
  skillVersion,
  workspaceDisposition: "unknown",
  skillDisposition: "unknown"
});
var readWorkspaceMetadata = (strikethrooRoot, readTextFile) => {
  const raw = readTextFile(path3.join(strikethrooRoot, ".init-metadata.json"));
  if (!raw) return { version: null, needsHarnessPrompt: true };
  try {
    const metadata = JSON.parse(raw);
    const version = typeof metadata.version === "string" ? (0, import_valid.default)(metadata.version) : null;
    const needsHarnessPrompt = !normalizeSavedHarnesses(metadata.harnesses);
    return { version, needsHarnessPrompt };
  } catch {
    return { version: null, needsHarnessPrompt: true };
  }
};
var createDefaultDependencies = () => {
  const now = () => Date.now();
  return {
    now,
    skillVersion: DEFAULT_SKILL_VERSION,
    fetchLatestRelease: defaultFetchLatestRelease,
    isStatePathGitignored: defaultIsStatePathGitignored,
    findProjectRoot: defaultFindProjectRoot,
    readTextFile: (filePath) => {
      try {
        if (!fs3.existsSync(filePath)) return null;
        return fs3.readFileSync(filePath, "utf8");
      } catch {
        return null;
      }
    },
    writeTextFile: defaultWriteTextFile,
    tryAcquireLock: (lockPath) => defaultTryAcquireLock(lockPath, now),
    releaseLock: defaultReleaseLock
  };
};
var checkForUpdates = async (strikethrooRoot, partialDeps = {}) => {
  const deps = { ...createDefaultDependencies(), ...partialDeps };
  const skillVersion = (0, import_valid.default)(deps.skillVersion) ?? "unknown";
  const metadata = readWorkspaceMetadata(strikethrooRoot, deps.readTextFile);
  const workspaceVersion = metadata.version;
  const unavailable = {
    ...emptyUpdateCheckResult(skillVersion),
    workspaceVersion,
    needsHarnessPrompt: metadata.needsHarnessPrompt
  };
  const statePath = path3.join(strikethrooRoot, STATE_RELATIVE_PATH);
  const projectRoot = deps.findProjectRoot(strikethrooRoot);
  if (!projectRoot || !deps.isStatePathGitignored(projectRoot, statePath)) {
    return unavailable;
  }
  const lockPath = path3.join(strikethrooRoot, LOCK_RELATIVE_PATH);
  const nowMs = deps.now();
  if (!deps.tryAcquireLock(lockPath)) return unavailable;
  try {
    let workingState = readJsonFile(statePath) ?? {};
    let latestRelease = stableRelease(workingState.lastSuccessfulRelease);
    if (intervalElapsed(workingState.lastAttemptAt, nowMs, ATTEMPT_INTERVAL_MS)) {
      workingState = {
        ...workingState,
        lastAttemptAt: new Date(nowMs).toISOString(),
        lastAttemptFailed: true
      };
      if (!deps.writeTextFile(statePath, JSON.stringify(workingState))) {
        return unavailable;
      }
      let fetched = null;
      try {
        fetched = stableRelease(await deps.fetchLatestRelease());
      } catch {
      }
      workingState.lastAttemptFailed = fetched === null;
      if (fetched !== null) {
        workingState.lastSuccessfulRelease = fetched;
        workingState.lastSuccessfulReleaseAt = new Date(nowMs).toISOString();
        latestRelease = fetched;
      }
      if (!deps.writeTextFile(statePath, JSON.stringify(workingState))) {
        return unavailable;
      }
    }
    const workspaceDisposition = compareToRelease(workspaceVersion, latestRelease);
    const skillDisposition = compareToRelease(skillVersion, latestRelease);
    const componentOutdated = workspaceDisposition === "outdated" || skillDisposition === "outdated";
    const noticeEligible = componentOutdated && intervalElapsed(workingState.lastNoticeIssuedAt, nowMs, NOTICE_INTERVAL_MS);
    if (noticeEligible) {
      workingState = {
        ...workingState,
        lastNoticeIssuedAt: new Date(nowMs).toISOString()
      };
      if (!deps.writeTextFile(statePath, JSON.stringify(workingState))) {
        return {
          ...unavailable,
          latestRelease,
          workspaceDisposition,
          skillDisposition
        };
      }
    }
    const base = {
      noticeEligible,
      needsHarnessPrompt: metadata.needsHarnessPrompt,
      updateCommand: `${UPDATE_COMMAND} --destination-directory '${path3.resolve(strikethrooRoot, "../..").replace(/'/g, "'\\''")}'`,
      latestRelease,
      workspaceVersion,
      skillVersion,
      workspaceDisposition,
      skillDisposition
    };
    return {
      ...base,
      notice: buildNotice(strikethrooRoot, base, deps.readTextFile)
    };
  } finally {
    deps.releaseLock(lockPath);
  }
};

// src/skill-scripts/check-for-updates.ts
var main = async () => {
  const startPath = process.argv[2] || process.cwd();
  let result = emptyUpdateCheckResult("0.0.0");
  try {
    const root = findStrikethrooRoot(startPath);
    if (root) result = await checkForUpdates(root);
  } catch {
  }
  process.stdout.write(`${JSON.stringify(result)}
`);
  process.exit(0);
};
if (require.main === module) {
  void main();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
