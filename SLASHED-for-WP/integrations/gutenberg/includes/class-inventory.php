<?php
/**
 * Gutenberg inventory — thin subclass of the shared Slashed_Inventory.
 *
 * Shares all resolution / caching / categorization / color-resolving logic
 * with the Bricks integration via the shared includes/class-inventory.php, so
 * the block editor sees exactly the same token set the active CSS bundle
 * ships. Overrides only the per-integration configuration:
 *
 *   - the `slashed_gutenberg/inventory` filter names,
 *   - the `slashed_gutenberg_inv_` transient prefix,
 *   - the Gutenberg CSS URL resolver (so the `slashed_gutenberg/css_bundle_url`
 *     filter chooses which bundle is parsed),
 *   - standalone-mode version / path fallbacks.
 *
 * @package SLASHED_Gutenberg
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once SLASHED_GUTENBERG_PATH . '../../includes/class-inventory.php';

if ( ! class_exists( 'Slashed_Gutenberg_Inventory' ) ) {
	/**
	 * Class Slashed_Gutenberg_Inventory
	 */
	class Slashed_Gutenberg_Inventory extends Slashed_Inventory {

		protected static function transient_prefix() {
			return 'slashed_gutenberg_inv_';
		}

		protected static function inv_version() {
			if ( defined( 'SLASHED_VERSION' ) ) {
				return SLASHED_VERSION;
			}
			return defined( 'SLASHED_GUTENBERG_VERSION' ) ? SLASHED_GUTENBERG_VERSION : '0';
		}

		protected static function filter_slug() {
			return 'slashed_gutenberg';
		}

		protected static function resolve_css_url() {
			return function_exists( 'slashed_gutenberg_get_css_url' )
				? slashed_gutenberg_get_css_url()
				: '';
		}

		protected static function url_path_pairs() {
			$pairs = array();
			// Unified plugin root first (the CSS loader serves from there).
			if ( defined( 'SLASHED_URL' ) && defined( 'SLASHED_PATH' ) ) {
				$pairs[] = array( SLASHED_URL, SLASHED_PATH );
			}
			// Standalone: the integration plugin's own URL space.
			if ( defined( 'SLASHED_GUTENBERG_URL' ) && defined( 'SLASHED_GUTENBERG_PATH' ) ) {
				$pairs[] = array( SLASHED_GUTENBERG_URL, SLASHED_GUTENBERG_PATH );
			}
			return $pairs;
		}

		protected static function fallback_json_path() {
			$candidates = array();
			if ( defined( 'SLASHED_PATH' ) ) {
				$candidates[] = SLASHED_PATH . 'data/inventory.json';
			}
			if ( defined( 'SLASHED_GUTENBERG_PATH' ) ) {
				// Standalone: plugin-root data/ (two levels up from this file).
				$candidates[] = SLASHED_GUTENBERG_PATH . '../../data/inventory.json';
			}
			foreach ( $candidates as $candidate ) {
				if ( file_exists( $candidate ) ) {
					return $candidate;
				}
			}
			return '';
		}
	}
}
