<?php
/**
 * Shared CSS bundle resolution for all SLASHED integrations.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_CSS_Loader
 *
 * Builder-agnostic helper used by every integration to locate the correct
 * SLASHED CSS bundle. Integrations call these methods instead of duplicating
 * CDN/local-path logic. They may then apply their own filter on top of the
 * returned URL to allow per-integration overrides.
 *
 * In standalone mode (integration plugin activated without slashed.php) this
 * class is not loaded and each integration falls back to its own inline logic.
 * Adding a new integration never touches this file.
 */
class Slashed_CSS_Loader {

	/**
	 * Get the configured CSS bundle variant.
	 *
	 * Delegates to Slashed_Settings::get_css_bundle(), which validates the
	 * value against the canonical allowlist and falls back to 'optimal'.
	 *
	 * @return string One of 'essential', 'optimal', 'full'.
	 */
	public static function get_bundle() {
		return Slashed_Settings::get_css_bundle();
	}

	/**
	 * Get the URL for the SLASHED CSS bundle.
	 *
	 * When source is 'local' (default) the plugin's own dist/ directory is used.
	 * When source is 'cdn' the URL points at the framework's published artifacts:
	 *   - version "latest" → the always-current jsDelivr `dist` branch mirror;
	 *   - a pinned version tag → that release's GitHub Release asset (immutable).
	 * No silent CDN fallback — if the local file is missing the URL is empty so
	 * the admin notice in class-admin.php can surface the problem clearly.
	 *
	 * Applies the 'slashed/css_bundle_url' filter so site owners can override
	 * the URL globally. Integrations apply their own filter on top of this
	 * return value when per-integration overrides are needed.
	 *
	 * @return string
	 */
	public static function get_url() {
		$source   = Slashed_Settings::get_css_source();
		$bundle   = self::get_bundle();
		$filename = 'slashed.' . $bundle . '.css';

		if ( 'cdn' === $source ) {
			$version = Slashed_Settings::get_cdn_version();
			if ( 'latest' === $version ) {
				// Always-current: the framework force-pushes built bundles to the
				// `dist` branch on every release; jsDelivr mirrors it.
				$url = sprintf(
					'https://cdn.jsdelivr.net/gh/codeslash-dev/SLASHED@dist/%s',
					$filename
				);
			} else {
				// Pinned: load the exact version's GitHub Release asset (immutable).
				$url = sprintf(
					'https://github.com/codeslash-dev/SLASHED/releases/download/%s/%s',
					rawurlencode( $version ),
					$filename
				);
			}
		} else {
			$local = SLASHED_PATH . 'dist/' . $filename;
			$url   = file_exists( $local ) ? SLASHED_URL . 'dist/' . $filename : '';
		}

		/**
		 * Filter the SLASHED CSS bundle URL (all integrations).
		 *
		 * For a per-integration override, use slashed_bricks/css_bundle_url,
		 * slashed_gutenberg/css_bundle_url, etc. instead.
		 *
		 * @param string $url URL to the CSS bundle file.
		 */
		return apply_filters( 'slashed/css_bundle_url', $url );
	}

	/**
	 * Derive a cache-busting version string for a resolved CSS URL.
	 *
	 * Returns the file's mtime when the URL maps to a local file under
	 * SLASHED_PATH; falls back to SLASHED_VERSION for CDN or unknown URLs.
	 *
	 * @param string $url Resolved CSS bundle URL.
	 * @return string
	 */
	public static function get_version( $url ) {
		// Check if URL maps to the local dist/ directory.
		if ( 0 === strpos( $url, SLASHED_URL . 'dist/' ) ) {
			$relative = substr( $url, strlen( SLASHED_URL . 'dist/' ) );
			$path     = SLASHED_PATH . 'dist/' . $relative;
			if ( file_exists( $path ) ) {
				return (string) filemtime( $path );
			}
		}
		return SLASHED_VERSION;
	}
}
