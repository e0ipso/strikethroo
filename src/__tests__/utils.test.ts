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
  getAgentFormat,
  parseFrontmatter,
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
        'Invalid harness(es): invalid. Valid options are: claude, codex, cursor, gemini, github, opencode'
      );
      expect(() => parseHarnesses('claude,invalid,unknown')).toThrow(
        'Invalid harness(es): invalid, unknown. Valid options are: claude, codex, cursor, gemini, github, opencode'
      );
    });
  });

  describe('validateHarnesses', () => {
    it('should accept valid harnesses', () => {
      expect(() => validateHarnesses(['claude'])).not.toThrow();
      expect(() => validateHarnesses(['claude', 'gemini'])).not.toThrow();
      expect(() => validateHarnesses(['opencode'])).not.toThrow();
      expect(() => validateHarnesses(['claude', 'gemini', 'opencode'])).not.toThrow();
    });

    it('should reject empty array', () => {
      expect(() => validateHarnesses([])).toThrow('At least one harness must be specified');
    });

    it('should reject invalid harnesses', () => {
      expect(() => validateHarnesses(['invalid' as Harness])).toThrow(
        'Invalid harness: invalid. Supported harnesses: claude, codex, cursor, gemini, github, opencode'
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

    it('returns .agent.md extension for github', () => {
      expect(getAgentFormat('github')).toEqual({
        format: 'md',
        extension: '.agent.md',
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
  });
});
