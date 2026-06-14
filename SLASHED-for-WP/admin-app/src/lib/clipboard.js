/**
 * Shared clipboard helper — one implementation for the three copy
 * affordances (token rows, the cheatsheet, the output drawer) so feedback
 * timing and failure handling can't drift apart.
 */

/** How long copy feedback ("Copied ✓") stays visible, in ms. */
export const COPY_FEEDBACK_MS = 1400;

/**
 * Write text to the clipboard.
 *
 * @param {string} text
 * @returns {Promise<boolean>} true on success, false when the clipboard is
 *   blocked (permissions, insecure context) — never throws, callers decide
 *   whether a failure deserves a message or a silent no-op.
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
