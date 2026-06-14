/**
 * Length-value parser, formatter and unit-aware bounds table.
 *
 * The TokenEditor's "length" branch wants to render a slider for tokens whose
 * default value is a single numeric+unit pair (e.g. `8px`, `200ms`, `1rem`,
 * `100%`). This module is the boring middle: it pulls the unit + magnitude
 * out of a string, picks sensible slider min/max/step for that unit, and
 * formats a numeric back to a CSS string with the same unit.
 *
 * Pure JS, no DOM, trivially unit-testable.
 */

/** Bounds chosen so the slider feels useful for typical UI ranges, not pixel-perfect. */
const UNIT_BOUNDS = {
  px:   { min: 0,   max: 64,    step: 1     },
  rem:  { min: 0,   max: 8,     step: 0.05  },
  em:   { min: 0,   max: 8,     step: 0.05  },
  ch:   { min: 0,   max: 80,    step: 0.5   },
  ex:   { min: 0,   max: 8,     step: 0.05  },
  '%':  { min: 0,   max: 200,   step: 1     },
  ms:   { min: 0,   max: 2000,  step: 25    },
  s:    { min: 0,   max: 10,    step: 0.05  },
  vh:   { min: 0,   max: 100,   step: 0.5   },
  vw:   { min: 0,   max: 100,   step: 0.5   },
  vmin: { min: 0,   max: 100,   step: 0.5   },
  vmax: { min: 0,   max: 100,   step: 0.5   },
  dvh:  { min: 0,   max: 100,   step: 0.5   },
  dvw:  { min: 0,   max: 100,   step: 0.5   },
  deg:  { min: 0,   max: 360,   step: 1     },
  turn: { min: 0,   max: 1,     step: 0.01  },
  fr:   { min: 0,   max: 12,    step: 0.5   },
};

const LENGTH_RE = /^\s*(-?\d+(?:\.\d+)?|-?\.\d+)\s*([a-zA-Z%]*)\s*$/;

/**
 * Parse a length-like CSS value into `{ number, unit }`.
 * Returns `null` for anything that isn't a single number + (optional) unit —
 * compound values like `clamp(...)` or `calc(...)` should fall back to plain
 * text editing.
 *
 * @param {string|number} input
 * @returns {{ number: number, unit: string } | null}
 */
export function parseLength(input) {
  if (input == null) return null;
  const s = typeof input === 'number' ? String(input) : input;
  const m = LENGTH_RE.exec(s);
  if (!m) return null;
  const number = parseFloat(m[1]);
  if (!Number.isFinite(number)) return null;
  const unit = (m[2] || '').toLowerCase();
  return { number, unit };
}

/**
 * Slider bounds for a unit. Falls back to a permissive numeric range for
 * unitless / unknown units so the slider at least works.
 *
 * @param {string} unit
 * @returns {{ min: number, max: number, step: number }}
 */
export function boundsFor(unit) {
  const u = (unit || '').toLowerCase();
  if (u in UNIT_BOUNDS) return { ...UNIT_BOUNDS[u] };
  return { min: 0, max: 100, step: 0.1 };
}

/**
 * Format a numeric value with its unit, dropping the trailing zeros from a
 * decimal so `1.2000` reads as `1.2`. Unitless values (e.g. line-height) come
 * back as a bare number string.
 *
 * @param {number} number
 * @param {string} [unit]
 * @returns {string}
 */
export function formatLength(number, unit = '') {
  if (!Number.isFinite(number)) return '';
  // Trim trailing zeros after the decimal point but keep at least one digit
  // for whole numbers. parseFloat(...).toString() is a safe shortcut.
  const trimmed = parseFloat(number.toFixed(6));
  return unit ? `${trimmed}${unit}` : `${trimmed}`;
}

/**
 * Clamp a number to the slider's [min, max] range.
 * @param {number} n
 * @param {{min:number,max:number}} bounds
 */
export function clamp(n, bounds) {
  if (n < bounds.min) return bounds.min;
  if (n > bounds.max) return bounds.max;
  return n;
}

/**
 * Number of decimal places implied by the slider step, used so the numeric
 * input mirrors the slider's resolution (no jittery 1.250000001).
 * @param {number} step
 */
export function decimalsFor(step) {
  const s = String(step);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}
