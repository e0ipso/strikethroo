/**
 * Minimal Utils Tests - Critical Business Logic Only
 *
 * Tests only functions with actual business logic that could fail silently
 * or cause data corruption. Skips simple wrappers and obvious functionality.
 */

import {
  parseHarnesses,
  validateHarnesses,
  convertAgentMdToToml,
  convertAgentMdToKiroJson,
  getAgentFormat,
} from '../utils';
import { Harness } from '../types';

describe('Critical Utils Business Logic', () => {
  describe('parseHarnesses', () => {
    it('should parse and normalize single harness', () => {
      expect(parseHarnesses('claude')).toEqual(['claude']);
      expect(parseHarnesses(' CLAUDE ')).toEqual(['claude']);
    });

    it('should parse multiple harnesses with normalization', () => {
      expect(parseHarnesses('claude,gemini')).toEqual(['claude', 'gemini']);
      expect(parseHarnesses(' Claude , GEMINI ')).toEqual(['claude', 'gemini']);
      expect(parseHarnesses('claude,gemini,opencode')).toEqual(['claude', 'gemini', 'opencode']);
      expect(parseHarnesses(' OPENCODE ')).toEqual(['opencode']);
    });

    it('should remove duplicates and empty entries', () => {
      expect(parseHarnesses('claude,claude,gemini')).toEqual(['claude', 'gemini']);
      expect(parseHarnesses('claude,,gemini,')).toEqual(['claude', 'gemini']);
    });

    it('should reject empty input', () => {
      expect(() => parseHarnesses('')).toThrow('Harnesses parameter cannot be empty');
      expect(() => parseHarnesses('   ')).toThrow('Harnesses parameter cannot be empty');
    });

    it('should reject invalid harnesses', () => {
      expect(() => parseHarnesses('invalid')).toThrow(
        'Invalid harness(es): invalid. Valid options are: claude, codex, cursor, gemini, copilot, opencode, kiro'
      );
      expect(() => parseHarnesses('claude,invalid,unknown')).toThrow(
        'Invalid harness(es): invalid, unknown. Valid options are: claude, codex, cursor, gemini, copilot, opencode, kiro'
      );
    });
  });

  describe('validateHarnesses', () => {
    it('should accept valid harnesses', () => {
      expect(() => validateHarnesses(['claude'])).not.toThrow();
      expect(() => validateHarnesses(['claude', 'gemini'])).not.toThrow();
      expect(() => validateHarnesses(['copilot'])).not.toThrow();
      expect(() => validateHarnesses(['claude', 'gemini', 'opencode'])).not.toThrow();
      expect(() => validateHarnesses(['kiro'])).not.toThrow();
    });

    it('should reject empty array', () => {
      expect(() => validateHarnesses([])).toThrow('At least one harness must be specified');
    });

    it('should reject invalid harnesses', () => {
      expect(() => validateHarnesses(['invalid' as Harness])).toThrow(
        'Invalid harness: invalid. Supported harnesses: claude, codex, cursor, gemini, copilot, opencode, kiro'
      );
    });
  });

  describe('convertAgentMdToToml', () => {
    it('converts markdown with YAML frontmatter to TOML', () => {
      const md = [
        '---',
        'name: plan-creator',
        'description: Creates strategic plans',
        '---',
        '# Instructions',
        '',
        'Do the thing.',
      ].join('\n');

      const toml = convertAgentMdToToml(md);
      expect(toml).toContain('name = "plan-creator"');
      expect(toml).toContain('description = "Creates strategic plans"');
      expect(toml).toContain('developer_instructions = """');
      expect(toml).toContain('# Instructions');
      expect(toml).toContain('Do the thing.');
    });

    it('produces valid TOML when input has no frontmatter', () => {
      const md = '# Just a heading\n\nSome body text.';
      const toml = convertAgentMdToToml(md);
      expect(toml).toContain('name = ""');
      expect(toml).toContain('description = ""');
      expect(toml).toContain('developer_instructions = """');
      expect(toml).toContain('# Just a heading');
    });
  });

  describe('getAgentFormat', () => {
    it('returns TOML format for codex', () => {
      expect(getAgentFormat('codex')).toEqual({
        format: 'toml',
        extension: '.toml',
        directory: '.codex/agents',
      });
    });

    it('returns .md extension for copilot', () => {
      expect(getAgentFormat('copilot')).toEqual({
        format: 'md',
        extension: '.md',
        directory: '.github/agents',
      });
    });

    it('returns .md extension for claude', () => {
      expect(getAgentFormat('claude')).toEqual({
        format: 'md',
        extension: '.md',
        directory: '.claude/agents',
      });
    });

    it('returns JSON format for kiro', () => {
      expect(getAgentFormat('kiro')).toEqual({
        format: 'json',
        extension: '.json',
        directory: '.kiro/agents',
      });
    });
  });

  describe('convertAgentMdToKiroJson', () => {
    it('converts markdown with YAML frontmatter to valid Kiro JSON', () => {
      const md = [
        '---',
        'name: plan-creator',
        'description: Creates strategic plans',
        '---',
        '# Instructions',
        '',
        'Do the thing.',
      ].join('\n');

      const parsed = JSON.parse(convertAgentMdToKiroJson(md));
      expect(parsed.name).toBe('plan-creator');
      expect(parsed.description).toBe('Creates strategic plans');
      expect(parsed.prompt).toContain('# Instructions');
    });

    it('uses documented Kiro built-in tool identifiers, not Hermes-style names', () => {
      const md = '---\nname: test\ndescription: d\n---\nBody.';
      const parsed = JSON.parse(convertAgentMdToKiroJson(md));
      // Documented Kiro identifiers must be present
      expect(parsed.tools).toContain('read');
      expect(parsed.tools).toContain('write');
      expect(parsed.tools).toContain('shell');
      // Hermes-style names must not be used
      expect(parsed.tools).not.toContain('read_file');
      expect(parsed.tools).not.toContain('write_file');
    });

    it('omits the model key so Kiro uses its session default', () => {
      const md = '---\nname: test\ndescription: d\n---\nBody.';
      const parsed = JSON.parse(convertAgentMdToKiroJson(md));
      expect(Object.prototype.hasOwnProperty.call(parsed, 'model')).toBe(false);
    });

    it('defaults name and description to empty string when frontmatter is absent', () => {
      const md = '# No frontmatter\n\nJust a body.';
      const parsed = JSON.parse(convertAgentMdToKiroJson(md));
      expect(parsed.name).toBe('');
      expect(parsed.description).toBe('');
    });

    it('produces valid JSON when body contains special characters', () => {
      const md = '---\nname: test\ndescription: d\n---\nUse "quotes" and C:\\paths.';
      expect(() => JSON.parse(convertAgentMdToKiroJson(md))).not.toThrow();
    });
  });
});
