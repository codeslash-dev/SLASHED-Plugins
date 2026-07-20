<?php
/**
 * Plugin Name: SLASHED
 * Plugin URI: https://github.com/codeslash-dev/SLASHED
 * Description: SLASHED cascade-layer CSS framework for WordPress. Activate integrations per builder from the settings page (Bricks, Gutenberg — more coming).
 * Version: 0.6.1
 * Author: Jack Granatowski
 * Author URI: https://codeslash.net
 * License: GPL-3.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Requires PHP: 7.4
 * Requires at least: 6.4
 * Text Domain: slashed
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ─── Canonical constants ────────────────────────────────────────────

define( 'SLASHED_VERSION', '0.6.1' );
define( 'SLASHED_PATH', plugin_dir_path( __FILE__ ) );
define( 'SLASHED_URL', plugin_dir_url( __FILE__ ) );

/**
 * Framework version the bundled CSS ships with.
 * Used as the cache-busting version string and as the framework version shown
 * in the admin UI. The framework CSS is bundled with the plugin in dist/ and
 * updated through normal plugin releases — see Slashed_CSS_Loader.
 */
define( 'SLASHED_CSS_REF', 'v0.7.24' );

// ─── Shared infrastructure ────────────────────────────────────────────

require_once SLASHED_PATH . 'includes/class-settings.php';
require_once SLASHED_PATH . 'includes/class-css-loader.php';

// ─── Core CSS delivery (builder-agnostic) ────────────────────────────────────
//
// Loads the SLASHED framework stylesheet on every WordPress site regardless
// of which builder (if any) is active. Builder integrations add inline rules
// on top (dark-mode bridges etc.) without re-registering the handle.

require_once SLASHED_PATH . 'includes/class-token-store.php';  // needed by Slashed_Core_Enqueue for html_font_size
require_once SLASHED_PATH . 'includes/class-core-enqueue.php';
new Slashed_Core_Enqueue();

// ─── Token infrastructure (global — shared by all integrations) ───────────────────

require_once SLASHED_PATH . 'includes/class-token-defaults.php';
require_once SLASHED_PATH . 'includes/class-css-generator.php';
require_once SLASHED_PATH . 'includes/class-rest-controller.php';

// Token REST routes live under slashed/v1, independent of any builder.
add_action(
	'rest_api_init',
	function () {
		( new Slashed_REST_Controller() )->register_routes();
	}
);

// Inject token override CSS after whichever integration enqueued slashed-framework.
// Overrides are generated from the stored design tokens (Slashed_CSS_Generator).
function slashed_inject_token_overrides() {
	if ( ! wp_style_is( 'slashed-framework', 'enqueued' ) ) {
		return;
	}

	if ( Slashed_CSS_Generator::has_overrides() ) {
		wp_add_inline_style( 'slashed-framework', Slashed_CSS_Generator::get_override_css() );
	}
}
add_action( 'wp_enqueue_scripts', 'slashed_inject_token_overrides', 20 );
add_action( 'enqueue_block_editor_assets', 'slashed_inject_token_overrides', 20 );

// ─── Unified admin page ───────────────────────────────────────────────

require_once SLASHED_PATH . 'includes/class-token-page.php';     // also used on frontend (Bricks editor)

// ─── Frontend overlay configurator ───────────────────────────────────────────
// Injects the token editor as a floating panel on any public frontend page for
// admin users; the page itself acts as the live preview.

require_once SLASHED_PATH . 'includes/class-frontend-configurator.php';
add_action(
	'plugins_loaded',
	function () {
		new Slashed_Frontend_Configurator();
	}
);

if ( is_admin() ) {
	require_once SLASHED_PATH . 'includes/class-admin.php';
	require_once SLASHED_PATH . 'includes/class-bricks-settings-page.php';
	add_action(
		'plugins_loaded',
		function () {
			new Slashed_Admin();
			new Slashed_Token_Page();
			new Slashed_Bricks_Settings_Page();
		}
	);
}

// ─── Integration bootstraps ───────────────────────────────────────────────
//
// Each integration's entry point defines its own SLASHED_{BUILDER}_* constants
// via plugin_dir_path(__FILE__) — correct whether loaded standalone or from here.
// The !defined() guards inside those files prevent redefinition errors if both
// the standalone plugin and this one are somehow active simultaneously.

if ( Slashed_Settings::is_enabled( 'bricks' ) ) {
	require_once SLASHED_PATH . 'integrations/bricks/slashed-bricks.php';
}

if ( Slashed_Settings::is_enabled( 'gutenberg' ) ) {
	require_once SLASHED_PATH . 'integrations/gutenberg/slashed-gutenberg.php';
}

// ─── Activation / deactivation ───────────────────────────────────────────────

register_deactivation_hook(
	__FILE__,
	function () {
		// Clean up the daily version-check cron scheduled by older releases. The
		// plugin no longer schedules this event, but clearing it on deactivation
		// removes any orphaned instance left over from an upgrade.
		wp_clear_scheduled_hook( 'slashed_bricks_version_check' );
	}
);
