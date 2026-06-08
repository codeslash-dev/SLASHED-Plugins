<?php
/**
 * Plugin Name: SLASHED
 * Plugin URI: https://github.com/codeslash-dev/SLASHED
 * Description: SLASHED cascade-layer CSS framework for WordPress. Activate integrations per builder from the settings page (Bricks, Gutenberg — more coming).
 * Version: 0.5.21
 * Author: jackgranatowski
 * Author URI: https://github.com/codeslash-dev/SLASHED
 * License: MIT
 * Requires PHP: 7.4
 * Requires at least: 6.4
 * Text Domain: slashed
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ─── Canonical constants ──────────────────────────────────────────────────────

define( 'SLASHED_VERSION',  '0.5.21' );
define( 'SLASHED_PATH',     plugin_dir_path( __FILE__ ) );
define( 'SLASHED_URL',      plugin_dir_url( __FILE__ ) );

/**
 * Framework version this plugin ships with / tracks by default.
 * Used as the default CSS version and for update-available comparisons.
 * The framework CSS is loaded from the SLASHED framework's published
 * artifacts (GitHub Release assets per version; the `dist` branch for
 * "latest") — see Slashed_CSS_Loader and Slashed_Framework_Updater.
 */
define( 'SLASHED_CSS_REF',  'v0.5.21' );

add_action( 'init', function () {
	load_plugin_textdomain( 'slashed', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
} );

// ─── Shared infrastructure ────────────────────────────────────────────────────

require_once SLASHED_PATH . 'includes/class-settings.php';
require_once SLASHED_PATH . 'includes/class-css-loader.php';
require_once SLASHED_PATH . 'includes/class-framework-updater.php';

// ─── Core CSS delivery (builder-agnostic) ────────────────────────────────────
//
// Loads the SLASHED framework stylesheet on every WordPress site regardless
// of which builder (if any) is active. Builder integrations add inline rules
// on top (dark-mode bridges etc.) without re-registering the handle.

require_once SLASHED_PATH . 'includes/class-token-store.php';  // needed by Slashed_Core_Enqueue for html_font_size
require_once SLASHED_PATH . 'includes/class-core-enqueue.php';
new Slashed_Core_Enqueue();

// ─── Token infrastructure (global — shared by all integrations) ───────────────

require_once SLASHED_PATH . 'includes/class-token-sanitizer.php';
require_once SLASHED_PATH . 'includes/class-token-defaults.php';
require_once SLASHED_PATH . 'includes/class-tab-registry.php';
require_once SLASHED_PATH . 'includes/class-css-generator.php';
require_once SLASHED_PATH . 'includes/class-rest-controller.php';

// Token REST routes live under slashed/v1, independent of any builder.
add_action( 'rest_api_init', function () {
	( new Slashed_REST_Controller() )->register_routes();
} );

// Inject token override CSS after whichever integration enqueued slashed-framework.
function slashed_inject_token_overrides() {
	if ( wp_style_is( 'slashed-framework', 'enqueued' ) && Slashed_CSS_Generator::has_overrides() ) {
		wp_add_inline_style( 'slashed-framework', Slashed_CSS_Generator::get_override_css() );
	}
}
add_action( 'wp_enqueue_scripts', 'slashed_inject_token_overrides', 20 );
add_action( 'enqueue_block_editor_assets', 'slashed_inject_token_overrides', 20 );

// ─── Unified admin page ───────────────────────────────────────────────────────

require_once SLASHED_PATH . 'includes/class-token-page.php'; // also used on frontend (Bricks editor)

if ( is_admin() ) {
	require_once SLASHED_PATH . 'includes/class-admin.php';
	add_action( 'plugins_loaded', function () {
		new Slashed_Admin();
		new Slashed_Token_Page();
		new Slashed_Framework_Updater();
	} );
}

// ─── Integration bootstraps ───────────────────────────────────────────────────
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

register_deactivation_hook( __FILE__, function () {
	// Clear every scheduled instance of the Bricks version-check cron, not just
	// the next one — guards against an orphaned event being left behind if the
	// Bricks integration was toggled off while an instance was still scheduled.
	wp_clear_scheduled_hook( 'slashed_bricks_version_check' );
} );

// When the Bricks integration is toggled OFF via settings (not just deactivation),
// clear the cron immediately so it does not remain scheduled with no handler.
add_action( 'update_option_slashed_settings', function ( $old_value, $new_value ) {
	$was_on = ! empty( $old_value['integrations']['bricks'] );
	$is_on  = ! empty( $new_value['integrations']['bricks'] );
	if ( $was_on && ! $is_on ) {
		wp_clear_scheduled_hook( 'slashed_bricks_version_check' );
	}
}, 10, 2 );
