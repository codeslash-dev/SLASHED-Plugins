<?php
/**
 * Color resolver: computes hex fallback values for SLASHED color swatches.
 *
 * Converts oklch() source colors to hex approximations and computes the
 * full color scale (50-950, alpha steps, semantic aliases) for each family.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Color_Resolver
 *
 * Pure resolver. Accepts parsed color_values from the CSS parser and returns
 * a flat map of --sf-color-* variable names to hex color strings suitable
 * for the Bricks color picker swatch preview.
 *
 * Note: The hex values produced here are intentional approximations for the
 * builder panel swatch preview, not pixel-perfect replicas of browser-rendered
 * color-mix(). The oklch-to-hex conversion is accurate, but the scale mixing
 * uses a simplified linear interpolation in sRGB gamma space rather than the
 * perceptually uniform OKLab space that CSS color-mix() uses. This trade-off
 * keeps the implementation dependency-free and fast while providing visually
 * adequate swatches for the color picker UI.
 */
class Slashed_Color_Resolver {

	/**
	 * Default oklch source value per family — used only as a fallback when the
	 * live CSS bundle can't be parsed. Derived from Slashed_Token_Defaults so
	 * there is a single source of truth shared with the admin token defaults;
	 * the hardcoded map below is a last-resort safety net if that class is
	 * unavailable (it should always be loaded in both unified and standalone
	 * mode).
	 *
	 * @var array<string, string>|null
	 */
	private static $default_sources_cache = null;

	/**
	 * Resolve the default oklch source map (family => oklch string).
	 *
	 * @return array<string, string>
	 */
	private static function default_sources() {
		if ( null !== self::$default_sources_cache ) {
			return self::$default_sources_cache;
		}

		$sources = array();
		if ( class_exists( 'Slashed_Token_Defaults' ) ) {
			$colors = Slashed_Token_Defaults::get_colors();
			foreach ( array( 'brand', 'status' ) as $group ) {
				if ( empty( $colors[ $group ] ) || ! is_array( $colors[ $group ] ) ) {
					continue;
				}
				foreach ( $colors[ $group ] as $family => $oklch ) {
					if ( is_string( $oklch ) && '' !== $oklch ) {
						$sources[ $family ] = $oklch;
					}
				}
			}
		}

		if ( empty( $sources ) ) {
			$sources = array(
				'primary'   => 'oklch(0.47 0.27 264)',
				'secondary' => 'oklch(0.22 0.04 264)',
				'tertiary'  => 'oklch(0.42 0.22 295)',
				'action'    => 'oklch(0.50 0.22 235)',
				'neutral'   => 'oklch(0.52 0.025 260)',
				'base'      => 'oklch(0.96 0.006 250)',
				'success'   => 'oklch(0.50 0.16 145)',
				'warning'   => 'oklch(0.75 0.17 80)',
				'error'     => 'oklch(0.50 0.20 25)',
				'info'      => 'oklch(0.48 0.18 235)',
				'danger'    => 'oklch(0.48 0.22 12)',
			);
		}

		self::$default_sources_cache = $sources;
		return $sources;
	}

	/**
	 * Light step percentages: step => mix percentage of base color with --sf-color-surface.
	 *
	 * @var array<int, float>
	 */
	private static $light_steps = array(
		50  => 0.04,
		100 => 0.08,
		200 => 0.20,
		300 => 0.40,
		400 => 0.65,
	);

	/**
	 * Dark step percentages: step => mix percentage of base color with text color.
	 *
	 * @var array<int, float>
	 */
	private static $dark_steps = array(
		600 => 0.82,
		700 => 0.62,
		800 => 0.38,
		900 => 0.18,
		950 => 0.08,
	);

	/**
	 * Alpha step percentages.
	 *
	 * @var array<string, float>
	 */
	private static $alpha_steps = array(
		'a5'  => 0.05,
		'a10' => 0.10,
		'a20' => 0.20,
		'a30' => 0.30,
		'a40' => 0.40,
		'a50' => 0.50,
		'a60' => 0.60,
		'a70' => 0.70,
		'a80' => 0.80,
		'a90' => 0.90,
		'a95' => 0.95,
	);

	/**
	 * Semantic alias mappings: alias => target step.
	 *
	 * @var array<string, string>
	 */
	private static $semantic_aliases = array(
		'superlight' => '50',
		'xlight'     => '200',
		'lighter'    => '400',
		'darker'     => '600',
		'xdark'      => '800',
		'superdark'  => '950',
		'hover'      => '600',
		'active'     => '800',
		'subtle'     => 'a10',
		'muted'      => 'a30',
		'ghost'      => 'a5',
	);

	/**
	 * Resolve color values into a LIGHT-mode hex map for all --sf-color-* variables.
	 *
	 * @param array $color_values Associative array from the CSS parser.
	 * @return array<string, string> Map of variable name to hex string.
	 */
	public static function resolve( $color_values ) {
		$sources = self::resolve_sources( $color_values );

		// Light-mode family scales composite alpha steps over white.
		$hex_map = self::build_family_scales( $sources, array( 255, 255, 255 ) );

		// Semantic tokens with reasonable light-mode defaults.
		$hex_map = self::resolve_semantic_tokens( $hex_map, $sources );

		return $hex_map;
	}

