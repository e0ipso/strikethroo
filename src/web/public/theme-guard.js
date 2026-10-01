// Pre-paint theme guard: applies `.dark` before first paint so dark-mode users
// see no flash of light. Loaded from index.html as a synchronous classic
// script in <head>, before the module entry. It is a self-hosted file rather
// than an inline block so the Content Security Policy can keep `script-src
// 'self'` with no hash to keep in step with this text (see
// CONTENT_SECURITY_POLICY in src/serve/server.ts). Intentionally duplicates
// the storage key and resolution rule from src/web/theme/theme.ts because it
// runs before any module loads. Static shell code, outside the SPA's
// markdown/DOMPurify sanitization boundary.
(function () {
  try {
    var pref = localStorage.getItem('strikethroo-theme');
    if (pref !== 'light' && pref !== 'dark' && pref !== 'system') pref = 'system';
    var dark =
      pref === 'dark' ||
      (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    /* no-op: never block render on storage/matchMedia errors */
  }
})();
