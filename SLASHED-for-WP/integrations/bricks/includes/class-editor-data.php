<?php
/**
 * Pass SLASHED editor data to the Bricks builder via wp_localize_script.
 *
 * Separated from reBEMer's enqueue class so the data layer is independent
 * of the asset-loading mechanism. Hooks at priority 10000 — after the
 * reBEMer script is registered at 9999 — so the handle always exists.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Slashed_Bricks_Editor_Data {

	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'localize' ), 10000 );
	}

	public function localize() {
		if ( ! function_exists( 'bricks_is_builder_main' ) || ! bricks_is_builder_main() ) {
			return;
		}
		if ( ! current_user_can( 'bricks_full_access' ) && ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( ! wp_script_is( Slashed_Bricks_ReBEMer_Enqueue::SCRIPT_HANDLE, 'enqueued' ) ) {
			return;
		}

		$plugin_settings = Slashed_Token_Store::get_plugin_settings();

		/**
		 * Toggle the variable-picker colour swatches.
		 *
		 * Swatches are painted builder-side onto each `--sf-color-*` entry
		 * in the Bricks variable dropdown and never touch `:root`, so
		 * dark/light stays framework-driven. Filter to false to disable.
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
		 * @param bool $enabled Default true.
		 */
		$show_color_panel = (bool) apply_filters( 'slashed_bricks/show_color_panel', true );

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
			Slashed_Bricks_ReBEMer_Enqueue::SCRIPT_HANDLE,
			'slashedBricksEditor',
			array(
				'showClassHints'    => ! empty( $plugin_settings['show_class_hints'] ),
				'classHints'        => Slashed_Token_Page::get_class_hints(),
				'showColorSwatches' => $show_color_swatches,
				'colorHexMap'       => $color_hex_map,
				'showColorPanel'    => $show_color_panel,
				'colorPanel'        => $color_panel_data,
				'variableHints'     => self::get_variable_hints(),
			)
		);
	}

	/**
	 * Build the variable hint map for the editor.
	 *
	 * Keys are native variable names without the leading '--', matching
	 * how Bricks stores variables (e.g. 'sf-color-primary'). Each entry
	 * carries the category so the editor can render a contextual tooltip.
	 *
	 * @return array<string, array{category: string}>
	 */
	public static function get_variable_hints() {
		if ( ! class_exists( 'Slashed_Bricks_Inventory' ) ) {
			return array();
		}

		$hints = array();
		foreach ( Slashed_Bricks_Inventory::get_variables_by_category() as $category => $vars ) {
			foreach ( $vars as $var ) {
				$native          = ltrim( $var, '-' );
				$hints[ $native ] = array( 'category' => $category );
			}
		}

		/**
		 * Filter the variable hint map passed to the Bricks editor.
		 *
		 * @param array $hints Map of native-name => { category }.
		 */
		return apply_filters( 'slashed_bricks/variable_hints', $hints );
	}
}
