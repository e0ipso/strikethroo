/**
 * The shared executable resolver: PATH scanning, execute-permission semantics,
 * path-bearing references, and a simulated Windows `PATHEXT` case. Fixtures are
 * real files under a temp directory. `PATH` reaches the resolver through its
 * environment parameter, so `process.env` is never mutated and nothing is
 * spawned.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  executableResolves,
  resolveExecutablePath,
} from '../skill-scripts/shared/executable-resolution';

const SHEBANG = `#!${process.execPath}\nprocess.exit(0);\n`;

describe('executable resolution', () => {
  let root: string;
  let bin: string;
  let decoy: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'executable-resolution-'));
    bin = path.join(root, 'bin');
    decoy = path.join(root, 'decoy');
    fs.mkdirSync(bin);
    fs.mkdirSync(decoy);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const file = (directory: string, name: string, mode: number): string => {
    const target = path.join(directory, name);
    fs.writeFileSync(target, SHEBANG, { mode });
    return target;
  };

  it('accepts only an executable regular file, scanning PATH or honouring a given path', () => {
    const runnable = file(bin, 'runnable', 0o755);
    const unrunnable = file(bin, 'unrunnable', 0o644);
    fs.mkdirSync(path.join(bin, 'dirlike'), { mode: 0o755 });
    // Same name earlier on PATH but not executable: the scan must continue.
    file(decoy, 'runnable', 0o644);
    const env = { PATH: [decoy, bin].join(path.delimiter) };
    const relative = path.relative(process.cwd(), runnable);
    expect(relative).toMatch(/[\\/]/);

    const cases: Array<[string, Record<string, string>, string | null]> = [
      ['runnable', env, fs.realpathSync(runnable)],
      ['unrunnable', env, null],
      ['dirlike', env, null],
      ['missing', env, null],
      // Path-bearing references never scan PATH.
      [runnable, { PATH: '' }, fs.realpathSync(runnable)],
      [relative, { PATH: '' }, fs.realpathSync(runnable)],
      [unrunnable, { PATH: '' }, null],
      // An empty PATH entry is skipped, not read as the working directory.
      ['runnable', { PATH: path.delimiter }, null],
    ];
    for (const [executable, environment, expected] of cases) {
      expect(resolveExecutablePath(executable, { env: environment }), executable).toBe(expected);
      expect(executableResolves(executable, { env: environment }), executable).toBe(
        expected !== null
      );
    }
  });

  /**
   * Platform fixture, not a native Windows run: `PATHEXT` suffixing and the
   * `F_OK` permission rule are simulated here. Case-insensitive filename
   * matching and the `;` PATH delimiter are properties of a real Windows host
   * that this fixture does not reproduce, so the suffix list carries `.exe` in
   * the file's own case and PATH holds a single directory.
   */
  it('appends PATHEXT suffixes and ignores the execute bit on win32', () => {
    const validator = file(bin, 'xmllint.exe', 0o644);
    const win32 = {
      env: { PATH: bin, PATHEXT: '.COM;.exe;.BAT;.CMD' },
      platform: 'win32' as const,
    };
    expect(resolveExecutablePath('xmllint', win32)).toBe(fs.realpathSync(validator));
    expect(resolveExecutablePath('xmllint.exe', win32)).toBe(fs.realpathSync(validator));
    expect(executableResolves('xmllint', win32)).toBe(true);
    expect(resolveExecutablePath('xmllint', { ...win32, platform: 'linux' })).toBeNull();
  });
});
