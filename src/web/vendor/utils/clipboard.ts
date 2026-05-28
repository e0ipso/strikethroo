/**
 * Clipboard helper shared across SPA screens.
 *
 * Writes `text` to the system clipboard via the async Clipboard API, silently
 * doing nothing in environments without it (older browsers, insecure contexts,
 * SSR). A single helper keeps the feature-detection in one place so screens
 * never touch `navigator` directly.
 */
export const copyToClipboard = (text: string): void => {
  void navigator.clipboard?.writeText(text);
};
