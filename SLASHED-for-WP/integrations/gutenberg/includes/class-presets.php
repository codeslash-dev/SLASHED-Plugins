<?php
/**
 * Editor preset registration for the block editor.
 *
 * Registers the SLASHED design tokens with the block editor's native controls:
 *
 *   - Color palette      (color control)        — full --sf-color-* set
 *   - Gradient presets   (gradient control)     — --sf-gradient-*
 *   - Font size presets  (typography control)   — --sf-text-*
 *   - Spacing presets    (dimensions control)   — --sf-space-*
 *
 * Source of truth
 * ───────────────
 * The palette and gradient lists are derived live from the active CSS bundle
 * via Slashed_Gutenberg_Inventory (which parses whichever bundle —
 * essential / optimal / full — is actually enqueued). This replaces the old
 * hand-maintained 20-entry palette, which drifted out of sync with the
 * framework and shipped only a fraction of the available colors.
 *
 * Every value is a `var(--sf-*)` reference, never a baked hex. Because
 * class-enqueue.php loads the full SLASHED bundle into the editor canvas,
 * each var() resolves live — including dark-mode variants and any user token
 * overrides — so the swatches always reflect the real, current theme.
 *
 * Classic vs block themes
 * ───────────────────────
 * Classic themes read `add_theme_support()`. Block / FSE themes read
 * theme.json, which overrides add_theme_support, so the same presets are also
 * injected into the theme.json data layer via `wp_theme_json_data_theme`.
 * WordPress builds a theme.json data object for every theme (even classic
 * ones), so the filter path covers spacing presets too — which have no
 * add_theme_support equivalent.
 *
 * Slugs are namespaced with `slashed-` so WP's generated utility classes
 * (`.has-slashed-primary-color`, `.has-slashed-text-l-font-size`, …) are
 * predictable and never collide with the theme's own presets.
 *
 * @package SLASHED_Gutenberg
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Gutenberg_Presets
 */
class Slashed_Gutenberg_Presets {

	/**
	 * Brand families, in canonical display order. Mirrors color-model.js and
	 * Slashed_Color_Resolver so the flat native palette clusters by family.
	 */
	const BRAND_FAMILIES = array( 'primary', 'secondary', 'tertiary', 'action', 'neutral', 'base' );

	/**
	 * Status families, in canonical display order.
	 */
	const STATUS_FAMILIES = array( 'success', 'warning', 'error', 'info', 'danger' );

	/**
	 * Curated order for named semantic aliases within a family.
	 */
	const ALIAS_ORDER = array(
		'superlight', 'xlight', 'lighter', 'darker', 'xdark', 'superdark',
		'hover', 'active', 'strong', 'subtle', 'muted', 'ghost',
	);

	/**
	 * Font-size tokens exposed to the typography control, in display order.
	 * Keys are the `--sf-text-{key}` suffixes; labels are shown in the picker.
	 */
	const FONT_SIZES = array(
		'2xs'       => '2XS',
		'xs'        => 'XS',
		's'         => 'Small',
		'm'         => 'Medium',
		'l'         => 'Large',
		'xl'        => 'XL',
		'2xl'       => '2XL',
		'3xl'       => '3XL',
		'4xl'       => '4XL',
		'display-s' => 'Display Small',
		'display-m' => 'Display Medium',
		'display-l' => 'Display Large',
	);

	/**
	 * Spacing tokens exposed to the dimensions controls, in display order.
	 * Keys are the `--sf-space-{key}` suffixes.
	 */
	const SPACE_SIZES = array(
		'2xs' => '2XS',
		'xs'  => 'XS',
		's'   => 'Small',
		'm'   => 'Medium',
		'l'   => 'Large',
		'xl'  => 'XL',
		'2xl' => '2XL',
		'3xl' => '3XL',
		'4xl' => '4XL',
	);

	/**
	 * Human labels for gradient token suffixes.
	 */
	const GRADIENT_LABELS = array(
		'brand'     => 'Brand',
		'primary'   => 'Primary',
		'secondary' => 'Secondary',
		'tertiary'  => 'Tertiary',
		'surface'   => 'Surface',
		'fade--t'   => 'Fade Top',
		'fade--r'   => 'Fade Right',
		'fade--b'   => 'Fade Bottom',
		'fade--l'   => 'Fade Left',
	);

