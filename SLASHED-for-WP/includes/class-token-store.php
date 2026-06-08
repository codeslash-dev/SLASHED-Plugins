<?php
/**
 * Persistence layer for SLASHED design-token overrides.
 *
 * Owns the option names and read/write paths used by every admin surface
 * (Svelte SPA, REST controller). Centralising this in one class means the
 * rest of the codebase never names get_option('slashed_tokens') directly.
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
	 * Option name for storing token overrides (per-section maps).
	 *
	 * Shape: array<string, array<string,string>> keyed by section slug
	 * ("colors", "typography"…) then by token key.
	 */
	const OPTION_NAME = 'slashed_tokens';

	/**
	 * Legacy option name, used only for one-time migration on first read.
	 */
	const LEGACY_OPTION_NAME = 'slashed_bricks_tokens';

	/**
	 * Option name for plugin-level behavioural settings (html_font_size,
	 * show_class_hints, etc.). Kept separate from token overrides so
	 * "Reset all tokens" doesn't wipe non-token preferences.
	 */
	const SETTINGS_OPTION_NAME = 'slashed_bricks_settings';

	/**
	 * Allowed values for the css_bundle plugin setting.
	 */
	const ALLOWED_CSS_BUNDLES = array( 'essential', 'optimal', 'full' );

	/**
	 * Read all token overrides.
	 *
	 * Transparently migrates data from the legacy 'slashed_bricks_tokens'
	 * option on first call so existing users keep their saved tokens.
	 *
	 * @return array
	 */
	public static function get_settings() {
		$settings = get_option( self::OPTION_NAME, null );

		// One-time migration from the old Bricks-namespaced option.
		if ( null === $settings ) {
			$legacy = get_option( self::LEGACY_OPTION_NAME, array() );
			if ( is_array( $legacy ) && ! empty( $legacy ) ) {
				update_option( self::OPTION_NAME, $legacy );
				delete_option( self::LEGACY_OPTION_NAME );
				return $legacy;
			}
			return array();
		}

		return is_array( $settings ) ? $settings : array();
	}

	/**
	 * Persist the full token overrides map.
	 *
	 * @param array $settings Full settings map (pre-sanitized).
	 */
	public static function update_settings( array $settings ) {
		update_option( self::OPTION_NAME, $settings );
	}

	/**
	 * Update a single section in-place.
	 *
	 * @param string $section          Section slug ("colors" etc.).
	 * @param array  $sanitized_values Already-sanitized values for the section.
	 * @return array The full settings map post-write.
	 */
	public static function update_section( $section, array $sanitized_values ) {
		$all             = self::get_settings();
		$all[ $section ] = $sanitized_values;
		self::update_settings( $all );
		return $all;
	}

	/**
	 * Drop overrides for one section so framework defaults apply again.
	 *
	 * @param string $section Section slug.
	 * @return array Settings map post-delete.
	 */
	public static function delete_section( $section ) {
		$all = self::get_settings();
		unset( $all[ $section ] );
		self::update_settings( $all );
		return $all;
	}

	/**
	 * Drop the entire token overrides option ("Reset all").
	 */
	public static function delete_settings() {
		delete_option( self::OPTION_NAME );
		delete_option( self::LEGACY_OPTION_NAME );
	}

	/**
	 * Default values for plugin settings.
	 * Merged with stored settings so new keys are always present.
	 */
	const PLUGIN_SETTING_DEFAULTS = array(
		'html_font_size'   => '',
		'css_bundle'       => 'optimal',
		'show_class_hints' => false,
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
		if ( isset( $settings['css_bundle'] ) && class_exists( 'Slashed_Settings' ) ) {
			Slashed_Settings::set_css_bundle( $settings['css_bundle'] );
			unset( $settings['css_bundle'] );
		}
		update_option( self::SETTINGS_OPTION_NAME, $settings );
	}
}