	/**
	 * Resolve color values into a DARK-mode hex map for all --sf-color-* variables.
	 *
	 * Mirrors the framework's dark auto-derivation (core/tokens.css): each
	 * family's dark source is lightened from its light source via
	 * clamp(0.65, 0.95 - l*0.5, 0.88) (surface inverts via clamp(0.16, 1.18 - l, 0.24)),
	 * then the same scale/alpha/alias machinery runs on the dark sources.
	 * Semantic tokens use the direction-flipped dark formulas. Alpha steps
	 * composite over the dark surface rather than white.
	 *
	 * Like resolve(), the output is an intentional approximation for builder
	 * swatch previews, not a pixel-perfect replica of browser-rendered
	 * light-dark() / relative-color output.
	 *
	 * @param array $color_values Associative array from the CSS parser.
	 * @return array<string, string> Map of variable name to hex string.
	 */
	public static function resolve_dark( $color_values ) {
		$light_sources = self::resolve_sources( $color_values );
		$dark_sources  = self::derive_dark_sources( $light_sources, $color_values );

		// Alpha swatches composite over the dark surface, not white, so
		// translucent tokens read the way they do on a dark page.
		$base_dark_hex = isset( $dark_sources['base'] )
			? self::oklch_to_hex( $dark_sources['base'][0], $dark_sources['base'][1], $dark_sources['base'][2] )
			: '#1a1b1e';

		$hex_map = self::build_family_scales( $dark_sources, self::hex_to_rgb( $base_dark_hex ) );
		$hex_map = self::resolve_semantic_tokens_dark( $hex_map, $dark_sources, $light_sources );

		return $hex_map;
	}

	/**
	 * Build the per-family scale/alpha/alias hex map from resolved sources.
	 *
	 * Shared by both the light and dark resolvers — only the source oklch
	 * values and the alpha-compositing backdrop differ between modes.
	 *
	 * @param array $sources      Family => [L, C, H].
	 * @param array $backdrop_rgb [r, g, b] the alpha steps composite over.
	 * @return array<string, string>
	 */
	private static function build_family_scales( $sources, $backdrop_rgb ) {
		$hex_map = array();

		foreach ( array_keys( self::default_sources() ) as $family ) {
			if ( ! isset( $sources[ $family ] ) ) {
				continue;
			}

			$oklch      = $sources[ $family ];
			$family_hex = self::oklch_to_hex( $oklch[0], $oklch[1], $oklch[2] );

			// The base (500 step) is the direct conversion.
			// -light is the same source color (the @property initial-value).
			$hex_map[ '--sf-color-' . $family ]            = $family_hex;
			$hex_map[ '--sf-color-' . $family . '-500' ]   = $family_hex;
			$hex_map[ '--sf-color-' . $family . '-light' ] = $family_hex;

			// Light steps (50-400): interpolate toward white in oklch.
			// Equivalent to color-mix(in oklch, source X%, white) — perceptually uniform,
			// no hue drift (unlike sRGB mixing toward a tinted base color).
			foreach ( self::$light_steps as $step => $pct ) {
				$step_l = $oklch[0] * $pct + ( 1.0 - $pct ); // lerp L toward 1 (white)
				$step_c = $oklch[1] * $pct;                   // chroma scales with color weight
				$hex_map[ '--sf-color-' . $family . '-' . $step ] = self::oklch_to_hex( $step_l, $step_c, $oklch[2] );
			}

			// Dark steps (600-950): interpolate toward black in oklch.
			// Equivalent to color-mix(in oklch, source X%, black) — no purple tint
			// from mixing toward a dark-navy text color.
			foreach ( self::$dark_steps as $step => $pct ) {
				$step_l = $oklch[0] * $pct; // lerp L toward 0 (black)
				$step_c = $oklch[1] * $pct; // chroma scales with color weight
				$hex_map[ '--sf-color-' . $family . '-' . $step ] = self::oklch_to_hex( $step_l, $step_c, $oklch[2] );
			}

			// Alpha steps: opaque swatch approximation composited over the
			// mode backdrop (white in light mode, dark base in dark mode).
			$family_rgb = self::hex_to_rgb( $family_hex );
			foreach ( self::$alpha_steps as $suffix => $pct ) {
				$mixed = self::mix_rgb( $family_rgb, $backdrop_rgb, $pct );
				$hex_map[ '--sf-color-' . $family . '-' . $suffix ] = self::rgb_to_hex( $mixed );
			}

			// Semantic aliases: map to their computed step values.
			foreach ( self::$semantic_aliases as $alias => $target ) {
				$target_key = '--sf-color-' . $family . '-' . $target;
				if ( isset( $hex_map[ $target_key ] ) ) {
					$hex_map[ '--sf-color-' . $family . '-' . $alias ] = $hex_map[ $target_key ];
				}
			}
		}

		return $hex_map;
	}