	public function __construct() {
		// Classic themes: add_theme_support drives the editor controls.
		add_theme_support( 'editor-color-palette', $this->build_palette() );

		$gradients = $this->build_gradients();
		if ( ! empty( $gradients ) ) {
			add_theme_support( 'editor-gradient-presets', $gradients );
		}

		add_theme_support( 'editor-font-sizes', $this->build_font_sizes() );

		// Block / FSE themes: theme.json takes precedence; inject via the data
		// filter. Also the only path that carries spacing presets.
		add_filter( 'wp_theme_json_data_theme', array( $this, 'inject_theme_json' ) );
	}

	/**
	 * Inject every SLASHED preset family into the theme.json data layer.
	 *
	 * update_with() merges presets by slug, so the theme's own entries are
	 * preserved alongside the `slashed-` namespaced ones.
	 *
	 * @param WP_Theme_JSON_Data $theme_json Theme JSON data object.
	 * @return WP_Theme_JSON_Data
	 */
	public function inject_theme_json( $theme_json ) {
		$settings = array(
			'color'      => array(
				'palette'   => $this->build_palette(),
				'gradients' => $this->build_gradients(),
			),
			'typography' => array(
				'fontSizes' => $this->build_font_sizes(),
			),
			'spacing'    => array(
				'spacingSizes' => $this->build_spacing_sizes(),
			),
		);

		// Drop empty preset arrays so we never blank out a theme's own presets
		// (update_with treats an explicit empty array as "replace with none").
		if ( empty( $settings['color']['palette'] ) ) {
			unset( $settings['color']['palette'] );
		}
		if ( empty( $settings['color']['gradients'] ) ) {
			unset( $settings['color']['gradients'] );
		}
		if ( empty( $settings['color'] ) ) {
			unset( $settings['color'] );
		}
		if ( empty( $settings['spacing']['spacingSizes'] ) ) {
			unset( $settings['spacing'] );
		}

		$theme_json->update_with(
			array(
				'version'  => 3,
				'settings' => $settings,
			)
		);

		return $theme_json;
	}

	// ---------------------------------------------------------------
	// Colors.
	// ---------------------------------------------------------------

	/**
	 * Build the full color palette from the live inventory.
	 *
	 * Tokens are grouped and ordered by family (brand → status → semantic) and,
	 * within each family, by kind (base → numeric scale → named alias → alpha)
	 * so that — even though the native picker renders a flat list — colors
	 * visually cluster the way the framework organises them.
	 *
	 * @return array<int, array{name:string, slug:string, color:string}>
	 */
	public function build_palette() {
		$vars = $this->color_variables();

		// Bucket every token by family + kind.
		$families  = array();  // family => kind => [ [order, var] ]
		$semantic  = array();  // [ [key, var] ]

		foreach ( $vars as $var ) {
			$info = $this->classify_color( $var );
			if ( null === $info ) {
				continue;
			}
			if ( 'semantic' === $info['family'] ) {
				$semantic[] = array( $info['key'], $var );
				continue;
			}
			$families[ $info['family'] ][ $info['kind'] ][] = array( $info['order'], $var, $info );
		}

		$entries = array();

		$emit_family = function ( $family ) use ( &$entries, &$families ) {
			if ( empty( $families[ $family ] ) ) {
				return;
			}
			$kinds = $families[ $family ];
			foreach ( array( 'base', 'scale', 'alias', 'alpha' ) as $kind ) {
				if ( empty( $kinds[ $kind ] ) ) {
					continue;
				}
				$list = $kinds[ $kind ];
				usort(
					$list,
					static function ( $a, $b ) {
						return $a[0] <=> $b[0];
					}
				);
				foreach ( $list as $item ) {
					$entries[] = $this->palette_entry( $item[1], $item[2] );
				}
			}
		};

		foreach ( self::BRAND_FAMILIES as $family ) {
			$emit_family( $family );
		}
		foreach ( self::STATUS_FAMILIES as $family ) {
			$emit_family( $family );
		}

		// Semantic tokens: keep the inventory's natural (sorted) order.
		foreach ( $semantic as $item ) {
			$info = array(
				'family' => 'semantic',
				'kind'   => 'semantic',
				'key'    => $item[0],
			);
			$entries[] = $this->palette_entry( $item[1], $info );
		}

		/**
		 * Filter the SLASHED block-editor color palette.
		 *
		 * @param array $entries Palette entries ({name, slug, color}).
		 */
		return apply_filters( 'slashed_gutenberg/color_palette', $entries );
	}

