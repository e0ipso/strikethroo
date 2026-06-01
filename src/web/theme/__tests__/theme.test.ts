import {
  parseTheme,
  resolveTheme,
  persistTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
} from '../theme';

describe('parseTheme', () => {
  it('falls back to system for null/garbage/empty input', () => {
    expect(parseTheme(null)).toBe('system');
    expect(parseTheme('garbage')).toBe('system');
    expect(parseTheme('')).toBe('system');
  });

  it('passes through valid values', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('system')).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('resolves system against the OS preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('ignores the OS preference for explicit choices', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('persistence round-trip', () => {
  it('writes and reads back through localStorage', () => {
    const store = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string): string | null => store.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        store.set(key, value);
      },
    };

    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      value: fakeStorage,
      configurable: true,
      writable: true,
    });

    try {
      persistTheme('dark');
      expect(store.get(THEME_STORAGE_KEY)).toBe('dark');
      expect(readStoredTheme()).toBe('dark');
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      } else {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      }
    }
  });
});