	/**
	 * Derive per-family dark oklch sources.
	 *
	 * Honours an explicit `--sf-color-{family}-dark` override exactly as the
	 * framework CSS does — `var(--sf-color-X-dark, <derived>)` — so a user who
	 * sets a custom dark colour (via the admin Dark-mode overrides, a theme,
	 * or hand-written CSS) sees that value previewed, not the auto-derivation.
	 * Only when no parseable override is present does it fall back to the
	 * framework formula:
	 *   Brand + status: clamp(0.65, 0.95 - l*0.5, 0.88) lightness, chroma * 0.9.
	 *   Base inverts:   clamp(0.16, 1.18 - l, 0.24) lightness, chroma * 0.5.
	 * (Matches the auto-derivation formulas in core/tokens.css.)
	 *
	 * @param array $light_sources Family => [L, C, H].
	 * @param array $color_values  Parsed values; may carry `-dark` overrides.
	 * @return array<string, array{0:float,1:float,2:float}>
	 */
	private static function derive_dark_sources( $light_sources, $color_values = array() ) {
		$dark = array();
		foreach ( $light_sources as $family => $lch ) {
			// 1. Explicit per-mode override wins (matches the CSS fallback chain).
			$override_key = '--sf-color-' . $family . '-dark';
			if ( isset( $color_values[ $override_key ] ) && '' !== trim( (string) $color_values[ $override_key ] ) ) {
				$parsed = self::parse_oklch( $color_values[ $override_key ] );
				if ( null === $parsed ) {
					$parsed = self::hex_to_oklch( $color_values[ $override_key ] );
				}
				if ( null !== $parsed ) {
					$dark[ $family ] = $parsed;
					continue;
				}
			}

			// 2. Auto-derive from the light source.
			list( $l, $c, $h ) = $lch;
			if ( 'base' === $family ) {
				$dl = max( 0.16, min( 1.18 - $l, 0.24 ) );
				$dc = $c * 0.5;
			} else {
				$dl = max( 0.65, min( 0.95 - $l * 0.5, 0.88 ) );
				$dc = $c * 0.9;
			}
			$dark[ $family ] = array( $dl, $dc, $h );
		}
		return $dark;
	}

	/**
	 * Resolve source oklch values from parsed color_values.
	 *
	 * Looks for @property initial-value declarations matching the pattern
	 * --sf-color-{family}-light with oklch() values.
	 *
	 * @param array $color_values Parsed color variable values.
	 * @return array<string, array{0:float, 1:float, 2:float}> Family => [L, C, H].
	 */
	private static function resolve_sources( $color_values ) {
		$sources = array();

		foreach ( self::default_sources() as $family => $default_oklch ) {
			$var_name = '--sf-color-' . $family . '-light';
			$oklch_str = $default_oklch;

			if ( isset( $color_values[ $var_name ] ) ) {
				$parsed = self::parse_oklch( $color_values[ $var_name ] );
				if ( null !== $parsed ) {
					$sources[ $family ] = $parsed;
					continue;
				}

				// Fallback: try parsing as hex color.
				$parsed = self::hex_to_oklch( $color_values[ $var_name ] );
				if ( null !== $parsed ) {
					$sources[ $family ] = $parsed;
					continue;
				}
			}

			// Fall back to default.
			$parsed = self::parse_oklch( $oklch_str );
			if ( null !== $parsed ) {
				$sources[ $family ] = $parsed;
			}
		}

		return $sources;
	}

