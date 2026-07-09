<?php
/**
 * Unified settings store.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Settings
 *
 * Manages the `slashed_settings` option, which controls which builder
 * integrations are active. Each integration owns its own option for
 * builder-specific configuration (token overrides, bundle choice, etc.).
 *
 * Default: all known integrations enabled. Users opt-out of integrations
 * they do not use via the SLASHED settings page.
 */
class Slashed_Settings {

	const OPTION_KEY = 'slashed_settings';

	/**
	 * Integrations shipped with this version.
	 *
	 * @var string[]
	 */
	const KNOWN_INTEGRATIONS = array( 'bricks', 'gutenberg' );

	const ALLOWED_BUNDLES = array( 'optimal', 'full' );

	/**
	 * Retired bundle values mapped to their replacement.
	 *
	 * The framework reduced its delivery set to two bundles (optimal + full).
	 * 'essential' predated the optimal/full split; the component and utility
	 * tiers fold into 'full', which is a superset — so a site that had one of
	 * them selected keeps every rule it was already loading, just under the
	 * full bundle.
	 *
	 * @var array<string, string>
	 */
	const BUNDLE_MIGRATIONS = array(
		'essential'          => 'optimal',
		'optimal-components' => 'full',
		'optimal-utilities'  => 'full',
	);

	/**
	 * Normalise a raw bundle value: migrate retired names, then validate.
	 *
	 * @param mixed $bundle Raw stored/submitted bundle value.
	 * @return string A value guaranteed to be in self::ALLOWED_BUNDLES.
	 */
	public static function normalize_bundle( $bundle ) {
		$bundle = (string) $bundle;
		if ( isset( self::BUNDLE_MIGRATIONS[ $bundle ] ) ) {
			$bundle = self::BUNDLE_MIGRATIONS[ $bundle ];
		}
		return in_array( $bundle, self::ALLOWED_BUNDLES, true ) ? $bundle : 'optimal';
	}

	/**
	 * Read settings from the database, applying defaults.
	 *
	 * @return array{integrations: array<string, bool>, css_bundle: string, css_flat: bool}
	 */
	public static function get() {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return array(
			'integrations' => self::get_integrations( $stored ),
			'css_bundle'   => self::get_css_bundle( $stored ),
			'css_flat'     => self::get_css_flat( $stored ),
		);
	}

	/**
	 * Get the configured CSS bundle variant.
	 *
	 * Reads from shared settings; defaults to 'optimal'.
	 * Called directly by Slashed_CSS_Loader so integrations do not need to
	 * implement bundle resolution themselves.
	 *
	 * @param array|null $stored Pre-fetched stored option (avoids double DB read).
	 * @return string
	 */
	public static function get_css_bundle( $stored = null ) {
		if ( null === $stored ) {
			$stored = get_option( self::OPTION_KEY, array() );
			if ( ! is_array( $stored ) ) {
				$stored = array();
			}
		}
		$bundle = isset( $stored['css_bundle'] ) ? $stored['css_bundle'] : 'optimal';
		return self::normalize_bundle( $bundle );
	}

	/**
	 * Whether the flat CSS variant is enabled.
	 *
	 * Flat bundles omit @layer declarations, improving compatibility with themes
	 * and plugins that do not support CSS cascade layers.
	 *
	 * @param array|null $stored Pre-fetched stored option.
	 * @return bool
	 */
	public static function get_css_flat( $stored = null ) {
		if ( null === $stored ) {
			$stored = get_option( self::OPTION_KEY, array() );
			if ( ! is_array( $stored ) ) {
				$stored = array();
			}
		}
		return ! empty( $stored['css_flat'] );
	}

	/**
	 * Whether a given integration is enabled.
	 *
	 * Defaults to true so a fresh install activates every integration;
	 * users explicitly disable what they do not need.
	 *
	 * @param string $integration Integration slug (e.g. 'bricks', 'gutenberg').
	 * @return bool
	 */
	public static function is_enabled( $integration ) {
		$settings = self::get();
		$flags    = $settings['integrations'];
		// Unknown integrations default to false (future-compat: a new integration
		// added in a later release should not silently activate on upgrade).
		if ( ! in_array( $integration, self::KNOWN_INTEGRATIONS, true ) ) {
			return false;
		}
		return isset( $flags[ $integration ] ) ? (bool) $flags[ $integration ] : true;
	}

	/**
	 * Persist new settings values.
	 *
	 * Only known, sanitized keys are written. Unrecognised keys are silently
	 * dropped to prevent arbitrary data from landing in the option.
	 *
	 * @param array $data Raw submitted data (e.g. from $_POST).
	 * @return bool True if the value was updated, false if unchanged or invalid.
	 */
	public static function save( array $data ) {
		$integrations = array();
		foreach ( self::KNOWN_INTEGRATIONS as $slug ) {
			$integrations[ $slug ] = ! empty( $data['integrations'][ $slug ] );
		}

		// Migrate retired bundle names on save so they are never re-stored.
		$bundle = self::normalize_bundle( isset( $data['css_bundle'] ) ? $data['css_bundle'] : 'optimal' );

		$flat = ! empty( $data['css_flat'] );

		return update_option(
			self::OPTION_KEY,
			array(
				'integrations' => $integrations,
				'css_bundle'   => $bundle,
				'css_flat'     => $flat,
			)
		);
	}

	/**
	 * Update only the css_bundle value, preserving all other settings.
	 *
	 * Targeted setter used when a single surface (e.g. the token SPA) needs to
	 * change the bundle without rewriting integration flags / source / version.
	 *
	 * @param string $bundle One of self::ALLOWED_BUNDLES.
	 * @return bool True if the option was updated.
	 */
	public static function set_css_bundle( $bundle ) {
		$bundle = self::normalize_bundle( $bundle );

		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}
		$stored['css_bundle'] = $bundle;

		return update_option( self::OPTION_KEY, $stored );
	}

	/**
	 * @param array $stored Raw stored option value.
	 * @return array<string, bool>
	 */
	private static function get_integrations( array $stored ) {
		$flags = isset( $stored['integrations'] ) && is_array( $stored['integrations'] )
			? $stored['integrations']
			: array();

		$result = array();
		foreach ( self::KNOWN_INTEGRATIONS as $slug ) {
			// Default true: new installs run all integrations until turned off.
			$result[ $slug ] = isset( $flags[ $slug ] ) ? (bool) $flags[ $slug ] : true;
		}
		return $result;
	}
}
