<?php
/**
 * Generates CSS override declarations from saved SLASHED design tokens.
 *
 * Reads the flat 'slashed_overrides' option (a { "--sf-name": "value" } map
 * written by the configurator SPA) and produces a CSS string wrapped in
 * @layer slashed.overrides { :root { ... } } containing only validated,
 * non-empty values. Framework defaults are untouched when no override is set.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_CSS_Generator
 */
class Slashed_CSS_Generator {

	/** @var string|null */
	private static $cache = null;

	/**
	 * Check whether any token overrides exist.
	 *
	 * @return bool
	 */
	public static function has_overrides() {
		// Apply the same key filter as generate_flat_override_declarations() so
		// has_overrides() and the emitter always agree on what counts.
		foreach ( Slashed_Token_Store::get_overrides() as $name => $value ) {
			if ( ! is_string( $name ) || ! preg_match( '/^--sf-[a-z0-9-]+$/', $name ) ) {
				continue;
			}
			// Only count values the emitter would actually keep, so has_overrides()
			// can't claim true for a stored value validate_override_value() drops.
			if ( false !== self::validate_override_value( $value ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Get the full override CSS string.
	 *
	 * @return string CSS output, or empty string when no overrides are set.
	 */
	public static function get_override_css() {
		if ( null !== self::$cache ) {
			return self::$cache;
		}

		$declarations = self::generate_flat_override_declarations();

		if ( empty( $declarations ) ) {
			self::$cache = '';
			return self::$cache;
		}

		$css = "@layer slashed.overrides {\n\t:root {\n";
		foreach ( $declarations as $declaration ) {
			$css .= "\t\t" . $declaration . "\n";
		}
		$css .= "\t}\n}";

		/** @filter slashed/override_css The generated token override CSS string. */
		self::$cache = apply_filters( 'slashed/override_css', $css );

		return self::$cache;
	}

	/**
	 * Build declarations from the flat { "--name": "value" } override map the
	 * in-WordPress configurator saves via POST /tokens/overrides.
	 *
	 * Every entry is re-validated here with the same name + value allowlist the
	 * save path enforces (validate_override_value(), itself behind
	 * is_css_safe()). Validating again at emission — not just at save — means
	 * data written before that hardening, or by any other future writer of the
	 * option, still cannot emit an unsafe declaration. Names are restricted to a
	 * custom-property identifier so nothing else can become a property.
	 *
	 * @return string[] CSS declaration strings ("--name: value;").
	 */
	private static function generate_flat_override_declarations() {
		$overrides    = Slashed_Token_Store::get_overrides();
		$derived      = self::compute_derived_overrides( $overrides );
		$merged       = array_merge( $derived, $overrides );
		$declarations = array();
		foreach ( $merged as $name => $value ) {
			if ( ! is_string( $name ) || ! preg_match( '/^--sf-[a-z0-9-]+$/', $name ) ) {
				continue;
			}
			$clean = self::validate_override_value( $value );
			if ( false === $clean ) {
				continue;
			}
			$declarations[] = $name . ': ' . $clean . ';';
		}
		return $declarations;
	}


	/**
	 * Compute concrete output tokens for high-level scale knobs.
	 *
	 * These declarations are emitted before the user's explicit overrides so a
	 * fine-tuned token such as --sf-radius-m still wins over --sf-radius-scale.
	 * They make scale knobs robust when older saved CSS, builder CSS, or inline
	 * declarations already contain concrete output-token values.
	 *
	 * @param array $overrides Stored override map.
	 * @return array Derived override map.
	 */
	private static function compute_derived_overrides( $overrides ) {
		$derived = array();

		if ( array_key_exists( '--sf-radius-scale', $overrides ) && is_numeric( $overrides['--sf-radius-scale'] ) ) {
			$scale    = (float) $overrides['--sf-radius-scale'];
			$r_steps  = array(
				'2xs' => 1,
				'xs'  => 2,
				's'   => 4,
				'm'   => 8,
				'l'   => 12,
				'xl'  => 16,
				'2xl' => 24,
				'3xl' => 32,
				'4xl' => 48,
			);
			foreach ( $r_steps as $step => $base ) {
				$derived[ '--sf-radius-' . $step ] = self::fmt_num( $base * $scale ) . 'px';
			}
			$derived['--sf-radius-none']  = '0';
			$derived['--sf-radius-full']  = '9999px';
			$derived['--sf-radius-pill']  = 'var(--sf-radius-full)';
			$derived['--sf-radius-outer'] = 'calc(var(--sf-radius-m) + var(--sf-component-pad))';
		}

		if ( array_key_exists( '--sf-border-scale', $overrides ) && is_numeric( $overrides['--sf-border-scale'] ) ) {
			$scale   = (float) $overrides['--sf-border-scale'];
			$b_steps = array(
				'1' => 1,
				'2' => 2,
				'3' => 3,
				'4' => 4,
			);
			foreach ( $b_steps as $step => $base ) {
				$derived[ '--sf-border-width-' . $step ] = self::fmt_num( $base * $scale ) . 'px';
			}
		}

		if ( array_key_exists( '--sf-motion-scale', $overrides ) && is_numeric( $overrides['--sf-motion-scale'] ) ) {
			$scale   = (float) $overrides['--sf-motion-scale'];
			$m_steps = array(
				'instant' => 100,
				'fast'    => 150,
				'normal'  => 250,
				'slow'    => 400,
				'slower'  => 600,
			);
			foreach ( $m_steps as $step => $base ) {
				$derived[ '--sf-duration-' . $step ] = self::fmt_num( $base * $scale ) . 'ms';
			}
			$derived['--sf-duration-none']             = '0ms';
			$derived['--sf-theme-transition-duration'] = self::fmt_num( 300 * $scale ) . 'ms';
			for ( $i = 1; $i <= 5; $i++ ) {
				$derived[ '--sf-animation-delay-' . $i ] = self::fmt_num( 75 * $i * $scale ) . 'ms';
			}
		}

		return $derived;
	}

	/** @param mixed $value Raw number-ish value. */
	private static function num_or_default( $value, $default ) {
		return is_numeric( $value ) ? (float) $value : $default;
	}

	private static function fmt_num( $num ) {
		$out = rtrim( rtrim( sprintf( '%.6F', $num ), '0' ), '.' );
		return '' === $out || '-' === $out ? '0' : $out;
	}

	/**
	 * Defence-in-depth guard: reject values that have no business inside a
	 * token value, regardless of type. Blocks url()/image-set() (external
	 * fetch + referrer leak), at-rules, CSS comments, HTML, backslash escapes
	 * (which could smuggle a stripped delimiter such as `}` back in via `\7d`),
	 * and control characters.
	 *
	 * @param string $value Candidate value.
	 * @return bool True when safe to emit.
	 */
	private static function is_css_safe( $value ) {
		$v = (string) $value;
		if ( '' === $v ) {
			return false;
		}
		if ( preg_match( '/[\x00-\x1F\x7F]/', $v ) ) {
			return false;
		}
		if ( preg_match( '#[{};]|url\s*\(|image-set\s*\(|@|/\*|\*/|</|\\\\#i', $v ) ) {
			return false;
		}
		return self::balanced_parens( $v );
	}

	/**
	 * Verify parentheses are balanced and never close below zero — stops a
	 * value like `1) ; } html{` from prematurely closing a function context.
	 *
	 * @param string $value Candidate value.
	 * @return bool
	 */
	private static function balanced_parens( $value ) {
		$depth = 0;
		$len   = strlen( $value );
		for ( $i = 0; $i < $len; $i++ ) {
			$ch = $value[ $i ];
			if ( '(' === $ch ) {
				++$depth;
			} elseif ( ')' === $ch ) {
				--$depth;
				if ( $depth < 0 ) {
					return false;
				}
			}
		}
		return 0 === $depth;
	}

	/**
	 * Validate an arbitrary token value for safe emission into a CSS
	 * declaration. Accepts a colour, a dimension / number / ratio / math
	 * expression, or a font-family list, and rejects everything else.
	 *
	 * This is the single gate the flat `{ "--sf-*": value }` override map is
	 * run through (see Slashed_REST_Controller::sanitize_overrides) so that
	 * path can never store a value the strict typed path would refuse. Every
	 * branch first passes through is_css_safe(), so url()/@-rules/comments/
	 * HTML/backslash escapes/unbalanced parens are blocked regardless of type.
	 *
	 * @param mixed $value Raw value.
	 * @return string|false Trimmed value when valid, false to drop it.
	 */
	public static function validate_override_value( $value ) {
		$candidate = self::valid_color( $value );
		if ( false !== $candidate ) {
			return $candidate;
		}
		$candidate = self::valid_dimension( $value );
		if ( false !== $candidate ) {
			return $candidate;
		}
		$candidate = self::valid_timing_function( $value );
		if ( false !== $candidate ) {
			return $candidate;
		}
		$candidate = self::valid_timeline_range( $value );
		if ( false !== $candidate ) {
			return $candidate;
		}
		return self::valid_font_family( $value );
	}

	/**
	 * Validate a CSS easing / timing function: a keyword (linear, ease-in-out,
	 * step-start, …) or a cubic-bezier()/linear()/steps() function. These back
	 * the motion panel's --sf-ease-* tokens, which the flat override map saves
	 * as values such as `cubic-bezier(0.25, 0, 0.15, 1)` or `linear(0, 0.5, 1)`.
	 *
	 * @param mixed $value Raw timing-function input.
	 * @return string|false
	 */
	private static function valid_timing_function( $value ) {
		$v = trim( (string) $value );
		if ( ! self::is_css_safe( $v ) ) {
			return false;
		}
		// Keyword easings.
		if ( preg_match( '/^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end)$/i', $v ) ) {
			return $v;
		}
		// Functional easings with a restricted charset (digits, units, the
		// punctuation cubic-bezier()/linear()/steps() use).
		if ( preg_match( '/^(cubic-bezier|linear|steps)\s*\(/i', $v )
			&& preg_match( '#^[a-z0-9\s.,%()+-]+$#i', $v ) ) {
			return $v;
		}
		return false;
	}

	/**
	 * Validate a scroll-timeline animation-range value: a named range phase
	 * (entry, exit, cover, contain, normal) with an optional offset such as
	 * `entry 0%` or `cover 30%`. Backs the motion panel's
	 * --sf-scroll-timeline-range-* tokens.
	 *
	 * @param mixed $value Raw timeline-range input.
	 * @return string|false
	 */
	private static function valid_timeline_range( $value ) {
		$v = trim( (string) $value );
		if ( ! self::is_css_safe( $v ) ) {
			return false;
		}
		if ( preg_match( '/^(normal|entry|exit|cover|contain)(\s+-?(\d+\.?\d*|\.\d+)(%|px|rem|em|vh|vw)?)?$/i', $v ) ) {
			return $v;
		}
		return false;
	}

	/**
	 * Validate a CSS color value: hex, named keyword, a known colour function,
	 * or a var()/color-mix()/light-dark() reference. Returns the trimmed value
	 * when valid, or false to skip emission (framework default then applies).
	 *
	 * @param mixed $value Raw color input.
	 * @return string|false
	 */
	private static function valid_color( $value ) {
		$v = trim( (string) $value );
		if ( ! self::is_css_safe( $v ) ) {
			return false;
		}
		// Hex literal.
		if ( preg_match( '/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $v ) ) {
			return $v;
		}
		// Functional notation: rgb/hsl/hwb/lab/lch/oklab/oklch/color/color-mix/
		// light-dark/var. Restrict the body to a safe charset (digits, units,
		// punctuation used by colour syntax) so nothing unexpected slips in.
		if ( preg_match( '/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|var)\s*\(/i', $v )
			&& preg_match( '#^[a-z0-9\s.,%()/_\#-]+$#i', $v ) ) {
			return $v;
		}
		// Bare keyword: named colour, currentColor, transparent, inherit, etc.
		if ( preg_match( '/^[a-z][a-z0-9-]*$/i', $v ) ) {
			return $v;
		}
		return false;
	}

	/**
	 * Validate a CSS dimension / length / ratio: a number with optional unit,
	 * an aspect ratio (`16 / 9`), or a calc()/clamp()/min()/max()/var()
	 * expression. Returns the trimmed value when valid, false otherwise.
	 *
	 * @param mixed $value Raw dimension input.
	 * @return string|false
	 */
	private static function valid_dimension( $value ) {
		$v = trim( (string) $value );
		if ( ! self::is_css_safe( $v ) ) {
			return false;
		}
		// Intrinsic sizing keywords.
		if ( preg_match( '/^(auto|min-content|max-content|available|stretch)$/i', $v ) ) {
			return $v;
		}
		$units = 'px|rem|em|%|vw|vh|vmin|vmax|vi|vb|ch|ex|fr|deg|s|ms|dvh|svh|lvh|dvw|svw|lvw|cqi|cqb|cqw|cqh';
		if ( preg_match( '/^-?(\d+\.?\d*|\.\d+)(' . $units . ')?$/i', $v ) ) {
			return $v;
		}
		// Aspect ratio, e.g. "16 / 9".
		if ( preg_match( '#^\d+(\.\d+)?\s*/\s*\d+(\.\d+)?$#', $v ) ) {
			return $v;
		}
		// fit-content() and math functions with a restricted charset.
		if ( preg_match( '/^(fit-content|calc|clamp|min|max|var)\s*\(/i', $v )
			&& preg_match( '#^[a-z0-9\s.,%()/_*+-]+$#i', $v ) ) {
			return $v;
		}
		return false;
	}

	/**
	 * Validate a font-family value: a list of family names (letters, digits,
	 * spaces, hyphens, commas, quotes) or a single var() reference. Returns the
	 * trimmed value when valid, false otherwise.
	 *
	 * @param mixed $value Raw font input.
	 * @return string|false
	 */
	private static function valid_font_family( $value ) {
		$v = trim( (string) $value );
		if ( ! self::is_css_safe( $v ) ) {
			return false;
		}
		// var() with optional fallback — require a complete, closed expression so a
		// trailing "; color:red" cannot sneak through a prefix-only match.
		if ( preg_match( '/^var\s*\(\s*--[a-z0-9-]+(?:\s*,\s*[a-z0-9 ,"\'()-]+)?\s*\)$/i', $v ) ) {
			return $v;
		}
		if ( preg_match( '/^[a-z0-9 ,"\'-]+$/i', $v ) ) {
			return $v;
		}
		return false;
	}
}