	/**
	 * Resolve semantic tokens (text, bg, surface, etc.) with reasonable defaults.
	 *
	 * @param array $hex_map Existing hex map to extend.
	 * @param array $sources Resolved family sources.
	 * @return array<string, string> Extended hex map.
	 */
	private static function resolve_semantic_tokens( $hex_map, $sources ) {
		$white_rgb = array( 255, 255, 255 );
		$dark_text = '#1c1c2e';

		// ---- Base text / bg / surface ----
		$hex_map['--sf-color-text'] = $dark_text;
		$hex_map['--sf-color-bg']   = '#fcfcfd';

		// --sf-color-surface is a semantic alias for --sf-color-base.
		if ( isset( $hex_map['--sf-color-base'] ) ) {
			$hex_map['--sf-color-surface'] = $hex_map['--sf-color-base'];
		} elseif ( ! isset( $hex_map['--sf-color-surface'] ) ) {
			$hex_map['--sf-color-surface'] = '#fafafa';
		}

		// ---- Text variants ----
		$hex_map['--sf-color-text--secondary']   = '#4a4a5e';
		$hex_map['--sf-color-text--muted']       = '#6e6e82';
		$hex_map['--sf-color-text--placeholder'] = '#9e9eb2';
		$hex_map['--sf-color-text--disabled']    = '#b4b4c4';
		$hex_map['--sf-color-text--inverse']     = '#fafafa';
		$hex_map['--sf-color-heading']           = $dark_text;

		// ---- Family RGB values used for alpha-compositing approximations ----
		$neutral_rgb = isset( $hex_map['--sf-color-neutral'] )
			? self::hex_to_rgb( $hex_map['--sf-color-neutral'] )
			: array( 79, 85, 97 );
		$action_rgb  = isset( $hex_map['--sf-color-action'] )
			? self::hex_to_rgb( $hex_map['--sf-color-action'] )
			: array( 0, 151, 180 );
		$warning_rgb = isset( $hex_map['--sf-color-warning'] )
			? self::hex_to_rgb( $hex_map['--sf-color-warning'] )
			: array( 196, 156, 0 );

		// ---- Border tokens ----
		// Light-mode formula: oklch(from neutral_light, clamp(min, L + offset, max), chroma, hue).
		if ( isset( $sources['neutral'] ) ) {
			list( $nl, , $nh ) = $sources['neutral'];
			$hex_map['--sf-color-border']         = self::oklch_to_hex( max( 0.70, min( $nl + 0.35, 0.95 ) ), 0.005, $nh );
			$hex_map['--sf-color-border--subtle'] = self::oklch_to_hex( max( 0.75, min( $nl + 0.40, 0.97 ) ), 0.005, $nh );
			$hex_map['--sf-color-border--strong'] = self::oklch_to_hex( max( 0.55, min( $nl + 0.10, 0.85 ) ), 0.02,  $nh );
		} else {
			$hex_map['--sf-color-border']         = '#d4d4de';
			$hex_map['--sf-color-border--subtle'] = '#e5e5ec';
			$hex_map['--sf-color-border--strong'] = '#6c7280';
		}
		$hex_map['--sf-color-border--muted'] = $hex_map['--sf-color-border--subtle']; // legacy alias
		$hex_map['--sf-color-border--focus'] = $hex_map['--sf-color-action'] ?? '#0097b4';
		// disabled: desaturated border--subtle at 50% opacity over white.
		$border_subtle_rgb = self::hex_to_rgb( $hex_map['--sf-color-border--subtle'] );
		$hex_map['--sf-color-border--disabled']    = self::rgb_to_hex( self::mix_rgb( $border_subtle_rgb, $white_rgb, 0.50 ) );
		// translucent: neutral at 15% opacity over white.
		$hex_map['--sf-color-border--translucent'] = self::rgb_to_hex( self::mix_rgb( $neutral_rgb, $white_rgb, 0.15 ) );

		// ---- Interactive background states ----
		// Alpha-composited over white (opaque approximation of transparent overlays).
		$hex_map['--sf-color-bg--hover']    = self::rgb_to_hex( self::mix_rgb( $neutral_rgb, $white_rgb, 0.08 ) );
		$hex_map['--sf-color-bg--active']   = self::rgb_to_hex( self::mix_rgb( $neutral_rgb, $white_rgb, 0.12 ) );
		$hex_map['--sf-color-bg--selected'] = self::rgb_to_hex( self::mix_rgb( $action_rgb,  $white_rgb, 0.10 ) );
		$hex_map['--sf-color-bg--focus']    = self::rgb_to_hex( self::mix_rgb( $action_rgb,  $white_rgb, 0.06 ) );
		$hex_map['--sf-color-bg--disabled'] = $hex_map['--sf-color-surface']; // = well ≈ surface

		// ---- Well, raised, inverse, overlay ----
		if ( isset( $sources['base'] ) ) {
			list( $bl, $bc, $bh ) = $sources['base'];
			$hex_map['--sf-color-inset']    = self::oklch_to_hex( max( 0.0, $bl - 0.02 ), $bc, $bh );
			$hex_map['--sf-color-raised']  = self::oklch_to_hex( min( 1.0, $bl + 0.04 ), $bc, $bh );
			$hex_map['--sf-color-inverse'] = self::oklch_to_hex( 1.0 - $bl, $bc, $bh );
			$hex_map['--sf-color-overlay'] = $hex_map['--sf-color-surface'];
		} else {
			$hex_map['--sf-color-inset']    = '#f0f2f5';
			$hex_map['--sf-color-raised']  = '#ffffff';
			$hex_map['--sf-color-inverse'] = '#0a0a12';
			$hex_map['--sf-color-overlay'] = '#fafafa';
		}

		// ---- dim: oklch(0 0 0 / 0.5) — semi-transparent black, approximate as mid-gray ----
		$hex_map['--sf-color-dim'] = '#808080';

		// ---- Code tokens ----
		$hex_map['--sf-color-code-bg']   = $hex_map['--sf-color-inset'];
		$hex_map['--sf-color-code-text'] = $dark_text; // code-bg is light → dark text.

		// ---- Link states (light-mode approximation) ----
		// Light-mode formula: min(L − offset, cap) keeps link contrast-safe vs page bg.
		if ( isset( $sources['action'] ) ) {
			list( $al, $ac, $ah ) = $sources['action'];
			$l_link   = max( 0.0, min( $al - 0.07, 0.48 ) );
			$l_hover  = max( 0.0, min( $al - 0.15, 0.40 ) );
			$l_active = max( 0.0, min( $al - 0.21, 0.34 ) );
			$hex_map['--sf-color-link']          = self::oklch_to_hex( $l_link,   $ac, $ah );
			$hex_map['--sf-color-link--hover']   = self::oklch_to_hex( $l_hover,  $ac, $ah );
			$hex_map['--sf-color-link--active']  = self::oklch_to_hex( $l_active, $ac, $ah );
			// visited: same lightness clamp, +60° hue shift.
			$hex_map['--sf-color-link--visited'] = self::oklch_to_hex( $l_link, $ac, fmod( $ah + 60.0, 360.0 ) );
		} else {
			$hex_map['--sf-color-link']          = '#007896';
			$hex_map['--sf-color-link--hover']   = '#005f7a';
			$hex_map['--sf-color-link--active']  = '#004660';
			$hex_map['--sf-color-link--visited'] = '#7c4dcc';
		}
		// underline: action at 30% opacity over white.
		$hex_map['--sf-color-link--underline'] = self::rgb_to_hex( self::mix_rgb( $action_rgb, $white_rgb, 0.30 ) );
		// disabled: = text--disabled.
		$hex_map['--sf-color-link--disabled']  = $hex_map['--sf-color-text--disabled'];

		// ---- Text-on-color contrast tokens ----
		// CSS: oklch(clamp(0.1, sign(threshold − L) × 999, 0.95) 0 0)
		//   L < 0.6 → clamp picks 0.95 → near-white text
		//   L ≥ 0.6 → clamp picks 0.1  → near-black text
		$light_text  = '#f0f0f5';
		$on_families = array( 'primary', 'secondary', 'tertiary', 'action', 'neutral', 'success', 'warning', 'error', 'info', 'danger' );
		foreach ( $on_families as $family ) {
			if ( ! isset( $sources[ $family ] ) ) {
				continue;
			}
			$hex_map[ '--sf-color-text--on-' . $family ] = ( $sources[ $family ][0] < 0.6 )
				? $light_text
				: $dark_text;
		}
		$hex_map['--sf-color-text--on-base']    = $dark_text; // base is light → dark text.
		$hex_map['--sf-color-text--on-surface'] = $dark_text; // compat alias → on-base.
		$hex_map['--sf-color-text--on-inverse'] = $hex_map['--sf-color-text--inverse'];

		// ---- Selection and mark ----
		// selection-bg: action at light opacity; approximate as bg--selected.
		$hex_map['--sf-color-selection-bg']   = $hex_map['--sf-color-bg--selected'];
		// selection-text / mark-text: both are `inherit` in CSS — show as current text color.
		$hex_map['--sf-color-selection-text'] = $dark_text;
		// mark-bg: warning at 25% opacity over white.
		$hex_map['--sf-color-mark-bg']  = self::rgb_to_hex( self::mix_rgb( $warning_rgb, $white_rgb, 0.25 ) );
		$hex_map['--sf-color-mark-text'] = $dark_text;

		// ---- Status strong variants (light-mode: source L minus offset) ----
		// CSS formula: oklch(from var(--sf-color-{family}-light) calc(l - offset) c h)
		$status_strong_offsets = array(
			'success' => 0.15,
			'warning' => 0.25,
			'error'   => 0.10,
			'info'    => 0.10,
			'danger'  => 0.10,
		);
		foreach ( $status_strong_offsets as $family => $l_offset ) {
			if ( ! isset( $sources[ $family ] ) ) {
				continue;
			}
			list( $sl, $sc, $sh ) = $sources[ $family ];
			$hex_map[ '--sf-color-' . $family . '-strong' ] = self::oklch_to_hex(
				max( 0.0, $sl - $l_offset ),
				$sc,
				$sh
			);
		}

		return $hex_map;
	}