	/**
	 * Build a single palette entry for a color variable.
	 *
	 * @param string $var  Full variable name, e.g. "--sf-color-primary-500".
	 * @param array  $info Classification from classify_color().
	 * @return array{name:string, slug:string, color:string}
	 */
	private function palette_entry( $var, $info ) {
		$token = substr( $var, strlen( '--sf-color-' ) );
		return array(
			'name'  => $this->color_label( $info ),
			'slug'  => 'slashed-' . $this->slugify_token( $token ),
			'color' => 'var(' . $var . ')',
		);
	}

	/**
	 * Classify a `--sf-color-*` variable into family + kind + sort order.
	 *
	 * Mirrors color-model.js classifyVar(). Returns null for tokens that
	 * should not appear as a swatch (the `--sf-color-scheme` string token and
	 * the `-light` source duplicates of each base color).
	 *
	 * @param string $var Full variable name.
	 * @return array{family:string, kind:string, key:string, order:int|string}|null
	 */
	private function classify_color( $var ) {
		$prefix = '--sf-color-';
		if ( 0 !== strpos( $var, $prefix ) ) {
			return null;
		}
		$key = substr( $var, strlen( $prefix ) );
		if ( '' === $key || 'scheme' === $key ) {
			return null;
		}

		$dash   = strpos( $key, '-' );
		$family = ( false === $dash ) ? $key : substr( $key, 0, $dash );

		$is_family = in_array( $family, self::BRAND_FAMILIES, true )
			|| in_array( $family, self::STATUS_FAMILIES, true );

		if ( ! $is_family ) {
			return array(
				'family' => 'semantic',
				'kind'   => 'semantic',
				'key'    => $key,
				'order'  => 0,
			);
		}

		$suffix = ( false === $dash ) ? '' : substr( $key, $dash + 1 );

		if ( '' === $suffix ) {
			return array( 'family' => $family, 'kind' => 'base', 'key' => $key, 'order' => -1 );
		}
		// The `-light` source duplicates the resolved base swatch — skip.
		if ( 'light' === $suffix ) {
			return null;
		}
		if ( preg_match( '/^[0-9]+$/', $suffix ) ) {
			return array( 'family' => $family, 'kind' => 'scale', 'key' => $key, 'order' => (int) $suffix );
		}
		if ( preg_match( '/^a[0-9]+$/', $suffix ) ) {
			return array( 'family' => $family, 'kind' => 'alpha', 'key' => $key, 'order' => (int) substr( $suffix, 1 ) );
		}
		$alias_idx = array_search( $suffix, self::ALIAS_ORDER, true );
		return array(
			'family' => $family,
			'kind'   => 'alias',
			'key'    => $key,
			'order'  => ( false === $alias_idx ) ? 999 : $alias_idx,
		);
	}

	/**
	 * Human label for a color swatch.
	 *
	 *   base   → "Primary"
	 *   scale  → "Primary 500"
	 *   alpha  → "Primary 10%"
	 *   alias  → "Primary Hover"
	 *   semant → "Text Secondary", "Border Subtle", "Text On Primary"
	 *
	 * @param array $info Classification.
	 * @return string
	 */
	private function color_label( $info ) {
		$family = $info['family'];
		$key    = $info['key'];

		switch ( $info['kind'] ) {
			case 'base':
				return ucfirst( $family );
			case 'scale':
				$suffix = substr( $key, strlen( $family ) + 1 );
				return ucfirst( $family ) . ' ' . $suffix;
			case 'alpha':
				$suffix  = substr( $key, strlen( $family ) + 1 );  // e.g. "a10"
				$percent = (int) substr( $suffix, 1 );
				return ucfirst( $family ) . ' ' . $percent . '%';
			case 'alias':
				$suffix = substr( $key, strlen( $family ) + 1 );
				return ucfirst( $family ) . ' ' . $this->humanize( $suffix );
			case 'semantic':
			default:
				return $this->humanize( $key );
		}
	}

