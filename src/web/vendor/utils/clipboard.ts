/**
 * Clipboard helper shared across SPA screens.
 *
 * Prefers the async Clipboard API, which is only available in secure contexts
 * (HTTPS or `localhost`). Because `serve` hosts the SPA over plain HTTP, the
 * API is absent when the page is opened via a LAN IP, so we fall back to a
 * hidden-textarea `execCommand('copy')`. A single helper keeps this
 * feature-detection in one place so screens never touch `navigator` directly.
 *
 * Returns a promise that resolves `true` when the copy succeeded.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path (e.g. permission denied).
    }
  }
  return legacyCopy(text);
};

/**
 * Synchronous clipboard write for insecure contexts: stage the text in an
 * off-screen textarea, select it, and ask the browser to copy the selection.
 */
const legacyCopy = (text: string): boolean => {
  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  const selection = document.getSelection();
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  textarea.select();

  let succeeded = false;
  try {
    succeeded = document.execCommand('copy');
  } catch {
    succeeded = false;
  }

  document.body.removeChild(textarea);

  if (previousRange && selection) {
    selection.removeAllRanges();
    selection.addRange(previousRange);
  }

  return succeeded;
};