	/**
	 * Resolve dark-mode semantic tokens (text, bg, surface, border, link…).
	 *
	 * Ports the direction-flipped dark formulas from core/tokens.css: surfaces
	 * derive from the dark base source, text/border from the dark neutral
	 * source, links from the dark action source. Alpha-composited tokens mix
	 * over the dark base instead of white. text-on-* stays mode-agnostic
	 * (chosen from the resolved family luminance).
	 *
	 * @param array $hex_map       Family scales already built (dark).
	 * @param array $d             Dark sources (family => [L,C,H]).
	 * @param array $light_sources Light sources — needed for selection-bg,
	 *                             whose dark formula references action-light.
	 * @return array<string, string>
	 */
	private static function resolve_semantic_tokens_dark( $hex_map, $d, $light_sources ) {
		$light_text = '#f0f0f5';
		$dark_text  = '#1c1c2e';

		// --sf-color-base is the brand family; --sf-color-surface is a semantic alias = var(--sf-color-base).
		$surface_hex = isset( $hex_map['--sf-color-base'] ) ? $hex_map['--sf-color-base']
			: ( isset( $hex_map['--sf-color-surface'] ) ? $hex_map['--sf-color-surface'] : '#1a1b1e' );
		$surface_rgb = self::hex_to_rgb( $surface_hex );

		// ---- Base-derived surfaces ----
		if ( isset( $d['base'] ) ) {
			list( $bl, $bc, $bh ) = $d['base'];
			// --sf-color-surface is a semantic alias for --sf-color-base.
			$hex_map['--sf-color-base']    = $surface_hex;
			$hex_map['--sf-color-surface'] = $surface_hex;
			$hex_map['--sf-color-bg']      = self::oklch_to_hex( min( 1.0, $bl + 0.02 ), $bc, $bh );
			$hex_map['--sf-color-inset']    = self::oklch_to_hex( max( 0.0, $bl - 0.02 ), $bc, $bh );
			$hex_map['--sf-color-raised']  = self::oklch_to_hex( min( 1.0, $bl + 0.04 ), $bc, $bh );
			$hex_map['--sf-color-overlay'] = $surface_hex;
			$hex_map['--sf-color-inverse'] = self::oklch_to_hex( max( 0.0, 1.0 - $bl ), $bc, $bh );
		}

		// ---- Neutral-derived text + border (dark formulas) ----
		if ( isset( $d['neutral'] ) ) {
			list( $nl, $nc, $nh ) = $d['neutral'];
			$neutral_hex = isset( $hex_map['--sf-color-neutral'] ) ? $hex_map['--sf-color-neutral'] : self::oklch_to_hex( $nl, $nc, $nh );
			$neutral_rgb = self::hex_to_rgb( $neutral_hex );

			$hex_map['--sf-color-text']             = self::oklch_to_hex( max( 0.70, min( $nl + 0.25, 1.0 ) ), $nc, $nh );
			$hex_map['--sf-color-heading']          = $hex_map['--sf-color-text'];
			$hex_map['--sf-color-text--secondary']  = self::oklch_to_hex( max( 0.55, min( $nl + 0.1, 0.90 ) ), $nc, $nh );
			$hex_map['--sf-color-text--muted']      = $neutral_hex;
			$hex_map['--sf-color-text--placeholder']= self::oklch_to_hex( max( 0.35, min( $nl - 0.1, 0.65 ) ), $nc, $nh );
			$hex_map['--sf-color-text--disabled']   = self::oklch_to_hex( max( 0.25, min( $nl - 0.2, 0.55 ) ), $nc, $nh );
			$hex_map['--sf-color-text--inverse']    = self::oklch_to_hex( max( 0.05, min( $nl - 0.4, 0.35 ) ), $nc, $nh );

			$hex_map['--sf-color-border']         = self::oklch_to_hex( max( 0.25, min( $nl - 0.3, 0.55 ) ), 0.005, $nh );
			$hex_map['--sf-color-border--subtle'] = self::oklch_to_hex( max( 0.20, min( $nl - 0.38, 0.45 ) ), 0.005, $nh );
			$hex_map['--sf-color-border--strong'] = self::oklch_to_hex( max( 0.38, min( $nl - 0.1, 0.65 ) ), 0.02, $nh );
			$hex_map['--sf-color-border--muted']  = $hex_map['--sf-color-border--subtle'];
			$hex_map['--sf-color-border--translucent'] = self::rgb_to_hex( self::mix_rgb( $neutral_rgb, $surface_rgb, 0.15 ) );
			$hex_map['--sf-color-border--disabled']    = self::rgb_to_hex( self::mix_rgb( self::hex_to_rgb( $hex_map['--sf-color-border--subtle'] ), $surface_rgb, 0.5 ) );

			$hex_map['--sf-color-bg--hover']  = self::rgb_to_hex( self::mix_rgb( $neutral_rgb, $surface_rgb, 0.08 ) );
			$hex_map['--sf-color-bg--active'] = self::rgb_to_hex( self::mix_rgb( $neutral_rgb, $surface_rgb, 0.12 ) );
		}

		$hex_map['--sf-color-border--focus'] = isset( $hex_map['--sf-color-action'] ) ? $hex_map['--sf-color-action'] : '#5b8cff';

		// ---- Action-derived links (dark formulas: lighten toward a floor) ----
		if ( isset( $d['action'] ) ) {
			list( $al, $ac, $ah ) = $d['action'];
			$action_hex = isset( $hex_map['--sf-color-action'] ) ? $hex_map['--sf-color-action'] : self::oklch_to_hex( $al, $ac, $ah );
			$action_rgb = self::hex_to_rgb( $action_hex );

			$hex_map['--sf-color-link']          = self::oklch_to_hex( max( 0.68, $al ), $ac, $ah );
			$hex_map['--sf-color-link--hover']   = self::oklch_to_hex( max( $al + 0.10, 0.68 ), $ac, $ah );
			$hex_map['--sf-color-link--active']  = self::oklch_to_hex( max( $al + 0.15, 0.74 ), $ac, $ah );
			$hex_map['--sf-color-link--visited'] = self::oklch_to_hex( max( 0.68, $al ), $ac, fmod( $ah + 60.0, 360.0 ) );
			$hex_map['--sf-color-link--underline'] = self::rgb_to_hex( self::mix_rgb( $action_rgb, $surface_rgb, 0.30 ) );

			$hex_map['--sf-color-bg--selected'] = self::rgb_to_hex( self::mix_rgb( $action_rgb, $surface_rgb, 0.10 ) );
			$hex_map['--sf-color-bg--focus']    = self::rgb_to_hex( self::mix_rgb( $action_rgb, $surface_rgb, 0.06 ) );
		}

		$hex_map['--sf-color-link--disabled'] = isset( $hex_map['--sf-color-text--disabled'] ) ? $hex_map['--sf-color-text--disabled'] : '#6b6b78';
		$hex_map['--sf-color-bg--disabled']   = isset( $hex_map['--sf-color-inset'] ) ? $hex_map['--sf-color-inset'] : '#222';

		// ---- Code (code-bg = well; dark well → light code text) ----
		$hex_map['--sf-color-code-bg']   = isset( $hex_map['--sf-color-inset'] ) ? $hex_map['--sf-color-inset'] : '#222';
		$hex_map['--sf-color-code-text'] = $light_text;

		// ---- Text-on-color (mode-agnostic: from the resolved dark family L) ----
		$on_families = array( 'primary', 'secondary', 'tertiary', 'action', 'neutral', 'success', 'warning', 'error', 'info', 'danger' );
		foreach ( $on_families as $family ) {
			if ( ! isset( $d[ $family ] ) ) {
				continue;
			}
			$hex_map[ '--sf-color-text--on-' . $family ] = ( $d[ $family ][0] < 0.6 ) ? $light_text : $dark_text;
		}
		$hex_map['--sf-color-text--on-base']    = isset( $hex_map['--sf-color-text'] ) ? $hex_map['--sf-color-text'] : $light_text;
		$hex_map['--sf-color-text--on-surface'] = $hex_map['--sf-color-text--on-base']; // compat alias → on-base.
		$hex_map['--sf-color-text--on-inverse'] = isset( $hex_map['--sf-color-text--inverse'] ) ? $hex_map['--sf-color-text--inverse'] : $dark_text;

		// ---- Selection + mark ----
		// Dark selection-bg references action-LIGHT lightness; composite at ~0.55 over base.
		if ( isset( $light_sources['action'] ) ) {
			list( $la, $lc, $lh ) = $light_sources['action'];
			$sel_l   = max( 0.62, min( 0.93 - $la * 0.4, 0.78 ) );
			$sel_rgb = self::hex_to_rgb( self::oklch_to_hex( $sel_l, $lc, $lh ) );
			$hex_map['--sf-color-selection-bg'] = self::rgb_to_hex( self::mix_rgb( $sel_rgb, $surface_rgb, 0.55 ) );
		} elseif ( isset( $hex_map['--sf-color-bg--selected'] ) ) {
			$hex_map['--sf-color-selection-bg'] = $hex_map['--sf-color-bg--selected'];
		}
		$hex_map['--sf-color-selection-text'] = isset( $hex_map['--sf-color-text'] ) ? $hex_map['--sf-color-text'] : $light_text;
		if ( isset( $hex_map['--sf-color-warning'] ) ) {
			$hex_map['--sf-color-mark-bg'] = self::rgb_to_hex( self::mix_rgb( self::hex_to_rgb( $hex_map['--sf-color-warning'] ), $surface_rgb, 0.25 ) );
		}
		$hex_map['--sf-color-mark-text'] = isset( $hex_map['--sf-color-text'] ) ? $hex_map['--sf-color-text'] : $light_text;
		$hex_map['--sf-color-dim']       = '#808080';

		// ---- Status strong variants (dark: lighten by offset toward 1) ----
		$status_strong_offsets = array(
			'success' => 0.15,
			'warning' => 0.05,
			'error'   => 0.15,
			'info'    => 0.15,
			'danger'  => 0.15,
		);
		foreach ( $status_strong_offsets as $family => $l_offset ) {
			if ( ! isset( $d[ $family ] ) ) {
				continue;
			}
			list( $sl, $sc, $sh ) = $d[ $family ];
			$hex_map[ '--sf-color-' . $family . '-strong' ] = self::oklch_to_hex( max( 0.0, min( $sl + $l_offset, 1.0 ) ), $sc, $sh );
		}

		return $hex_map;
	}

