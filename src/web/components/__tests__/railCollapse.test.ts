import {
  parseCollapsed,
  persistCollapsed,
  readStoredCollapsed,
  RAIL_STORAGE_KEY,
} from '../railCollapse';

describe('parseCollapsed', () => {
  it('treats only the literal "1" as collapsed', () => {
    expect(parseCollapsed('1')).toBe(true);
  });

  it('falls back to expanded for "0"/null/garbage', () => {
    expect(parseCollapsed('0')).toBe(false);
    expect(parseCollapsed(null)).toBe(false);
    expect(parseCollapsed('true')).toBe(false);
    expect(parseCollapsed('')).toBe(false);
  });
});

describe('persistence round-trip', () => {
  it('writes "1"/"0" and reads back the boolean through localStorage', () => {
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
      persistCollapsed(true);
      expect(store.get(RAIL_STORAGE_KEY)).toBe('1');
      expect(readStoredCollapsed()).toBe(true);

      persistCollapsed(false);
      expect(store.get(RAIL_STORAGE_KEY)).toBe('0');
      expect(readStoredCollapsed()).toBe(false);
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      } else {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      }
    }
  });
});
