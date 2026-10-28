/**
 * End-to-end check that the SPA works behind a TLS-terminating reverse proxy
 * configured with `--public-url`.
 *
 * A Node HTTPS proxy with a throwaway self-signed certificate forwards to the
 * loopback server, keeping the browser's `Host`, the way Tugboat-style preview
 * platforms do. Chromium resolves the public hostname to loopback, so the page
 * runs on `https://viewer.example.test:<proxy port>` and every request carries
 * that Host and Origin. The suite covers the plans list, the `/api/events`
 * live stream, and the session-token mutation flow.
 *
 * Skips when the SPA is not built or `openssl` is unavailable to mint the
 * certificate.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { AddressInfo } from 'net';
import { execFileSync } from 'child_process';
import { test, expect } from '@playwright/test';
import { startServer, ServeHandle } from '../serve/server';

const FIXTURE_ROOT = path.resolve(process.cwd(), 'src', '__tests__', 'fixtures', 'serve-workspace');
const ASSETS_DIR = path.resolve(process.cwd(), 'dist-web');
const PUBLIC_HOST = 'viewer.example.test';

const assetsBuilt = fs.existsSync(path.join(ASSETS_DIR, 'index.html'));

/** Mints a one-day self-signed key pair, or `null` when openssl is missing. */
const selfSignedCert = (dir: string): { key: Buffer; cert: Buffer } | null => {
  const keyFile = path.join(dir, 'key.pem');
  const certFile = path.join(dir, 'cert.pem');
  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-days',
        '1',
        '-subj',
        `/CN=${PUBLIC_HOST}`,
        '-keyout',
        keyFile,
        '-out',
        certFile,
      ],
      { stdio: 'ignore' }
    );
  } catch {
    return null;
  }
  return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
};

const closeServer = async (server: http.Server): Promise<void> => {
  const done = new Promise<void>(resolve => server.close(() => resolve()));
  server.closeAllConnections();
  await done;
};

// Launch options force a dedicated worker, so they must be file-level.
test.use({
  ignoreHTTPSErrors: true,
  launchOptions: { args: [`--host-resolver-rules=MAP ${PUBLIC_HOST} 127.0.0.1`] },
});

test.describe('Public URL behind a TLS-terminating proxy (Playwright)', () => {
  test.skip(!assetsBuilt, 'dist-web not built');

  let tmp: string;
  let root: string;
  let handle: ServeHandle | undefined;
  let proxy: https.Server | undefined;
  let publicUrl: string;

  test.beforeAll(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-public-url-'));
    root = path.join(tmp, 'workspace');
    fs.cpSync(FIXTURE_ROOT, root, { recursive: true });
    const tls = selfSignedCert(tmp);
    test.skip(!tls, 'openssl unavailable');

    // The proxy listens first so the server can be told the public port.
    proxy = https.createServer(tls!, (req, res) => {
      const upstream = handle!.server.address() as AddressInfo;
      const forward = http.request(
        {
          host: upstream.address,
          port: upstream.port,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        reply => {
          res.writeHead(reply.statusCode ?? 502, reply.headers);
          reply.pipe(res);
        }
      );
      forward.on('error', () => res.destroy());
      req.pipe(forward);
    });
    await new Promise<void>(resolve => proxy!.listen(0, '127.0.0.1', () => resolve()));
    publicUrl = `https://${PUBLIC_HOST}:${(proxy.address() as AddressInfo).port}`;

    handle = await startServer({
      root,
      port: 0,
      open: false,
      assetsDir: ASSETS_DIR,
      debounceMs: 80,
      publicUrls: [publicUrl],
    });
  });

  test.afterAll(async () => {
    if (proxy) await closeServer(proxy);
    if (handle) await closeServer(handle.server);
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('loads the SPA, receives live updates, and completes a mutation', async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await page.goto(publicUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('complementary').waitFor();
    // Let the shared EventSource open before changing the workspace.
    await expect.poll(() => handle!.events.clientCount).toBe(1);

    const planDir = path.join(root, 'plans', '971--zzproxyprobe');
    fs.mkdirSync(path.join(planDir, 'tasks'), { recursive: true });
    fs.writeFileSync(
      path.join(planDir, 'plan-971--zzproxyprobe.md'),
      '---\nid: 971\nsummary: "Proxy probe"\ncreated: "2026-05-29"\n---\n\n# zzproxyprobe\n'
    );
    await expect(page.getByText('Zzproxyprobe')).toBeVisible({ timeout: 5_000 });

    // The browser sends `Origin: <publicUrl>` on the PUT; the server must accept it.
    const status = await page.evaluate(async () => {
      const session = await fetch('/api/session', { cache: 'no-store' });
      const { token } = (await session.json()) as { token: string };
      const res = await fetch('/api/config/hooks/PRE_PLAN', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Strikethroo-Capability': token },
        body: JSON.stringify({ content: '# PRE_PLAN\n\nWritten through the proxy.\n' }),
      });
      return res.status;
    });
    expect(status).toBe(200);
    expect(fs.readFileSync(path.join(root, 'config', 'hooks', 'PRE_PLAN.md'), 'utf8')).toContain(
      'Written through the proxy.'
    );
  });
});