	/**
	 * Parse an oklch() string into L, C, H components.
	 *
	 * Handles formats like:
	 *   oklch(0.45 0.20 264)
	 *   oklch(0.45 0.20 264deg)
	 *
	 * @param string $str The oklch() function string.
	 * @return array{0:float, 1:float, 2:float}|null [L, C, H] or null on failure.
	 */
	private static function parse_oklch( $str ) {
		$str = trim( $str );
		if ( ! preg_match( '/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:deg)?\s*\)/i', $str, $m ) ) {
			return null;
		}
		return array( (float) $m[1], (float) $m[2], (float) $m[3] );
	}

	/**
	 * Convert oklch values to a hex color string.
	 *
	 * Conversion path: oklch -> OKLab -> LMS -> linear sRGB -> sRGB -> hex.
	 *
	 * @param float $l Lightness (0-1).
	 * @param float $c Chroma (0-0.4+).
	 * @param float $h Hue in degrees (0-360).
	 * @return string Hex color string (#rrggbb).
	 */
	private static function oklch_to_hex( $l, $c, $h ) {
		// Convert to OKLab.
		$h_rad = $h * M_PI / 180.0;
		$ok_a  = $c * cos( $h_rad );
		$ok_b  = $c * sin( $h_rad );

		// OKLab -> LMS (cube roots).
		$l_ = $l + 0.3963377774 * $ok_a + 0.2158037573 * $ok_b;
		$m_ = $l - 0.1055613458 * $ok_a - 0.0638541728 * $ok_b;
		$s_ = $l - 0.0894841775 * $ok_a - 1.2914855480 * $ok_b;

		// Cube to get LMS.
		$lms_l = $l_ * $l_ * $l_;
		$lms_m = $m_ * $m_ * $m_;
		$lms_s = $s_ * $s_ * $s_;

		// LMS -> linear sRGB.
		$r_lin = +4.0767416621 * $lms_l - 3.3077115913 * $lms_m + 0.2309699292 * $lms_s;
		$g_lin = -1.2684380046 * $lms_l + 2.6097574011 * $lms_m - 0.3413193965 * $lms_s;
		$b_lin = -0.0041960863 * $lms_l - 0.7034186147 * $lms_m + 1.7076147010 * $lms_s;

		// Linear sRGB -> sRGB (gamma correction).
		$r = self::linear_to_srgb( $r_lin );
		$g = self::linear_to_srgb( $g_lin );
		$b = self::linear_to_srgb( $b_lin );

		// Clamp and convert to 0-255.
		$r = (int) round( max( 0.0, min( 1.0, $r ) ) * 255 );
		$g = (int) round( max( 0.0, min( 1.0, $g ) ) * 255 );
		$b = (int) round( max( 0.0, min( 1.0, $b ) ) * 255 );

		return sprintf( '#%02x%02x%02x', $r, $g, $b );
	}

