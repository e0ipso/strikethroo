/**
 * Minimal Utils Tests - Critical Business Logic Only
 *
 * Tests only functions with actual business logic that could fail silently
 * or cause data corruption. Skips simple wrappers and obvious functionality.
 */

import { parseAssistants, validateAssistants } from '../utils';
import { Assistant } from '../types';

describe('Critical Utils Business Logic', () => {
  describe('parseAssistants', () => {
    it('should parse and normalize single assistant', () => {
      expect(parseAssistants('claude')).toEqual(['claude']);
      expect(parseAssistants(' CLAUDE ')).toEqual(['claude']);
    });

    it('should parse multiple assistants with normalization', () => {
      expect(parseAssistants('claude,gemini')).toEqual(['claude', 'gemini']);
      expect(parseAssistants(' Claude , GEMINI ')).toEqual(['claude', 'gemini']);
      expect(parseAssistants('claude,gemini,opencode')).toEqual(['claude', 'gemini', 'opencode']);
      expect(parseAssistants(' OPENCODE ')).toEqual(['opencode']);
    });

    it('should remove duplicates and empty entries', () => {
      expect(parseAssistants('claude,claude,gemini')).toEqual(['claude', 'gemini']);
      expect(parseAssistants('claude,,gemini,')).toEqual(['claude', 'gemini']);
    });

    it('should reject empty input', () => {
      expect(() => parseAssistants('')).toThrow('Assistants parameter cannot be empty');
      expect(() => parseAssistants('   ')).toThrow('Assistants parameter cannot be empty');
    });

    it('should reject invalid assistants', () => {
      expect(() => parseAssistants('invalid')).toThrow(
        'Invalid assistant(s): invalid. Valid options are: claude, codex, cursor, gemini, github, opencode'
      );
      expect(() => parseAssistants('claude,invalid,unknown')).toThrow(
        'Invalid assistant(s): invalid, unknown. Valid options are: claude, codex, cursor, gemini, github, opencode'
      );
    });
  });

  describe('validateAssistants', () => {
    it('should accept valid assistants', () => {
      expect(() => validateAssistants(['claude'])).not.toThrow();
      expect(() => validateAssistants(['claude', 'gemini'])).not.toThrow();
      expect(() => validateAssistants(['opencode'])).not.toThrow();
      expect(() => validateAssistants(['claude', 'gemini', 'opencode'])).not.toThrow();
    });

    it('should reject empty array', () => {
      expect(() => validateAssistants([])).toThrow('At least one assistant must be specified');
    });

    it('should reject invalid assistants', () => {
      expect(() => validateAssistants(['invalid' as Assistant])).toThrow(
        'Invalid assistant: invalid. Supported assistants: claude, codex, cursor, gemini, github, opencode'
      );
    });
  });
});
