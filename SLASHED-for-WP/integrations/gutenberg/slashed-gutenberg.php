<?php
/**
 * Plugin Name: SLASHED for Gutenberg
 * Plugin URI: https://github.com/codeslash-dev/SLASHED
 * Description: Integrates the SLASHED cascade-layer CSS framework with the WordPress block editor — CSS loading, color palette sync, and dark-mode bridging.
 * Version: 0.5.21
 * Author: jackgranatowski
 * Author URI: https://github.com/codeslash-dev/SLASHED
 * License: MIT
 * Requires PHP: 7.4
 * Requires at least: 6.4
 * Text Domain: slashed-gutenberg
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Constants.
 *
 * Guarded with !defined() so this file can be included by the unified
 * SLASHED plugin (slashed.php), which pre-defines these constants with
 * the correct paths relative to its own root. When loaded as a standalone
 * plugin they are not yet set and are defined here as usual.
 */
if ( ! defined( 'SLASHED_GUTENBERG_VERSION' ) ) {
	define( 'SLASHED_GUTENBERG_VERSION',  '0.5.21' );
	define( 'SLASHED_GUTENBERG_PATH',     plugin_dir_path( __FILE__ ) );
	define( 'SLASHED_GUTENBERG_URL',      plugin_dir_url( __FILE__ ) );
	define( 'SLASHED_GUTENBERG_CSS_REF',  'v0.5.21' );
}

define( 'SLASHED_GUTENBERG_ALLOWED_BUNDLES', array( 'essential', 'optimal', 'full' ) );

/**
 * Standalone shared infrastructure.
 *
 * In unified mode slashed.php loads the shared token pipeline before this file
 * is included. In standalone mode (this plugin activated directly) load it from
 * the shared includes directory two levels up so token overrides, the REST API,
 * and the admin token page work without the unified plugin.
 *
 * class-core-enqueue.php is intentionally NOT loaded here: in standalone mode
 * this integration owns the bundle enqueue (so the slashed_gutenberg/css_bundle_url
 * filter applies), and the absence of Slashed_Core_Enqueue is the signal the
 * enqueue class uses to detect standalone vs unified mode.
 *
 * NOTE: running both standalone integration plugins (Bricks + Gutenberg) without
 * the unified "SLASHED" plugin is unsupported — install the unified plugin to run
 * multiple integrations together.
 */
if ( ! class_exists( 'Slashed_Token_Store' ) ) {
	$_slashed_shared = SLASHED_GUTENBERG_PATH . '../../includes/';
	require_once $_slashed_shared . 'class-settings.php';
	require_once $_slashed_shared . 'class-css-loader.php';
	require_once $_slashed_shared . 'class-token-store.php';
	require_once $_slashed_shared . 'class-token-sanitizer.php';
	require_once $_slashed_shared . 'class-token-defaults.php';
	require_once $_slashed_shared . 'class-tab-registry.php';
	require_once $_slashed_shared . 'class-css-generator.php';
	require_once $_slashed_shared . 'class-rest-controller.php';
	require_once $_slashed_shared . 'class-token-page.php';
	unset( $_slashed_shared );
}

/**
 * Get the configured CSS bundle variant.
 *
 * Delegates to the shared Slashed_CSS_Loader when running under the unified
 * plugin; falls back to its own option in standalone mode.
 *
 * @return string One of 'essential', 'optimal', 'full'.
 */
function slashed_gutenberg_get_css_bundle() {
	if ( class_exists( 'Slashed_CSS_Loader' ) ) {
		return Slashed_CSS_Loader::get_bundle();
	}
	$settings = get_option( 'slashed_gutenberg_settings', array() );
	$bundle   = isset( $settings['css_bundle'] ) ? (string) $settings['css_bundle'] : 'optimal';
	if ( ! in_array( $bundle, SLASHED_GUTENBERG_ALLOWED_BUNDLES, true ) ) {
		$bundle = 'optimal';
	}
	return $bundle;
}

/**
 * Get the URL for the SLASHED CSS bundle.
 *
 * Delegates to the shared Slashed_CSS_Loader when running under the unified
 * plugin, then applies the per-integration filter. In standalone mode, builds
 * the URL from the framework's GitHub Release asset for SLASHED_GUTENBERG_CSS_REF,
 * with a local-file fallback.
 *
 * Use the 'slashed_gutenberg/css_bundle_url' filter to override.
 *
 * @return string
 */