	/**
	 * Apply sRGB gamma transfer function (linear to sRGB).
	 *
	 * @param float $c Linear channel value.
	 * @return float sRGB channel value (0-1 range, may exceed before clamping).
	 */
	private static function linear_to_srgb( $c ) {
		if ( $c <= 0.0031308 ) {
			return 12.92 * $c;
		}
		return 1.055 * pow( $c, 1.0 / 2.4 ) - 0.055;
	}

	/**
	 * Apply inverse sRGB gamma transfer function (sRGB to linear).
	 *
	 * @param float $c sRGB channel value (0-1).
	 * @return float Linear channel value.
	 */
	private static function srgb_to_linear( $c ) {
		if ( $c <= 0.04045 ) {
			return $c / 12.92;
		}
		return pow( ( $c + 0.055 ) / 1.055, 2.4 );
	}

	/**
	 * Cube root that handles negative values.
	 *
	 * The intermediate LMS space used in this OKLab formulation can produce
	 * negative values for saturated colors, so a sign-preserving cube root
	 * is required.
	 *
	 * @param float $x Value to take cube root of.
	 * @return float Cube root of x.
	 */
	private static function safe_cbrt( $x ) {
		if ( $x >= 0 ) {
			return pow( $x, 1.0 / 3.0 );
		}
		return -pow( -$x, 1.0 / 3.0 );
	}

