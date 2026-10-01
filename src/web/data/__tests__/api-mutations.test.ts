/**
 * Unit tests for the SPA's capability-bearing mutation path in `api.ts`.
 *
 * Covers the custom client logic the e2e suites cannot pin down: one shared
 * session bootstrap for concurrent mutations, the single re-bootstrap and retry
 * after a `403` (a restarted server minted a new capability), the caller-facing
 * error semantics when the retry also fails, and that busy answers (`409`,
 * `429`) are never retried. `fetch` is replaced by an in-memory fake server;
 * the module is re-imported per test so its in-memory capability starts empty.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// The real module imports a build-time YAML registry through a Vite plugin
// Vitest does not load; the mutation path never touches it.
vi.mock('../../customize/descriptions', () => ({ descriptionFor: () => undefined }));

type Api = typeof import('../api');

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

/** In-memory stand-in for the serve backend, installed as the global `fetch`. */
const fakeServer = (opts: {
  tokens: string[];
  answer: (call: Call) => { status: number; body?: unknown };
}) => {
  const sessions: number[] = [];
  const mutations: Call[] = [];
  let issued = 0;
  const fetchImpl = vi.fn(
    async (input: string, init: { method?: string; headers?: unknown; body?: unknown } = {}) => {
      if (input === '/api/session') {
        sessions.push(issued);
        const token = opts.tokens[Math.min(issued, opts.tokens.length - 1)];
        issued += 1;
        return new Response(JSON.stringify({ token }), { status: 200 });
      }
      const call: Call = {
        url: input,
        method: init.method ?? 'GET',
        headers: init.headers as Record<string, string>,
        body: init.body,
      };
      mutations.push(call);
      const { status, body } = opts.answer(call);
      return new Response(JSON.stringify(body ?? {}), { status });
    }
  );
  vi.stubGlobal('fetch', fetchImpl);
  return { sessions, mutations };
};

const capabilityOf = (call: Call): string | undefined => call.headers['X-Strikethroo-Capability'];

describe('api.ts mutation capability', () => {
  let api: Api;

  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    api = await import('../api');
  });

  it('shares one bootstrap across concurrent mutations and sends the capability as JSON', async () => {
    const server = fakeServer({ tokens: ['tok-1'], answer: () => ({ status: 200 }) });

    const [, archived, launched] = await Promise.all([
      api.saveConfigFile('hooks', 'PRE_PLAN', 'body'),
      api.archivePlan('12--example'),
      api.launchSelfReview('.ai/strikethroo/plans/12--example/plan-12--example.md'),
    ]);
    expect(archived).toEqual({ ok: true });
    expect(launched.ok).toBe(true);

    // A later mutation reuses the cached capability: still one bootstrap.
    await api.saveConfigFile('templates', 'PLAN_TEMPLATE', 'again');
    expect(server.sessions).toHaveLength(1);

    expect(server.mutations).toHaveLength(4);
    for (const call of server.mutations) {
      expect(capabilityOf(call)).toBe('tok-1');
      expect(call.headers['Content-Type']).toBe('application/json');
    }
    const archive = server.mutations.find(c => c.url.endsWith('/archive'));
    expect(archive).toMatchObject({ method: 'POST', body: '{}' });
    const save = server.mutations.find(c => c.url === '/api/config/hooks/PRE_PLAN');
    expect(save).toMatchObject({ method: 'PUT', body: JSON.stringify({ content: 'body' }) });
  });

  it('re-bootstraps once after a 403 and retries exactly once', async () => {
    // A restarted server only accepts the capability it minted (tok-2).
    const restarted = fakeServer({
      tokens: ['tok-1', 'tok-2'],
      answer: call =>
        capabilityOf(call) === 'tok-2'
          ? { status: 200 }
          : { status: 403, body: { error: 'Forbidden.' } },
    });
    await expect(api.saveConfigFile('hooks', 'PRE_PLAN', 'body')).resolves.toBeUndefined();
    expect(restarted.sessions).toHaveLength(2);
    expect(restarted.mutations.map(capabilityOf)).toEqual(['tok-1', 'tok-2']);

    // A rejection that survives the retry surfaces the server's error once:
    // saveConfigFile throws, the others resolve `{ ok: false, error }`.
    vi.resetModules();
    api = await import('../api');
    const refusing = fakeServer({
      tokens: ['a', 'b', 'c', 'd', 'e', 'f'],
      answer: () => ({ status: 403, body: { error: 'Forbidden.' } }),
    });
    await expect(api.saveConfigFile('hooks', 'PRE_PLAN', 'body')).rejects.toThrow('Forbidden.');
    expect(refusing.mutations).toHaveLength(2);
    await expect(api.archivePlan('12--example')).resolves.toEqual({
      ok: false,
      error: 'Forbidden.',
    });
    expect(refusing.mutations).toHaveLength(4);
    await expect(api.launchSelfReview('p')).resolves.toEqual({ ok: false, error: 'Forbidden.' });
    expect(refusing.mutations).toHaveLength(6);
  });

  it.each([409, 429])('does not retry a %i busy answer', async status => {
    const server = fakeServer({
      tokens: ['tok-1', 'tok-2'],
      answer: () => ({ status, body: { error: 'Busy.' } }),
    });
    await expect(api.launchSelfReview('p')).resolves.toEqual({ ok: false, error: 'Busy.' });
    expect(server.mutations).toHaveLength(1);
    expect(server.sessions).toHaveLength(1);
  });
});