function slashed_gutenberg_get_css_url() {
	if ( class_exists( 'Slashed_CSS_Loader' ) ) {
		return apply_filters( 'slashed_gutenberg/css_bundle_url', Slashed_CSS_Loader::get_url() );
	}

	// Standalone fallback.
	$bundle      = slashed_gutenberg_get_css_bundle();
	$filename    = 'slashed.' . $bundle . '.css';
	$default_url = sprintf(
		'https://github.com/codeslash-dev/SLASHED/releases/download/%s/%s',
		rawurlencode( SLASHED_GUTENBERG_CSS_REF ),
		$filename
	);

	// Check plugin root dist/ first (two levels up: integrations/gutenberg/ → plugin root).
	$plugin_dist = SLASHED_GUTENBERG_PATH . '../../dist/' . $filename;
	if ( file_exists( $plugin_dist ) ) {
		$default_url = SLASHED_GUTENBERG_URL . '../../dist/' . $filename;
	} elseif ( file_exists( SLASHED_GUTENBERG_PATH . 'dist/' . $filename ) ) {
		$default_url = SLASHED_GUTENBERG_URL . 'dist/' . $filename;
	}

	return apply_filters( 'slashed_gutenberg/css_bundle_url', $default_url );
}

if ( ! defined( 'SLASHED_VERSION' ) ) {
	add_action( 'init', function () {
		load_plugin_textdomain( 'slashed-gutenberg', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
	} );
}

/**
 * Standalone token pipeline bootstrap.
 *
 * In unified mode slashed.php registers the token REST API, admin page, and
 * override-CSS injection globally. In standalone mode replicate that here so
 * design-token overrides set in the SPA actually reach the rendered page.
 *
 * The bundle itself is enqueued by Slashed_Gutenberg_Enqueue in standalone
 * mode, so Slashed_Core_Enqueue is not instantiated here.
 */
if ( ! defined( 'SLASHED_VERSION' ) ) {
	add_action( 'rest_api_init', function () {
		( new Slashed_REST_Controller() )->register_routes();
	} );

	if ( is_admin() ) {
		add_action( 'plugins_loaded', function () {
			new Slashed_Token_Page();
		}, 20 );
	}

	// Shared with the Bricks standalone bootstrap via the !function_exists guard,
	// so only one definition exists when both integrations are present.
	if ( ! function_exists( 'slashed_inject_token_overrides' ) ) {
		function slashed_inject_token_overrides() {
			if ( wp_style_is( 'slashed-framework', 'enqueued' ) && Slashed_CSS_Generator::has_overrides() ) {
				wp_add_inline_style( 'slashed-framework', Slashed_CSS_Generator::get_override_css() );
			}
		}
	}
	add_action( 'wp_enqueue_scripts', 'slashed_inject_token_overrides', 20 );
	add_action( 'enqueue_block_editor_assets', 'slashed_inject_token_overrides', 20 );
}

/**
 * Load the shared SLASHED data classes (parser → resolver → inventory) plus
 * the Gutenberg inventory subclass.
 *
 * The relative paths resolve correctly in both unified mode (shared classes
 * live under SLASHED_PATH) and standalone mode (two levels up from this
 * integration). require_once is idempotent, so this is harmless when
 * slashed.php already loaded the shared classes.
 */
function slashed_gutenberg_require_data_classes() {
	require_once SLASHED_GUTENBERG_PATH . '../../includes/class-css-parser.php';
	require_once SLASHED_GUTENBERG_PATH . '../../includes/class-color-resolver.php';
	require_once SLASHED_GUTENBERG_PATH . 'includes/class-inventory.php';
}

/**
 * Bootstrap the Gutenberg integration.
 *
 * Hooked at after_setup_theme so theme support declarations (color palette,
 * gradients, font sizes) land at the right time and the theme is fully loaded
 * before we inspect anything theme-related.
 */
function slashed_gutenberg_init() {
	slashed_gutenberg_require_data_classes();

	require_once SLASHED_GUTENBERG_PATH . 'includes/class-enqueue.php';
	require_once SLASHED_GUTENBERG_PATH . 'includes/class-presets.php';
	require_once SLASHED_GUTENBERG_PATH . 'includes/class-editor-enqueue.php';

	new Slashed_Gutenberg_Enqueue();
	new Slashed_Gutenberg_Presets();
	new Slashed_Gutenberg_Editor_Enqueue();
}
add_action( 'after_setup_theme', 'slashed_gutenberg_init' );
