<?php
/**
 * Persistence layer for SLASHED design-token overrides.
 *
 * Owns the option names and read/write paths used by every admin surface
 * (Svelte SPA, REST controller). Centralising this in one class means the
 * rest of the codebase never names get_option('slashed_overrides') directly.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Token_Store
 *
 * Stateless wrapper around the two wp_options rows the plugin owns.
 * Every method is static — there is exactly one such store per WordPress install.
 */
class Slashed_Token_Store {

	/**
	 * Option name for plugin-level behavioural settings (html_font_size,
	 * show_class_hints, etc.). Kept separate from token overrides so
	 * "Reset all tokens" doesn't wipe non-token preferences.
	 */
	const SETTINGS_OPTION_NAME = 'slashed_bricks_settings';

	/**
	 * Option name for the flat token-override map written by the in-WordPress
	 * configurator (Design Settings → POST /tokens/overrides).
	 *
	 * Shape: array<string,string> keyed by full custom-property name, e.g.
	 * array( '--sf-color-primary-source-light' => 'oklch(0.7 0.15 250)' ).
	 * This is the single source of truth for design-token customisation.
	 */
	const OVERRIDES_OPTION_NAME = 'slashed_overrides';

	/**
	 * Allowed values for the css_bundle plugin setting.
	 */
	const ALLOWED_CSS_BUNDLES = array( 'optimal', 'optimal-components', 'optimal-utilities', 'full' );

	/**
	 * Read the flat configurator override map.
	 *
	 * @return array<string,string> Always an array (empty when unset/corrupt).
	 */
	public static function get_overrides() {
		$overrides = get_option( self::OVERRIDES_OPTION_NAME, array() );
		return is_array( $overrides ) ? $overrides : array();
	}

	/**
	 * Persist the flat configurator override map.
	 *
	 * @param array $overrides Already-sanitized { "--name" => "value" } map.
	 */
	public static function update_overrides( array $overrides ) {
		update_option( self::OVERRIDES_OPTION_NAME, $overrides );
	}

	/**
	 * Drop the flat configurator override map.
	 */
	public static function delete_overrides() {
		delete_option( self::OVERRIDES_OPTION_NAME );
	}

	/**
	 * Default values for plugin settings.
	 * Merged with stored settings so new keys are always present.
	 */
	const PLUGIN_SETTING_DEFAULTS = array(
		'html_font_size'         => '',
		'css_bundle'             => 'optimal',
		'show_class_hints'       => false,
		'configurator_url'       => '',
		// reBEMer master switch: when false the in-builder BEM badges/panel are
		// not injected (the rest of the Bricks integration is unaffected).
		'rebemer_enabled'        => true,
		// Whether the bottom-right "Colors" launcher pill (Color System panel
		// shortcut) is shown in the Bricks builder.
		'show_color_panel'       => true,
		// reBEMer: sparse Bricks-type → BEM-name overrides ({} = built-in
		// defaults only). Layout containers default to their own Bricks type
		// (container/section/div/block) unless overridden here.
		'rebemer_element_map'    => array(),
	);

	/**
	 * Read plugin behavioural settings (html_font_size, show_class_hints, etc.).
	 * Always returns a complete map including defaults for missing keys.
	 *
	 * In unified mode (Slashed_Settings present) css_bundle is sourced from the
	 * canonical `slashed_settings` option — the same value Slashed_CSS_Loader
	 * reads — so the SPA's bundle control and the Settings page never diverge.
	 *
	 * @return array
	 */
	public static function get_plugin_settings() {
		$stored = get_option( self::SETTINGS_OPTION_NAME, array() );
		$stored = is_array( $stored ) ? $stored : array();
		// Drop any retired keys (e.g. the removed rebemer_container_mode) that
		// upgraded sites may still carry, so they never leak back into REST
		// responses or get re-written below.
		$stored = array_intersect_key( $stored, self::PLUGIN_SETTING_DEFAULTS );
		$merged = array_merge( self::PLUGIN_SETTING_DEFAULTS, $stored );

		// css_bundle is owned by Slashed_Settings whenever the shared layer is
		// loaded; mirror it here so the SPA reflects the bundle actually served.
		if ( class_exists( 'Slashed_Settings' ) ) {
			$merged['css_bundle'] = Slashed_Settings::get_css_bundle();
		}

		return $merged;
	}

	/**
	 * Persist plugin behavioural settings.
	 *
	 * css_bundle is routed to the canonical Slashed_Settings store (unified
	 * mode) so the change reaches Slashed_CSS_Loader; the local
	 * `slashed_bricks_settings` row keeps only the SPA-owned preferences.
	 * In standalone mode (no Slashed_Settings) css_bundle stays in the local
	 * row as before.
	 *
	 * @param array $settings Plugin settings map.
	 */
	public static function update_plugin_settings( array $settings ) {
		// Persist only known keys so retired settings are stripped on write.
		$settings = array_intersect_key( $settings, self::PLUGIN_SETTING_DEFAULTS );
		if ( isset( $settings['css_bundle'] ) && class_exists( 'Slashed_Settings' ) ) {
			Slashed_Settings::set_css_bundle( $settings['css_bundle'] );
			unset( $settings['css_bundle'] );
		}
		update_option( self::SETTINGS_OPTION_NAME, $settings );
	}
}
