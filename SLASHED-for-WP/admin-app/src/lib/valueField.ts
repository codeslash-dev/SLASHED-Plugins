/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Value-editing modes shared by the unified value editor (ValueField.svelte).
 *
 * The audit found controls that silently parse a `var()`/`calc()` override down
 * to a fallback number, so the next slider nudge overwrites the expression. The
 * fix is an explicit three-mode model where an expression is always shown *as*
 * an expression and can only become a fixed value through a deliberate switch:
 *
 *   inherit    — no override; the framework default (possibly an alias) is used
 *   value      — a fixed, literal value the user typed
 *   expression — a var()/calc()/clamp()/… expression, shown verbatim
 */
export type ValueMode = "inherit" | "value" | "expression";

const EXPRESSION_RE = /\b(?:var|calc|clamp|min|max|env)\s*\(/;

/** Whether a value is a CSS expression (references/computes other values). */
export function isExpression(value: string | null | undefined): boolean {
  return !!value && EXPRESSION_RE.test(value);
}

/**
 * The mode a given override value belongs to. `undefined` (no override) is
 * inherit; an expression is expression; anything else is a fixed value.
 */
export function detectMode(value: string | undefined): ValueMode {
  if (value === undefined) return "inherit";
  if (isExpression(value)) return "expression";
  return "value";
}

/** Split a numeric CSS value into its number and unit, e.g. "1.5rem" → [1.5,"rem"]. */
export function splitValueUnit(value: string): { num: number | null; unit: string } {
  const m = /^\s*(-?\d*\.?\d+)\s*([a-z%]*)\s*$/i.exec(value ?? "");
  if (!m) return { num: null, unit: "" };
  return { num: parseFloat(m[1]), unit: m[2] ?? "" };
}
