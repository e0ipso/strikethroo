/**
 * Unit tests for the SPA router's pure path parser.
 *
 * Two pieces of non-trivial logic. First, the `/plans/:id/tasks/:taskId`
 * pattern is ordered ahead of the broader `/plans/:id` one so the longer
 * task-detail path is not swallowed. Second, the decode-once contract. Link
 * construction percent-encodes each segment, so the parser decodes each
 * captured segment exactly once and never lets a `URIError` escape, because it
 * runs inside `useState`'s initializer and on `popstate`. The React hooks and
 * provider are framework wiring and are not retested here.
 */

import { parsePath } from '../router';

describe('parsePath', () => {
  it('resolves /plans/:id/tasks/:taskId to the taskDetail section', () => {
    expect(parsePath('/plans/12/tasks/03')).toEqual({
      section: 'taskDetail',
      params: { id: '12', taskId: '03' },
    });
  });

  it('still resolves /plans/:id to the planDetail section', () => {
    expect(parsePath('/plans/12')).toEqual({
      section: 'planDetail',
      params: { id: '12' },
    });
  });

  it('decodes each captured segment once and keeps an undecodable one raw', () => {
    // `WEIRD HOOK #1+2 50%` as `encodeURIComponent` writes it. One decode pass
    // recovers the file id the Customize detail route matches by equality.
    expect(parsePath('/customize/hooks/WEIRD%20HOOK%20%231%2B2%2050%25')).toEqual({
      section: 'customizeDetail',
      params: { kind: 'hooks', id: 'WEIRD HOOK #1+2 50%' },
    });
    // Exactly once. A literally-encoded `%25` must not become `%` and then feed
    // a second decode pass.
    expect(parsePath('/customize/templates/A%2520B')).toEqual({
      section: 'customizeDetail',
      params: { kind: 'templates', id: 'A%20B' },
    });
    // The plan and task segments go through the same single rule.
    expect(parsePath('/plans/12--a%20b/tasks/03')).toEqual({
      section: 'taskDetail',
      params: { id: '12--a b', taskId: '03' },
    });

    // A malformed sequence yields the raw segment rather than throwing. It
    // matches no file id, so the designed not-found surface renders.
    expect(parsePath('/customize/hooks/%zz')).toEqual({
      section: 'customizeDetail',
      params: { kind: 'hooks', id: '%zz' },
    });
    expect(parsePath('/plans/%e0%a4%a')).toEqual({
      section: 'planDetail',
      params: { id: '%e0%a4%a' },
    });
  });
});
