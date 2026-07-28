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
	 * @return string One of 'optimal', 'full'.
	 */
	public static function get_bundle() {
		return Slashed_Settings::get_css_bundle();
	}

	/**
	 * Get the URL for the SLASHED CSS bundle.
	 *
	 * The framework CSS ships with the plugin in its own dist/ directory and is
	 * always served locally. Serves the minified bundle by default; falls back
	 * to the unminified (readable) bundle when SCRIPT_DEBUG is enabled, mirroring
	 * WordPress core's own convention for its bundled assets. If the resolved
	 * bundle file is missing the URL is empty so the admin notice in
	 * class-admin.php can surface the problem clearly.
	 *
	 * Applies the 'slashed/css_bundle_url' filter so site owners can override
	 * the URL globally. Integrations apply their own filter on top of this
	 * return value when per-integration overrides are needed.
	 *
	 * @return string
	 */
	public static function get_url() {
		$bundle   = self::get_bundle();
		$flat     = Slashed_Settings::get_css_flat();
		$debug    = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG;
		$filename = 'slashed.' . $bundle . ( $flat ? '.flat' : '' ) . ( $debug ? '' : '.min' ) . '.css';

		$local = SLASHED_PATH . 'dist/' . $filename;
		$url   = file_exists( $local ) ? SLASHED_URL . 'dist/' . $filename : '';

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
	 * Whether the served bundle carries @layer, so inline CSS added on top of
	 * the `slashed-framework` handle should be wrapped in a framework layer.
	 *
	 * False when the flat variant is enabled: those bundles are the same rules
	 * with every @layer stripped, and an unlayered declaration beats ANY layered
	 * one regardless of specificity or source order. Inline CSS that keeps its
	 * @layer wrapper is therefore silently inert against a flat bundle — which
	 * is how token overrides and the builder dark-mode bridges stopped reaching
	 * the page whenever flat mode was switched on.
	 *
	 * @return bool
	 */
	public static function layers_enabled() {
		return ! Slashed_Settings::get_css_flat();
	}

	/**
	 * Wrap inline CSS in a framework cascade layer, or return it unlayered when
	 * the flat bundle is being served (see layers_enabled()).
	 *
	 * @param string $layer Layer name, e.g. 'slashed.themes'.
	 * @param string $css   Rules to wrap.
	 * @return string
	 */
	public static function wrap_layer( $layer, $css ) {
		return self::layers_enabled() ? '@layer ' . $layer . '{' . $css . '}' : $css;
	}

	/**
	 * Derive a cache-busting version string for a resolved CSS URL.
	 *
	 * Returns the file's mtime when the URL maps to a local file under
	 * SLASHED_PATH; falls back to the bundled framework reference otherwise.
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
		// For any URL set by a filter override, fall back to the framework
		// reference this plugin ships with. Never use SLASHED_VERSION here —
		// that is the plugin version, not the framework.
		return SLASHED_CSS_REF;
	}
}
