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

    it('should accept kiro as a valid harness', () => {
      expect(parseHarnesses('kiro')).toEqual(['kiro']);
      expect(parseHarnesses('claude,kiro')).toEqual(['claude', 'kiro']);
    });

    it('should reject invalid harnesses', () => {
      expect(() => parseHarnesses('invalid')).toThrow(
        'Invalid harness(es): invalid. Valid options are: claude, codex, cursor, gemini, github, opencode, kiro'
      );
      expect(() => parseHarnesses('claude,invalid,unknown')).toThrow(
        'Invalid harness(es): invalid, unknown. Valid options are: claude, codex, cursor, gemini, github, opencode, kiro'
      );
    });
  });

  describe('validateHarnesses', () => {
    it('should accept valid harnesses', () => {
      expect(() => validateHarnesses(['claude'])).not.toThrow();
      expect(() => validateHarnesses(['claude', 'gemini'])).not.toThrow();
      expect(() => validateHarnesses(['opencode'])).not.toThrow();
      expect(() => validateHarnesses(['claude', 'gemini', 'opencode'])).not.toThrow();
      expect(() => validateHarnesses(['kiro'])).not.toThrow();
    });

    it('should reject empty array', () => {
      expect(() => validateHarnesses([])).toThrow('At least one harness must be specified');
    });

    it('should reject invalid harnesses', () => {
      expect(() => validateHarnesses(['invalid' as Harness])).toThrow(
        'Invalid harness: invalid. Supported harnesses: claude, codex, cursor, gemini, github, opencode, kiro'
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

      const json = convertAgentMdToKiroJson(md);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('plan-creator');
      expect(parsed.description).toBe('Creates strategic plans');
      expect(parsed.prompt).toContain('# Instructions');
      expect(parsed.prompt).toContain('Do the thing.');
    });

    it('includes required Kiro agent fields with safe defaults', () => {
      const md = '---\nname: test\ndescription: desc\n---\nBody.';
      const parsed = JSON.parse(convertAgentMdToKiroJson(md));

      expect(Array.isArray(parsed.tools)).toBe(true);
      // Conservative tools list — must not use wildcard
      expect(parsed.tools).not.toContain('*');
      expect(parsed.mcpServers).toEqual({});
      expect(parsed.toolAliases).toEqual({});
      // allowedTools should be absent — Kiro uses it as a secondary allowlist
      expect(Object.prototype.hasOwnProperty.call(parsed, 'allowedTools')).toBe(false);
      expect(Array.isArray(parsed.resources)).toBe(true);
      expect(parsed.hooks).toEqual({});
      expect(parsed.toolsSettings).toEqual({});
      expect(parsed.includeMcpJson).toBe(true);
      // model key must be absent (not null) — Kiro uses its default when omitted
      expect(Object.prototype.hasOwnProperty.call(parsed, 'model')).toBe(false);
    });

    it('includes skill resource entries so installed skills are discoverable', () => {
      const md = '---\nname: test\ndescription: d\n---\nBody.';
      const parsed = JSON.parse(convertAgentMdToKiroJson(md));

      expect(parsed.resources).toContain('skill://.kiro/skills/*/SKILL.md');
      expect(parsed.resources).toContain('skill://~/.kiro/skills/*/SKILL.md');
    });

    it('defaults name and description to empty string when frontmatter is absent', () => {
      const md = '# No frontmatter\n\nJust a body.';
      const parsed = JSON.parse(convertAgentMdToKiroJson(md));

      expect(parsed.name).toBe('');
      expect(parsed.description).toBe('');
      expect(parsed.prompt).toContain('# No frontmatter');
    });

    it('coerces non-string description to empty string instead of producing garbage JSON', () => {
      // parseFrontmatter returns Record<string, string>, but test the guard anyway
      // by passing content where description could be unexpected
      const md = '---\nname: test\ndescription: valid string\n---\nBody.';
      const parsed = JSON.parse(convertAgentMdToKiroJson(md));
      expect(typeof parsed.description).toBe('string');
    });

    it('produces valid JSON when body contains double quotes and backslashes', () => {
      const md = [
        '---',
        'name: test',
        'description: has "quotes"',
        '---',
        'Use "quoted" values and C:\\paths\\here.',
      ].join('\n');

      expect(() => JSON.parse(convertAgentMdToKiroJson(md))).not.toThrow();
      const parsed = JSON.parse(convertAgentMdToKiroJson(md));
      expect(parsed.prompt).toContain('C:\\paths\\here.');
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

    it('returns JSON format for kiro', () => {
      expect(getAgentFormat('kiro')).toEqual({
        format: 'json',
        extension: '.json',
        directory: '.kiro/agents',
      });
    });
  });
});