	/**
	 * Convert a hex color string to oklch values.
	 *
	 * Conversion path: hex -> RGB -> linear sRGB -> LMS -> OKLab -> OKLch.
	 * Uses the standard OKLab M1/M2 matrices for accurate round-trip conversion.
	 *
	 * @param string $str The value to parse (expected hex like #rrggbb or #rgb).
	 * @return array{0:float, 1:float, 2:float}|null [L, C, H] or null on failure.
	 */
	private static function hex_to_oklch( $str ) {
		$str = trim( $str );
		if ( ! preg_match( '/^#([0-9a-fA-F]{3,8})$/', $str ) ) {
			return null;
		}

		$hex = ltrim( $str, '#' );
		$len = strlen( $hex );

		// Expand shorthand (#rgb -> #rrggbb, #rgba -> #rrggbbaa).
		if ( 3 === $len || 4 === $len ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		} elseif ( 6 !== $len && 8 !== $len ) {
			return null;
		}

		// Extract RGB (ignore alpha channel if present).
		$r = (int) hexdec( substr( $hex, 0, 2 ) );
		$g = (int) hexdec( substr( $hex, 2, 2 ) );
		$b = (int) hexdec( substr( $hex, 4, 2 ) );

		// RGB 0-255 -> sRGB 0-1.
		$sr = $r / 255.0;
		$sg = $g / 255.0;
		$sb = $b / 255.0;

		// sRGB -> linear RGB.
		$lr = self::srgb_to_linear( $sr );
		$lg = self::srgb_to_linear( $sg );
		$lb = self::srgb_to_linear( $sb );

		// Linear sRGB -> LMS (standard OKLab M1 matrix).
		$lms_l = 0.4122214708 * $lr + 0.5363325363 * $lg + 0.0514459929 * $lb;
		$lms_m = 0.2119034982 * $lr + 0.6806995451 * $lg + 0.1073969566 * $lb;
		$lms_s = 0.0883024619 * $lr + 0.2817188376 * $lg + 0.6299787005 * $lb;

		// LMS -> cube root (LMS_). Sign-preserving for negative intermediate values.
		$l_ = self::safe_cbrt( $lms_l );
		$m_ = self::safe_cbrt( $lms_m );
		$s_ = self::safe_cbrt( $lms_s );

		// LMS_ -> OKLab (standard OKLab M2 matrix).
		$ok_l = 0.2104542553 * $l_ + 0.7936177850 * $m_ - 0.0040720468 * $s_;
		$ok_a = 1.9779984951 * $l_ - 2.4285922050 * $m_ + 0.4505937099 * $s_;
		$ok_b = 0.0259040371 * $l_ + 0.7827717662 * $m_ - 0.8086757660 * $s_;

		// OKLab -> OKLch.
		$c = sqrt( $ok_a * $ok_a + $ok_b * $ok_b );
		$h = atan2( $ok_b, $ok_a ) * 180.0 / M_PI;

		// Normalize hue to 0-360.
		if ( $h < 0 ) {
			$h += 360.0;
		}

		return array( $ok_l, $c, $h );
	}

	/**
	 * Mix two RGB colors at a given ratio via linear interpolation in sRGB gamma space.
	 *
	 * This is a simplified approximation of CSS color-mix(in oklab, ...) behaviour,
	 * suitable for generating swatch preview hex values. The percentage represents
	 * how much of colorA is in the result.
	 *
	 * @param array $rgb_a First color [r, g, b] (0-255).
	 * @param array $rgb_b Second color [r, g, b] (0-255).
	 * @param float $pct   Percentage of first color (0.0 to 1.0).
	 * @return array [r, g, b] (0-255).
	 */
	private static function mix_rgb( $rgb_a, $rgb_b, $pct ) {
		$r = (int) round( $rgb_a[0] * $pct + $rgb_b[0] * ( 1.0 - $pct ) );
		$g = (int) round( $rgb_a[1] * $pct + $rgb_b[1] * ( 1.0 - $pct ) );
		$b = (int) round( $rgb_a[2] * $pct + $rgb_b[2] * ( 1.0 - $pct ) );

		return array(
			max( 0, min( 255, $r ) ),
			max( 0, min( 255, $g ) ),
			max( 0, min( 255, $b ) ),
		);
	}

	/**
	 * Convert a hex color string to RGB array.
	 *
	 * @param string $hex Hex color (#rrggbb).
	 * @return array [r, g, b] (0-255).
	 */
	private static function hex_to_rgb( $hex ) {
		$hex = ltrim( $hex, '#' );
		return array(
			(int) hexdec( substr( $hex, 0, 2 ) ),
			(int) hexdec( substr( $hex, 2, 2 ) ),
			(int) hexdec( substr( $hex, 4, 2 ) ),
		);
	}

	/**
	 * Convert an RGB array to hex string.
	 *
	 * @param array $rgb [r, g, b] (0-255).
	 * @return string Hex color (#rrggbb).
	 */
	private static function rgb_to_hex( $rgb ) {
		return sprintf( '#%02x%02x%02x', $rgb[0], $rgb[1], $rgb[2] );
	}
}