	/**
	 * Humanize a token key fragment: "text--on-primary" → "Text On Primary".
	 *
	 * @param string $key
	 * @return string
	 */
	private function humanize( $key ) {
		$key   = str_replace( '--', '-', $key );
		$parts = preg_split( '/-+/', $key );
		$parts = array_map( 'ucfirst', array_filter( $parts, 'strlen' ) );
		return implode( ' ', $parts );
	}

	/**
	 * Collapse a token suffix into a single-dash slug fragment.
	 *
	 * "primary-500" → "primary-500"; "text--secondary" → "text-secondary".
	 *
	 * @param string $token Token name without the `--sf-color-` prefix.
	 * @return string
	 */
	private function slugify_token( $token ) {
		$token = str_replace( '--', '-', $token );
		$token = preg_replace( '/[^a-z0-9-]+/', '-', strtolower( $token ) );
		return trim( preg_replace( '/-+/', '-', $token ), '-' );
	}

	/**
	 * The list of `--sf-color-*` variables to expose, from the inventory.
	 *
	 * @return string[]
	 */
	private function color_variables() {
		if ( ! class_exists( 'Slashed_Gutenberg_Inventory' ) ) {
			return array();
		}
		return Slashed_Gutenberg_Inventory::get_color_variables();
	}

	// ---------------------------------------------------------------
	// Gradients.
	// ---------------------------------------------------------------

	/**
	 * Build gradient presets from the `--sf-gradient-*` inventory tokens.
	 *
	 * @return array<int, array{name:string, slug:string, gradient:string}>
	 */
	public function build_gradients() {
		$entries = array();

		if ( class_exists( 'Slashed_Gutenberg_Inventory' ) ) {
			foreach ( Slashed_Gutenberg_Inventory::get_variables() as $var ) {
				if ( 0 !== strpos( $var, '--sf-gradient-' ) ) {
					continue;
				}
				$suffix = substr( $var, strlen( '--sf-gradient-' ) );
				$label  = isset( self::GRADIENT_LABELS[ $suffix ] )
					? self::GRADIENT_LABELS[ $suffix ]
					: $this->humanize( $suffix );

				$entries[] = array(
					'name'     => $label,
					'slug'     => 'slashed-' . $this->slugify_token( $suffix ),
					'gradient' => 'var(' . $var . ')',
				);
			}
		}

		/**
		 * Filter the SLASHED block-editor gradient presets.
		 *
		 * @param array $entries Gradient entries ({name, slug, gradient}).
		 */
		return apply_filters( 'slashed_gutenberg/gradient_presets', $entries );
	}

	// ---------------------------------------------------------------
	// Font sizes.
	// ---------------------------------------------------------------

	/**
	 * Build font-size presets. Each maps to a `var(--sf-text-*)` value, which
	 * is already a fluid clamp() in the framework, so the editor inherits the
	 * responsive sizing for free.
	 *
	 * @return array<int, array{name:string, slug:string, size:string}>
	 */
	public function build_font_sizes() {
		$entries = array();
		foreach ( self::FONT_SIZES as $key => $label ) {
			$entries[] = array(
				'name' => $label,
				'slug' => 'slashed-text-' . $this->slugify_token( $key ),
				'size' => 'var(--sf-text-' . $key . ')',
			);
		}

		/**
		 * Filter the SLASHED block-editor font-size presets.
		 *
		 * @param array $entries Font-size entries ({name, slug, size}).
		 */
		return apply_filters( 'slashed_gutenberg/font_size_presets', $entries );
	}

	// ---------------------------------------------------------------
	// Spacing.
	// ---------------------------------------------------------------

	/**
	 * Build spacing presets for the padding / margin / gap / blockGap controls.
	 *
	 * @return array<int, array{name:string, slug:string, size:string}>
	 */
	public function build_spacing_sizes() {
		$entries = array();
		foreach ( self::SPACE_SIZES as $key => $label ) {
			$entries[] = array(
				'name' => $label,
				'slug' => 'slashed-' . $this->slugify_token( $key ),
				'size' => 'var(--sf-space-' . $key . ')',
			);
		}

		/**
		 * Filter the SLASHED block-editor spacing presets.
		 *
		 * @param array $entries Spacing entries ({name, slug, size}).
		 */
		return apply_filters( 'slashed_gutenberg/spacing_presets', $entries );
	}
}
