<?php
/**
 * Enqueue the reBEMer editor bundle inside the Bricks builder panel.
 *
 * Builder-only, capability-gated, stable filenames + filemtime cache-bust.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Slashed_Bricks_ReBEMer_Enqueue {

	const SCRIPT_HANDLE = 'slashed-bricks-rebemer';
	const STYLE_HANDLE  = 'slashed-bricks-rebemer';
	const ASSET_DIR     = 'assets/editor-app/';

	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ), 9999 );
		add_filter( 'script_loader_tag', array( $this, 'mark_as_module' ), 10, 3 );
	}

	public function enqueue() {
		if ( ! function_exists( 'bricks_is_builder_main' ) || ! bricks_is_builder_main() ) {
			return;
		}
		if ( ! current_user_can( 'bricks_full_access' ) && ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$base_path = SLASHED_BRICKS_PATH . self::ASSET_DIR;
		$base_url  = SLASHED_BRICKS_URL . self::ASSET_DIR;

		$js_path = $base_path . 'app.js';
		if ( ! file_exists( $js_path ) ) {
			return; // Bundle not built yet.
		}

		$js_ver  = (string) filemtime( $js_path );
		$css_ver = file_exists( $base_path . 'app.css' ) ? (string) filemtime( $base_path . 'app.css' ) : $js_ver;

		wp_enqueue_style( self::STYLE_HANDLE, $base_url . 'app.css', array(), $css_ver );
		wp_enqueue_script( self::SCRIPT_HANDLE, $base_url . 'app.js', array(), $js_ver, true );

		$plugin_settings = Slashed_Token_Store::get_plugin_settings();

		/**
		 * Toggle the variable-picker colour swatches.
		 *
		 * Swatches are painted builder-side onto each `--sf-color-*` entry
		 * in the Bricks variable dropdown (see editor-app color-swatches.js)
		 * and never touch `:root`, so dark/light stays framework-driven.
		 * Filter to false to disable them.
		 *
		 * @param bool $enabled Default true.
		 */
		$show_color_swatches = (bool) apply_filters( 'slashed_bricks/show_color_swatches', true );

		$color_hex_map = ( $show_color_swatches && class_exists( 'Slashed_Bricks_Inventory' ) )
			? Slashed_Bricks_Inventory::get_color_hex_map()
			: array();

		/**
		 * Toggle the in-builder Color System panel.
		 *
		 * The panel (see editor-app ColorPanel.svelte) is a floating browser
		 * for the framework's `--sf-color-*` tokens that previews every
		 * token's light AND dark variant at once, applies a chosen colour to
		 * the selected element (text / background / border), and copies the
		 * `var(--sf-color-*)` reference. Filter to false to hide its launcher.
		 *
		 * @param bool $enabled Default true.
		 */
		$show_color_panel = (bool) apply_filters( 'slashed_bricks/show_color_panel', true );

		// The panel needs the ordered token list plus both hex maps to build
		// its grouped model and dual-mode swatches. Light reuses the swatch
		// map already resolved above when available.
		$color_panel_data = array(
			'variables' => array(),
			'light'     => array(),
			'dark'      => array(),
		);
		if ( $show_color_panel && class_exists( 'Slashed_Bricks_Inventory' ) ) {
			$color_panel_data['variables'] = Slashed_Bricks_Inventory::get_color_variables();
			$color_panel_data['light']     = ! empty( $color_hex_map )
				? $color_hex_map
				: Slashed_Bricks_Inventory::get_color_hex_map();
			$color_panel_data['dark']      = Slashed_Bricks_Inventory::get_color_hex_map_dark();
		}

		wp_localize_script(
			self::SCRIPT_HANDLE,
			'slashedBricksEditor',
			array(
				'showClassHints'    => ! empty( $plugin_settings['show_class_hints'] ),
				'classHints'        => Slashed_Token_Page::get_class_hints(),
				'showColorSwatches' => $show_color_swatches,
				'colorHexMap'       => $color_hex_map,
				'showColorPanel'    => $show_color_panel,
				'colorPanel'        => $color_panel_data,
			)
		);
	}

	public function mark_as_module( $tag, $handle, $src ) {
		if ( self::SCRIPT_HANDLE !== $handle ) {
			return $tag;
		}
		// Strip any existing type attribute to avoid duplicates on WP < 6.3.
		$tag = preg_replace( '/\stype=["\'][^"\']*["\']/', '', $tag, 1 );
		return str_replace( '<script ', '<script type="module" ', $tag );
	}
}
