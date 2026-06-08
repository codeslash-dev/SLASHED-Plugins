<?php
/**
 * Bricks inventory — thin subclass of the shared Slashed_Inventory.
 *
 * The resolution / caching / categorization logic is builder-agnostic and now
 * lives in the shared includes/class-inventory.php. This subclass overrides
 * only the per-integration configuration so the Bricks integration keeps its
 * historical behaviour exactly:
 *
 *   - the `slashed_bricks/inventory` and `slashed_bricks/inventory_local_path`
 *     filter names,
 *   - the `slashed_bricks_inv_` transient prefix,
 *   - SLASHED_BRICKS_VERSION in cache keys,
 *   - the Bricks CSS URL resolver (so the `slashed_bricks/css_bundle_url`
 *     filter still chooses which bundle is parsed),
 *   - the Bricks URL→path mapping and bundled inventory.json fallback.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once SLASHED_BRICKS_PATH . '../../includes/class-inventory.php';

if ( ! class_exists( 'Slashed_Bricks_Inventory' ) ) {
	/**
	 * Class Slashed_Bricks_Inventory
	 */
	class Slashed_Bricks_Inventory extends Slashed_Inventory {

		/**
		 * Transient key prefix (preserves the historical Bricks key namespace).
		 */
		const TRANSIENT_PREFIX = 'slashed_bricks_inv_';

		protected static function transient_prefix() {
			return self::TRANSIENT_PREFIX;
		}

		protected static function inv_version() {
			return SLASHED_BRICKS_VERSION;
		}

		protected static function filter_slug() {
			return 'slashed_bricks';
		}

		protected static function resolve_css_url() {
			return function_exists( 'slashed_bricks_get_css_url' )
				? slashed_bricks_get_css_url()
				: '';
		}

		protected static function url_path_pairs() {
			return array( array( SLASHED_BRICKS_URL, SLASHED_BRICKS_PATH ) );
		}

		protected static function fallback_json_path() {
			$path = SLASHED_BRICKS_PATH . 'data/inventory.json';
			return file_exists( $path ) ? $path : '';
		}
	}
}
