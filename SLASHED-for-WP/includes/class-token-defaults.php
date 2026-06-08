<?php
/**
 * Token default values for the SLASHED framework.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Token_Defaults
 *
 * Provides factory default values for all editable design tokens,
 * organized by section for use in the admin settings page.
 */
class Slashed_Token_Defaults {

	/**
	 * Get all default token values organized by section.
	 *
	 * @return array Associative array keyed by section slug.
	 */
	public static function get_all() {
		return array(
			'colors'     => self::get_colors(),
			'contrast'   => self::get_contrast(),
			'typography' => self::get_typography(),
			'spacing'    => self::get_spacing(),
			'layouts'    => self::get_layouts(),
			'radius'     => self::get_radius(),
			'shadows'    => self::get_shadows(),
			'motion'     => self::get_motion(),
			'zindex'     => self::get_zindex(),
		);
	}

	/**
	 * Get defaults for a specific section.
	 *
	 * @param string $section Section slug.
	 * @return array Section defaults or empty array.
	 */
	public static function get_section( $section ) {
		$all = self::get_all();
		return isset( $all[ $section ] ) ? $all[ $section ] : array();
	}

	/**
	 * Get color token defaults.
	 *
	 * Brand and status defaults are stored as oklch() strings (the
	 * authoring format the framework was designed around). The
	 * accompanying *_hex_hints maps provide approximate HEX equivalents
	 * used purely for the admin color picker preview - so the picker
	 * has something concrete to display when no override is saved.
	 *
	 * Hex hints are intentionally rough sRGB approximations; they are
	 * never written to CSS unless the user explicitly picks them.
	 *
	 * @return array
	 */
	public static function get_colors() {
		return array(
			'brand' => array(
				'primary'   => 'oklch(0.47 0.27 264)',
				'secondary' => 'oklch(0.22 0.04 264)',
				'tertiary'  => 'oklch(0.42 0.22 295)',
				'action'    => 'oklch(0.50 0.22 235)',
				'neutral'   => 'oklch(0.52 0.025 260)',
				'base'      => 'oklch(0.96 0.006 250)',
			),
			'brand_dark' => array(
				'primary'   => '',
				'secondary' => '',
				'tertiary'  => '',
				'action'    => '',
				'neutral'   => '',
				'base'      => '',
			),
			'status' => array(
				'success' => 'oklch(0.50 0.16 145)',
				'warning' => 'oklch(0.75 0.17 80)',
				'error'   => 'oklch(0.50 0.20 25)',
				'info'    => 'oklch(0.48 0.18 235)',
				'danger'  => 'oklch(0.48 0.22 12)',
			),
			'status_dark' => array(
				'success' => '',
				'warning' => '',
				'error'   => '',
				'info'    => '',
				'danger'  => '',
			),
			'brand_hex_hints' => array(
				'primary'   => '#4a30d0',
				'secondary' => '#141530',
				'tertiary'  => '#5c20cc',
				'action'    => '#1c58cc',
				'neutral'   => '#5e6880',
				'base'      => '#f8f9ff',
			),
			'brand_dark_hex_hints' => array(
				'primary'   => '#9080f0',
				'secondary' => '#c0c8e0',
				'tertiary'  => '#b07ae8',
				'action'    => '#6098f0',
				'neutral'   => '#8a96b4',
				'base'      => '#141924',
			),
			'status_hex_hints' => array(
				'success' => '#1a8040',
				'warning' => '#ca8a04',
				'error'   => '#c42010',
				'info'    => '#1a5ec8',
				'danger'  => '#c82010',
			),
			'status_dark_hex_hints' => array(
				'success' => '#40d068',
				'warning' => '#fbbf24',
				'error'   => '#f07060',
				'info'    => '#5898f0',
				'danger'  => '#f06050',
			),
		);
	}

	/**
	 * Get typography token defaults.
	 *
	 * @return array
	 */
	public static function get_typography() {
		return array(
			'font_families' => array(
				'body'      => 'system-ui, -apple-system, sans-serif',
				'heading'   => 'var(--sf-font-body)',
				'mono'      => 'ui-monospace, monospace',
				'display'   => 'var(--sf-font-heading)',
				'humanist'  => '"Seravek", "Gill Sans Nova", "Ubuntu", "Calibri", "DejaVu Sans", source-sans-pro, sans-serif',
				'geometric' => '"Avenir", "Montserrat", "Corbel", "URW Gothic", source-sans-pro, sans-serif',
				'slab'      => '"Rockwell", "Rockwell Nova", "Roboto Slab", "DejaVu Serif", "Sitka Small", serif',
			),
			'font_sizes' => array(
				'2xs'       => array( 'min' => 0.51, 'max' => 0.53 ),
				'xs'        => array( 'min' => 0.64, 'max' => 0.70 ),
				's'         => array( 'min' => 0.80, 'max' => 0.94 ),
				'm'         => array( 'min' => 1.00, 'max' => 1.25 ),
				'l'         => array( 'min' => 1.25, 'max' => 1.67 ),
				'xl'        => array( 'min' => 1.56, 'max' => 2.22 ),
				'2xl'       => array( 'min' => 1.95, 'max' => 2.96 ),
				'3xl'       => array( 'min' => 2.44, 'max' => 3.95 ),
				'4xl'       => array( 'min' => 3.05, 'max' => 5.26 ),
				'display-s' => array( 'min' => 2.40, 'max' => 3.00 ),
				'display-m' => array( 'min' => 3.00, 'max' => 4.00 ),
				'display-l' => array( 'min' => 3.75, 'max' => 5.33 ),
			),
			'scale_multipliers' => array(
				'text_scale'         => 1,
				'text_display_scale' => 1,
			),
		);
	}

