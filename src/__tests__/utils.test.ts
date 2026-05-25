/**
 * Minimal Utils Tests - Critical Business Logic Only
 *
 * Tests only functions with actual business logic that could fail silently
 * or cause data corruption. Skips simple wrappers and obvious functionality.
 */

import { parseHarnesses, validateHarnesses } from '../utils';
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
});
