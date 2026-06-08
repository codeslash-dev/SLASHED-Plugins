<?php
/**
 * REST endpoint: list fonts registered in Bricks Builder.
 *
 * Returns fonts that Bricks already knows how to serve (custom uploaded,
 * Adobe Fonts) so the SLASHED typography tab can show a "Bricks fonts"
 * dropdown rather than requiring users to type family names by hand.
 *
 * SLASHED never loads fonts itself — Bricks owns that pipeline, including
 * any "serve locally" / GDPR configuration the user has chosen.
 *
 * Route
 * -----
 *   GET /wp-json/slashed/v1/bricks-fonts
 *   Auth: manage_options (same gate as every other SLASHED endpoint)
 *
 * Response shape
 * --------------
 *   { "fonts": [ { "family": "Inter", "label": "Inter", "source": "custom" }, … ] }
 *
 * `source` is informational only — the SPA uses it to group/badge fonts.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Slashed_Bricks_Fonts_REST {

	const NAMESPACE = 'slashed/v1';

	public function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/bricks-fonts',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_fonts' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);

		// Note: the CPT font-cache invalidation hook
		// (save_post_{<font CPT slug>}, see
		// Slashed_Token_Page::get_bricks_fonts_post_type()) is registered from
		// the always-loaded plugins_loaded bootstrap in slashed-bricks.php, not
		// here — rest_api_init only fires during REST dispatch, so registering
		// it here would miss normal admin saves and leave a stale cache.
	}

	public function check_permissions() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Return the Bricks font list as a REST response.
	 *
	 * Thin wrapper over the canonical collector
	 * Slashed_Token_Page::get_bricks_fonts(), which is shared with the admin
	 * SPA bootstrap so the dropdown and this endpoint never drift apart. See
	 * that method for the full enumeration/caching notes.
	 *
	 * @param WP_REST_Request $request Unused; the endpoint takes no parameters.
	 * @return WP_REST_Response { "fonts": [ { family, label, source }, … ] }
	 */
	public function get_fonts( WP_REST_Request $request ) {
		return rest_ensure_response( array( 'fonts' => Slashed_Token_Page::get_bricks_fonts() ) );
	}
}
