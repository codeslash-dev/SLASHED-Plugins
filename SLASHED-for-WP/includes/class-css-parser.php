<?php
/**
 * CSS parser that extracts SLASHED inventory data (custom properties and
 * class selectors) from a raw CSS string.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_CSS_Parser
 *
 * Pure parser. Knows nothing about WordPress or where the CSS came from -
 * it accepts a string and returns an inventory:
 *
 *   array(
 *     'variables'  => string[]  // declared --sf-* custom property names
 *     'sf_classes' => string[]  // .sf-* class selectors found in the file
 *     'is_classes' => string[]  // .is-* class selectors found in the file
 *   )
 *
 * The "variables" list only includes properties that are actually declared
 * (left-hand side of a CSS declaration), not arbitrary mentions inside
 * comments or var() calls. This avoids polluting the inventory with
 * documentation strings like "--sf-space-*".
 */
class Slashed_CSS_Parser {

	/**
	 * Parse a CSS string into an inventory of variables and class selectors.
	 *
	 * @param string $css Raw CSS source.
	 * @return array{variables: string[], sf_classes: string[], is_classes: string[], color_values: array}
	 */
	public static function parse( $css ) {
		if ( ! is_string( $css ) || '' === $css ) {
			return self::empty_inventory();
		}

		// Strip /* ... */ block comments first so documentation strings
		// like "--sf-space-*" don't bleed into the inventory.
		$stripped = preg_replace( '#/\*[\s\S]*?\*/#', '', $css );
		if ( null === $stripped ) {
			$stripped = $css;
		}

		return array(
			'variables'    => self::extract_declared_variables( $stripped ),
			'sf_classes'   => self::extract_class_names( $stripped, 'sf-' ),
			'is_classes'   => self::extract_class_names( $stripped, 'is-' ),
			'color_values' => self::extract_color_variable_values( $stripped ),
		);
	}

	/**
	 * Extract custom property names that are declared (LHS of a colon) or
	 * registered via @property.
	 *
	 * Matches patterns like "--sf-color-primary:", "  --sf-space-m :" but
	 * not bare mentions like "see --sf-color-*" inside comments (already
	 * stripped) or "var(--sf-color-primary)" usages.
	 *
	 * Also matches "@property --sf-color-primary-light { … }" because those
	 * tokens are defined exclusively via @property (no separate :root
	 * declaration) and would be missed by the colon-only regex.
	 *
	 * @param string $css CSS with comments removed.
	 * @return string[] Sorted unique list of declared property names.
	 */
	private static function extract_declared_variables( $css ) {
		$names = array();

		// Standard declarations: --sf-name: value;
		$matches = array();
		if ( preg_match_all( '/(--sf-[a-zA-Z0-9_-]+)\s*:/', $css, $matches ) ) {
			foreach ( $matches[1] as $name ) {
				$names[] = $name;
			}
		}

		// @property registrations: @property --sf-name { … }
		$prop_matches = array();
		if ( preg_match_all( '/@property\s+(--sf-[a-zA-Z0-9_-]+)/', $css, $prop_matches ) ) {
			foreach ( $prop_matches[1] as $name ) {
				$names[] = $name;
			}
		}

		$names = array_values( array_unique( $names ) );
		// Natural sort so numeric shade suffixes order as humans expect:
		// --sf-color-primary-50 before -500, space-2 before space-10, etc.
		// SORT_FLAG_CASE keeps alpha-suffix tokens (a5, a10, A20) consistent.
		sort( $names, SORT_NATURAL | SORT_FLAG_CASE );
		return $names;
	}

	/**
	 * Extract class selectors with the given prefix.
	 *
	 * Matches ".sf-something" or ".is-something" anywhere in the CSS.
	 * The prefix should include the trailing dash, e.g. "sf-" or "is-".
	 *
	 * @param string $css    CSS with comments removed.
	 * @param string $prefix Class prefix without the leading dot.
	 * @return string[] Sorted unique list of class names (without leading dot).
	 */
	private static function extract_class_names( $css, $prefix ) {
		$pattern = '/\.(' . preg_quote( $prefix, '/' ) . '[a-zA-Z0-9_-]+)/';
		$matches = array();
		if ( ! preg_match_all( $pattern, $css, $matches ) ) {
			return array();
		}

		$names = array_values( array_unique( $matches[1] ) );
		// Natural sort matches the variable order so .sf-stack-2 lands
		// before .sf-stack-10, etc. See extract_declared_variables().
		sort( $names, SORT_NATURAL | SORT_FLAG_CASE );
		return $names;
	}

	/**
	 * Return an empty inventory shape. Helps callers avoid undefined keys.
	 *
	 * @return array{variables: string[], sf_classes: string[], is_classes: string[], color_values: array}
	 */
	public static function empty_inventory() {
		return array(
			'variables'    => array(),
			'sf_classes'   => array(),
			'is_classes'   => array(),
			'color_values' => array(),
		);
	}

	/**
	 * Extract --sf-color-* variable names and their declared values.
	 *
	 * Captures both regular declarations (--sf-color-X: value;) and
	 * @property initial-value declarations. Returns an associative array
	 * mapping variable names to their raw declared values.
	 *
	 * @param string $css CSS with comments removed.
	 * @return array<string, string> Map of variable name to declared value.
	 */
	private static function extract_color_variable_values( $css ) {
		$values = array();

		// Match @property declarations with initial-value.
		// e.g. @property --sf-color-primary-light { ... initial-value: oklch(0.45 0.20 264); }
		if ( preg_match_all(
			'/@property\s+(--sf-color-[a-zA-Z0-9_-]+)\s*\{[^}]*initial-value:\s*([^;]+);/i',
			$css,
			$matches,
			PREG_SET_ORDER
		) ) {
			foreach ( $matches as $match ) {
				$values[ trim( $match[1] ) ] = trim( $match[2] );
			}
		}

		// Match regular declarations: --sf-color-X: value;
		if ( preg_match_all(
			'/(--sf-color-[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/',
			$css,
			$matches,
			PREG_SET_ORDER
		) ) {
			foreach ( $matches as $match ) {
				$name  = trim( $match[1] );
				$value = trim( $match[2] );
				// Don't overwrite @property initial-values with regular declarations
				// unless we don't already have a value.
				if ( ! isset( $values[ $name ] ) ) {
					$values[ $name ] = $value;
				}
			}
		}

		return $values;
	}
}
