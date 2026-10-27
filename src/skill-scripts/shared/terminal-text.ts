/**
 * C0 controls other than tab and newline, DEL, and C1 controls. Removing ESC
 * and the 8-bit CSI/OSC introducers leaves any escape sequence as inert text.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;

/**
 * Text safe to print to a terminal. Workspace and profile strings (plan
 * headings, task titles, manifest fields, file names) are untrusted, and raw
 * escape sequences in them can rewrite the screen, retitle the window, or set
 * the clipboard. JSON output does not need this: `JSON.stringify` escapes them.
 */
export const toTerminalText = (text: string): string => text.replace(CONTROL_CHARACTERS, '');
