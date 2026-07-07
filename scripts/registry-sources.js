/**
 * Canonical source-file lists for the SLASHED registry.
 *
 * This is THE single definition. Every script and test that needs to know
 * which files declare tokens or classes must import from here:
 *
 *   scripts/audit.js
 *   scripts/gen-token-reference.js
 *   scripts/gen-class-reference.js
 *   tests/token-api.spec.js
 */

const TOKEN_FILES = [
  'core/tokens.css',
  'core/tokens.layout.css',
  'core/tokens.macros.css',
  'optional/tokens.components.css',
];

const CLASS_FILES = [
  'core/layout.css',
  'core/macros.css',
  'core/states.css',
  'core/accessibility.css',
  'core/motion.css',
  'core/print.css',
  'core/themes.css',
  'optional/forms.css',
  'optional/components.css',
  'optional/theme-example.css',
  'optional/utilities.css',
];

export { TOKEN_FILES, CLASS_FILES };
