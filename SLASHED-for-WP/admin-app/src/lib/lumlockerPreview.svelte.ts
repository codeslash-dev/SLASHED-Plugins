/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared toggle for previewing LumLocker (`:root[data-lumlocker]`) on the live
 * canvas. ColorsPanel flips `lumlockerPreview.value`; PreviewPanel reads it
 * inside its override-injection effects and sets/removes the `data-lumlocker`
 * attribute on the iframe root.
 *
 * Kept as a module-level rune store so the toggle doesn't need to be drilled
 * through DomainPanel as a prop.
 */
export const lumlockerPreview = $state({ value: false });
