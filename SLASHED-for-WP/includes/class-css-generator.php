<?php
/**
 * Generates CSS override declarations from saved SLASHED design tokens.
 *
 * Reads the flat 'slashed_overrides' option (a { "--sf-name": "value" } map
 * written by the configurator SPA) and produces a CSS string wrapped in
 * @layer slashed.overrides { :root { ... } } containing only validated,
 * non-empty values. Framework defaults are untouched when no override is set.
 *
 * The wrapper follows the bundle actually served: the flat bundles carry no
 * @layer at all, so against those the overrides must be emitted unlayered —
 * see get_override_css().
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

		if ( self::use_cascade_layer() ) {
			$open   = "@layer slashed.overrides {\n\t:root {\n";
			$indent = "\t\t";
			$close  = "\t}\n}";
		} else {
			$open   = ":root {\n";
			$indent = "\t";
			$close  = '}';
		}

		$css = $open;
		foreach ( $declarations as $declaration ) {
			$css .= $indent . $declaration . "\n";
		}
		$css .= $close;

		/** @filter slashed/override_css The generated token override CSS string. */
		self::$cache = apply_filters( 'slashed/override_css', $css );

		return self::$cache;
	}

	/**
	 * Whether the override block should be wrapped in @layer slashed.overrides.
	 *
	 * The framework's layered bundles declare every token inside
	 * @layer slashed.tokens and reserve slashed.overrides as the last layer, so
	 * wrapping is what lets these declarations win — and keeps them from also
	 * beating the framework's @media-scoped rules (prefers-reduced-motion
	 * clamps, colour-scheme defaults), which an unlayered block would.
	 *
	 * The flat bundles are the same rules with every @layer stripped. Against
	 * those, an unlayered framework declaration beats ANY layered one no matter
	 * the source order, so a wrapped block is silently inert: every token
	 * override — colours, spacing, the modular scales — stops reaching the page.
	 * Emit unlayered in that case, matching the bundle Slashed_CSS_Loader
	 * actually serves.
	 *
	 * Slashed_CSS_Loader is absent when an integration plugin runs standalone
	 * (without slashed.php); it can't serve a flat bundle either, so the
	 * layered wrapper is the correct default there.
	 *
	 * @return bool
	 */
	private static function use_cascade_layer() {
		if ( ! class_exists( 'Slashed_CSS_Loader' ) ) {
			return true;
		}
		return Slashed_CSS_Loader::layers_enabled();
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
			$scale   = (float) $overrides['--sf-radius-scale'];
			$r_steps = array(
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
			// The five fixed per-index stagger delay tokens this used to derive
			// were removed from the framework when .sf-stagger landed. Their
			// replacement, --sf-stagger-step, needs no derivation: core/motion.css
			// multiplies it by --sf-motion-scale itself, so deriving a pre-scaled
			// value here would apply the scale twice.
		}

		return $derived;
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
		if ( ! self::balanced_quotes( $v ) ) {
			return false;
		}
		return self::balanced_parens( $v );
	}

	/**
	 * Verify quote characters are paired. An unterminated string such as
	 * `"Inter` would otherwise be emitted verbatim and swallow every
	 * declaration after it in the same block until the next quote — the
	 * emitter writes one declaration per override, so a single stray quote
	 * could silently void the rest of the user's theme.
	 *
	 * @param string $value Candidate value.
	 * @return bool
	 */
	private static function balanced_quotes( $value ) {
		return 0 === substr_count( $value, '"' ) % 2
			&& 0 === substr_count( $value, "'" ) % 2;
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
	 * expression, an easing, a timeline range, a gradient image, a filter
	 * function, a quoted content string, a font-family list, or a composite
	 * built out of those parts (shadow lists, transition/animation shorthands,
	 * two-value positions), and rejects everything else.
	 *
	 * This is the single gate the flat `{ "--sf-*": value }` override map is
	 * run through (see Slashed_REST_Controller::sanitize_overrides) so that
	 * path can never store a value the strict typed path would refuse. Every
	 * branch first passes through is_css_safe(), so url()/@-rules/comments/
	 * HTML/backslash escapes/unbalanced parens are blocked regardless of type.
	 * The one deliberate exception is valid_quoted_string(), which runs its own
	 * stricter anchored pattern so a CSS unicode escape (`"\2197"`) stays
	 * expressible without opening the backslash door for every other type.
	 *
	 * @param mixed $value Raw value.
	 * @return string|false Trimmed value when valid, false to drop it.
	 */
	public static function validate_override_value( $value ) {
		// One length gate for every type, including the bare-keyword branches
		// that carry no punctuation to bound them.
		if ( ! is_string( $value ) && ! is_int( $value ) && ! is_float( $value ) ) {
			return false;
		}
		if ( strlen( trim( (string) $value ) ) > self::VALUE_MAX_LENGTH ) {
			return false;
		}
		$candidate = self::valid_scalar( $value );
		if ( false !== $candidate ) {
			return $candidate;
		}
		$candidate = self::valid_font_family( $value );
		if ( false !== $candidate ) {
			return $candidate;
		}
		return self::valid_composite( $value );
	}

	/**
	 * Validate a single, indivisible value: the building block every other
	 * branch is made of. Split out of validate_override_value() so
	 * valid_composite() can re-use exactly the same allowlist per component
	 * without recursing into itself.
	 *
	 * @param mixed $value Raw value.
	 * @return string|false
	 */
	private static function valid_scalar( $value ) {
		$branches = array(
			'valid_color',
			'valid_dimension',
			'valid_timing_function',
			'valid_timeline_range',
			'valid_gradient',
			'valid_filter',
			'valid_quoted_string',
		);
		foreach ( $branches as $branch ) {
			$candidate = self::$branch( $value );
			if ( false !== $candidate ) {
				return $candidate;
			}
		}
		return false;
	}

	/**
	 * Maximum accepted length for any single override value, mirroring the
	 * `maxLength` the REST override schema applies (see
	 * Slashed_REST_Controller::register_routes) so the emitter can't be made to
	 * echo an unbounded string written by some other option writer. Sized to
	 * clear the framework's longest shipped token default (the ~535-char
	 * clamp() chains behind --sf-text-display-* and --sf-space-*) with room to
	 * spare, so a user can hand-tune one without it being silently dropped.
	 */
	const VALUE_MAX_LENGTH = 1024;

	/**
	 * Maximum number of components accepted in a composite value. Well above
	 * the longest shipped shorthand (--sf-transition-enter lists five
	 * properties × three parts) while bounding pathological input.
	 */
	const COMPOSITE_MAX_PARTS = 64;

	/**
	 * Validate a composite value: a space- and/or comma-separated list whose
	 * every component is itself an accepted scalar. This is what makes the
	 * framework's non-scalar tokens editable — box-shadow lists
	 * (`0 2px 4px 0 oklch(…)`, `inset 0 2px 4px …`), text-shadows, filter
	 * chains, transition and animation shorthands
	 * (`sf-fade-in var(--sf-duration-normal) var(--sf-ease-out) both`) and
	 * two-value positions (`50% 50%`).
	 *
	 * Safety is inherited rather than re-argued: a component is only accepted
	 * if one of the scalar branches accepts it, and each of those is already
	 * behind is_css_safe(). Splitting is parenthesis-aware, so a nested
	 * `oklch(from var(--x) l c h / clamp(0, calc(…)))` stays one component
	 * instead of being torn into fragments that would each fail.
	 *
	 * @param mixed $value Raw composite input.
	 * @return string|false
	 */
	private static function valid_composite( $value ) {
		$v = trim( (string) $value );
		if ( ! self::is_css_safe( $v ) ) {
			return false;
		}
		if ( strlen( $v ) > self::VALUE_MAX_LENGTH ) {
			return false;
		}
		$parts = self::split_components( $v );
		if ( false === $parts || count( $parts ) < 2 ) {
			return false;
		}
		foreach ( $parts as $part ) {
			if ( false === self::valid_scalar( $part ) ) {
				return false;
			}
		}
		return $v;
	}

	/**
	 * Split a value into components on top-level whitespace and commas,
	 * ignoring any separator nested inside parentheses.
	 *
	 * @param string $value Value known to be is_css_safe().
	 * @return array|false Components, or false when the part cap is exceeded.
	 */
	private static function split_components( $value ) {
		$parts   = array();
		$current = '';
		$depth   = 0;
		$len     = strlen( $value );

		for ( $i = 0; $i < $len; $i++ ) {
			$ch = $value[ $i ];
			if ( '(' === $ch ) {
				++$depth;
			} elseif ( ')' === $ch ) {
				--$depth;
			}
			if ( 0 === $depth && ( ' ' === $ch || "\t" === $ch || "\n" === $ch || "\r" === $ch || ',' === $ch ) ) {
				if ( '' !== $current ) {
					$parts[] = $current;
					$current = '';
					if ( count( $parts ) > self::COMPOSITE_MAX_PARTS ) {
						return false;
					}
				}
				continue;
			}
			$current .= $ch;
		}
		if ( '' !== $current ) {
			$parts[] = $current;
		}

		return count( $parts ) > self::COMPOSITE_MAX_PARTS ? false : $parts;
	}

	/**
	 * Validate a CSS gradient image: linear/radial/conic (and their repeating-
	 * variants), which back the --sf-gradient-* and --sf-scrim-gradient tokens
	 * the Colors panel edits. Values look like
	 * `linear-gradient(in oklch 135deg, var(--sf-color-secondary), oklch(from var(--sf-color-secondary) calc(l - 0.08) c h))`.
	 *
	 * Behind is_css_safe() like every other branch, then held to a restricted
	 * charset: letters, digits, whitespace and only the punctuation gradient
	 * syntax needs. Notably absent are `:` and `!`, so no extra declaration or
	 * `!important` can ride along inside the value.
	 *
	 * @param mixed $value Raw gradient input.
	 * @return string|false
	 */
	private static function valid_gradient( $value ) {
		$v = trim( (string) $value );
		if ( ! self::is_css_safe( $v ) ) {
			return false;
		}
		if ( strlen( $v ) > self::VALUE_MAX_LENGTH ) {
			return false;
		}
		if ( ! preg_match( '/^(repeating-)?(linear|radial|conic)-gradient\s*\(/i', $v ) ) {
			return false;
		}
		if ( ! preg_match( '#^[a-z0-9\s.,%()/_\#*+-]+$#i', $v ) ) {
			return false;
		}
		return $v;
	}

	/**
	 * Validate a single CSS filter function — drop-shadow(), blur(), the colour
	 * adjusters — which back the --sf-drop-shadow-* tokens the Effects panel
	 * edits directly. Same restricted charset as gradients (no `:`, no `!`);
	 * multi-filter chains arrive here one component at a time via
	 * valid_composite().
	 *
	 * @param mixed $value Raw filter input.
	 * @return string|false
	 */
	private static function valid_filter( $value ) {
		$v = trim( (string) $value );
		if ( ! self::is_css_safe( $v ) ) {
			return false;
		}
		if ( strlen( $v ) > self::VALUE_MAX_LENGTH ) {
			return false;
		}
		if ( ! preg_match( '/^(blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|opacity|saturate|sepia)\s*\(/i', $v ) ) {
			return false;
		}
		if ( ! preg_match( '#^[a-z0-9\s.,%()/_\#*+-]+$#i', $v ) ) {
			return false;
		}
		return $v;
	}

	/**
	 * Validate a quoted content string — the `content:` markers behind
	 * --sf-field-required-marker (`" *"`) and --sf-link-external-marker
	 * (`" \2197"`).
	 *
	 * This is the one branch that does NOT sit behind is_css_safe(), because a
	 * CSS unicode escape is exactly the backslash form that guard blocks
	 * wholesale. Instead of loosening the guard for every type, the pattern
	 * here is anchored and closed: one pair of matching quotes, and inside them
	 * only printable characters that are not a quote, a backslash, an angle
	 * bracket or a declaration delimiter — plus well-formed `\<hex>` escapes.
	 * `<` stays banned so a `</style>` can never break out of the inline style
	 * element the override CSS is printed into.
	 *
	 * @param mixed $value Raw string input.
	 * @return string|false
	 */
	private static function valid_quoted_string( $value ) {
		$v = trim( (string) $value );
		if ( '' === $v || strlen( $v ) > self::VALUE_MAX_LENGTH ) {
			return false;
		}
		if ( preg_match( '/[\x00-\x1F\x7F]/', $v ) ) {
			return false;
		}
		$body = '(?:[^"\'\\\\<>{};@]|\\\\[0-9a-f]{1,6}\s?)*';
		if ( preg_match( '/^"' . $body . '"$/i', $v ) || preg_match( "/^'" . $body . "'$/i", $v ) ) {
			return $v;
		}
		return false;
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
		// `+` and `*` are in the set because relative colour syntax carries
		// calc() math — the palette ramps are all
		// `oklch(from var(--x) calc(l + (…) * 0.88) …)`.
		if ( preg_match( '/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|var)\s*\(/i', $v )
			&& preg_match( '#^[a-z0-9\s.,%()/_\#*+-]+$#i', $v ) ) {
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
		// fit-content(), math functions and env() with a restricted charset.
		// env() backs the --sf-safe-* inset knobs.
		if ( preg_match( '/^(fit-content|calc|clamp|min|max|round|var|env)\s*\(/i', $v )
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