	/**
	 * Get spacing token defaults.
	 *
	 * @return array
	 */
	public static function get_spacing() {
		return array(
			'space_scale'    => 1,
			'viewport_min'   => 22.5,
			'viewport_max'   => 90,
			'space_sizes'    => array(
				'2xs' => array( 'min' => 0.51, 'max' => 0.84 ),
				'xs'  => array( 'min' => 0.64, 'max' => 1.13 ),
				's'   => array( 'min' => 0.80, 'max' => 1.50 ),
				'm'   => array( 'min' => 1.00, 'max' => 2.00 ),
				'l'   => array( 'min' => 1.25, 'max' => 2.67 ),
				'xl'  => array( 'min' => 1.56, 'max' => 3.55 ),
				'2xl' => array( 'min' => 1.95, 'max' => 4.74 ),
				'3xl' => array( 'min' => 2.44, 'max' => 6.31 ),
				'4xl' => array( 'min' => 3.05, 'max' => 8.42 ),
			),
			'gutter'         => 'var(--sf-space-l)',
			'gap'            => 'var(--sf-space-m)',
			'content_gap'    => 'var(--sf-space-s)',
			'component_pad'  => 'var(--sf-space-m)',
			'section_pad'    => 'var(--sf-section-pad--m)',
		);
	}

	/**
	 * Get layout token defaults.
	 *
	 * Values mirror the CSS variable defaults in core/tokens.layout.css
	 * and core/tokens.css so the admin placeholders match the framework.
	 *
	 * @return array
	 */
	public static function get_layouts() {
		return array(
			// Containers
			'container_narrow'    => '38rem',
			'container_prose'     => '65ch',
			'container_default'   => '75rem',
			'container_wide'      => '90rem',
			// Grid
			'grid_min'            => '16rem',
			'grid_min_xs'         => '10rem',
			'grid_min_s'          => '13rem',
			'grid_min_l'          => '20rem',
			'grid_min_xl'         => '24rem',
			'grid_min_2xl'        => '28rem',
			// Switcher
			'switcher_threshold'  => '30rem',
			// Bento
			'bento_cols'          => '3',
			'bento_row_default'   => '10rem',
			'bento_row_compact'   => '6rem',
			'bento_row_tall'      => '16rem',
			// Content grid
			'content_width'       => 'var(--sf-container-default)',
			'breakout_width'      => 'var(--sf-container-wide)',
			// Sidebar
			'sidebar_width'       => '18rem',
			'sidebar_min_width'   => '50%',
			// Cover
			'cover_min_height'    => '100dvh',
			'cover_padding'       => 'var(--sf-section-pad)',
			// Frame
			'frame_ratio'         => '16 / 9',
			// Reel
			'reel_item_width'     => 'max-content',
			'reel_height'         => 'auto',
			// Imposter
			'imposter_margin'     => 'var(--sf-space-m)',
			// Equal columns
			'equal_cols'          => '2',
			// Header & sticky (numeric rem values, empty = use framework default)
			'header_height_mobile'  => '',
			'header_height_desktop' => '',
			'sticky_offset_mobile'  => '',
			'sticky_offset_desktop' => '',
		);
	}

	/**
	 * Get radius token defaults.
	 *
	 * @return array
	 */
	public static function get_radius() {
		return array(
			'radius_scale' => 1,
		);
	}

	/**
	 * Get shadow token defaults.
	 *
	 * @return array
	 */
	public static function get_shadows() {
		return array(
			'shadow_strength' => 0.08,
			'glow_color'      => 'var(--sf-color-primary)',
		);
	}

	/**
	 * Get motion token defaults.
	 *
	 * @return array
	 */
	public static function get_motion() {
		return array(
			'motion_scale' => 1,
			'durations'    => array(
				'instant' => 100,
				'fast'    => 150,
				'normal'  => 250,
				'slow'    => 400,
				'slower'  => 600,
			),
		);
	}

	/**
	 * Get z-index token defaults.
	 *
	 * @return array
	 */
	public static function get_zindex() {
		return array(
			'below'  => -1,
			'base'   => 0,
			'raised' => 1,
			'low'    => 10,
			'mid'    => 100,
			'high'   => 500,
			'top'    => 900,
			'max'    => 9999,
		);
	}

	/**
	 * Get contrast / opacity / focus-ring token defaults.
	 *
	 * Cross-cutting visual fine-tuning knobs that don't belong to any
	 * one token family. Defaults mirror what core/tokens.css declares
	 * so the admin placeholders match what the framework would do
	 * without any overrides at all.
	 *
	 * @return array
	 */
	public static function get_contrast() {
		return array(
			'contrast_bias'      => 0,
			'contrast_threshold' => 0.6,
			'opacity_disabled'   => 0.45,
			'focus_ring_width'   => 2,
			'focus_ring_offset'  => 2,
			'focus_ring_style'   => 'solid',
		);
	}
}
