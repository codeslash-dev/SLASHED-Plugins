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

	const ALLOWED_BUNDLES  = array( 'essential', 'optimal', 'full' );

	const ALLOWED_SOURCES  = array( 'local', 'cdn' );

	/**
	 * Read settings from the database, applying defaults.
	 *
	 * @return array{integrations: array<string, bool>, css_bundle: string, css_source: string, cdn_version: string}
	 */
	public static function get() {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return array(
			'integrations' => self::get_integrations( $stored ),
			'css_bundle'   => self::get_css_bundle( $stored ),
			'css_source'   => self::get_css_source( $stored ),
			'cdn_version'  => self::get_cdn_version( $stored ),
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
		$bundle = isset( $stored['css_bundle'] ) ? (string) $stored['css_bundle'] : 'optimal';
		return in_array( $bundle, self::ALLOWED_BUNDLES, true ) ? $bundle : 'optimal';
	}

	/**
	 * Get the configured CSS source mode.
	 *
	 * @param array|null $stored Pre-fetched stored option.
	 * @return string 'local' or 'cdn'.
	 */
	public static function get_css_source( $stored = null ) {
		if ( null === $stored ) {
			$stored = get_option( self::OPTION_KEY, array() );
			if ( ! is_array( $stored ) ) {
				$stored = array();
			}
		}
		$source = isset( $stored['css_source'] ) ? (string) $stored['css_source'] : 'local';
		return in_array( $source, self::ALLOWED_SOURCES, true ) ? $source : 'local';
	}

	/**
	 * Get the configured CDN version.
	 *
	 * Returns the literal string 'latest' to track the newest release, or a
	 * normalized version tag (e.g. "v0.5.0"). Falls back to the compile-time
	 * ref when unset/invalid.
	 *
	 * @param array|null $stored Pre-fetched stored option.
	 * @return string 'latest' or a "vX.Y.Z" tag.
	 */
	public static function get_cdn_version( $stored = null ) {
		if ( null === $stored ) {
			$stored = get_option( self::OPTION_KEY, array() );
			if ( ! is_array( $stored ) ) {
				$stored = array();
			}
		}
		$ver = isset( $stored['cdn_version'] ) ? trim( (string) $stored['cdn_version'] ) : '';
		if ( 'latest' === strtolower( $ver ) ) {
			return 'latest';
		}
		if ( ! $ver || ! preg_match( '/^v?\d+\.\d+\.\d+[a-zA-Z0-9.-]*$/', $ver ) ) {
			return SLASHED_CSS_REF;
		}
		return 'v' . ltrim( $ver, 'v' );
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

		$bundle = isset( $data['css_bundle'] ) ? (string) $data['css_bundle'] : 'optimal';
		if ( ! in_array( $bundle, self::ALLOWED_BUNDLES, true ) ) {
			$bundle = 'optimal';
		}

		$source = isset( $data['css_source'] ) ? (string) $data['css_source'] : 'local';
		if ( ! in_array( $source, self::ALLOWED_SOURCES, true ) ) {
			$source = 'local';
		}

		$cdn_version = isset( $data['cdn_version'] ) ? (string) $data['cdn_version'] : '';
		if ( $cdn_version && preg_match( '/^v?\d+\.\d+\.\d+[a-zA-Z0-9.-]*$/', $cdn_version ) ) {
			$cdn_version = 'v' . ltrim( $cdn_version, 'v' );
		} else {
			$cdn_version = '';
		}

		return update_option( self::OPTION_KEY, array(
			'integrations' => $integrations,
			'css_bundle'   => $bundle,
			'css_source'   => $source,
			'cdn_version'  => $cdn_version,
		) );
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
		$bundle = (string) $bundle;
		if ( ! in_array( $bundle, self::ALLOWED_BUNDLES, true ) ) {
			$bundle = 'optimal';
		}

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
