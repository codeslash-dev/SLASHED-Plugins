<?php
/**
 * Plugin Name: SLASHED for Bricks
 * Plugin URI: https://github.com/codeslash-dev/SLASHED
 * Description: Integrates the SLASHED cascade-layer CSS framework with Bricks Builder - providing CSS variables, utility classes, and color palette synchronization.
 * Version: 0.6.8
 * Author: Jack Granatowski
 * Author URI: https://codeslash.net
 * License: GPL-3.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Requires PHP: 7.4
 * Requires at least: 6.4
 * Text Domain: slashed-bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Plugin constants.
 *
 * Defined via plugin_dir_path(__FILE__) so paths are correct whether this
 * file is loaded standalone or included by the unified slashed.php. The
 * !defined() guard exists solely to prevent redefinition errors when both
 * the standalone Bricks plugin and the unified SLASHED plugin are active.
 */
if ( ! defined( 'SLASHED_BRICKS_VERSION' ) ) {
	define( 'SLASHED_BRICKS_VERSION', '0.6.8' );
	define( 'SLASHED_BRICKS_PATH', plugin_dir_path( __FILE__ ) );
	define( 'SLASHED_BRICKS_URL', plugin_dir_url( __FILE__ ) );
	define( 'SLASHED_BRICKS_CSS_REF', 'v0.7.30' );
}

/**
 * In unified mode slashed.php loads the shared infrastructure before this file
 * is included. In standalone mode (this plugin activated directly), load
 * everything from the shared includes directory two levels up.
 */
if ( ! class_exists( 'Slashed_Token_Store' ) ) {
	$slashed_shared = SLASHED_BRICKS_PATH . '../../includes/';
	require_once $slashed_shared . 'class-settings.php';
	require_once $slashed_shared . 'class-css-loader.php';
	require_once $slashed_shared . 'class-core-enqueue.php';
	require_once $slashed_shared . 'class-token-store.php';
	require_once $slashed_shared . 'class-token-defaults.php';
	require_once $slashed_shared . 'class-css-generator.php';
	require_once $slashed_shared . 'class-rest-controller.php';
	require_once $slashed_shared . 'class-token-page.php';
	unset( $slashed_shared );
}

/**
 * Get the configured CSS bundle variant.
 *
 * Delegates to the shared Slashed_CSS_Loader when running under the unified
 * plugin; falls back to the Bricks token store in standalone mode.
 *
 * @return string One of 'optimal', 'full'.
 */
function slashed_bricks_get_css_bundle() {
	if ( class_exists( 'Slashed_CSS_Loader' ) ) {
		return Slashed_CSS_Loader::get_bundle();
	}
	$settings = Slashed_Token_Store::get_plugin_settings();
	$bundle   = isset( $settings['css_bundle'] ) ? (string) $settings['css_bundle'] : 'optimal';
	// Migrate retired bundle names: 'essential' predates the optimal/full split;
	// the component and utility tiers fold into 'full' (a superset).
	if ( 'essential' === $bundle ) {
		$bundle = 'optimal';
	} elseif ( 'optimal-components' === $bundle || 'optimal-utilities' === $bundle ) {
		$bundle = 'full';
	}
	if ( ! in_array( $bundle, Slashed_Token_Store::ALLOWED_CSS_BUNDLES, true ) ) {
		$bundle = 'optimal';
	}
	return $bundle;
}

/**
 * Get the URL for the SLASHED CSS bundle.
 *
 * Delegates to the shared Slashed_CSS_Loader when running under the unified
 * plugin, then applies the per-integration filter. In standalone mode, serves
 * the CSS bundle that ships with the plugin from its local dist/ directory.
 *
 * Use the 'slashed_bricks/css_bundle_url' filter to override.
 *
 * @return string URL to the CSS bundle, or '' when the bundle file is missing.
 */
function slashed_bricks_get_css_url() {
	if ( class_exists( 'Slashed_CSS_Loader' ) ) {
		return apply_filters( 'slashed_bricks/css_bundle_url', Slashed_CSS_Loader::get_url() );
	}

	// Standalone fallback: serve the locally bundled CSS only.
	$bundle      = slashed_bricks_get_css_bundle();
	$filename    = 'slashed.' . $bundle . '.css';
	$default_url = '';

	// Check plugin root dist/ first (two levels up: integrations/bricks/ → plugin root).
	if ( file_exists( SLASHED_BRICKS_PATH . '../../dist/' . $filename ) ) {
		$default_url = SLASHED_BRICKS_URL . '../../dist/' . $filename;
	} elseif ( file_exists( SLASHED_BRICKS_PATH . 'dist/' . $filename ) ) {
		$default_url = SLASHED_BRICKS_URL . 'dist/' . $filename;
	}

	return apply_filters( 'slashed_bricks/css_bundle_url', $default_url );
}

/**
 * Resolve the active Bricks version string, or '' if it can't be determined.
 *
 * Prefers the BRICKS_VERSION constant (defined by the Bricks theme during
 * theme load), falling back to the active theme's (or its parent's) version
 * metadata. Both Bricks detectors below share this so they stay in sync if
 * Bricks ever changes how its version is exposed.
 *
 * @return string
 */
function slashed_bricks_get_bricks_version() {
	if ( defined( 'BRICKS_VERSION' ) ) {
		return (string) BRICKS_VERSION;
	}

	$theme = wp_get_theme();

	if ( 'bricks' === strtolower( $theme->get_template() ) ) {
		$parent = $theme->parent();
		return $parent ? (string) $parent->get( 'Version' ) : (string) $theme->get( 'Version' );
	}

	if ( 'bricks' === strtolower( $theme->get( 'Name' ) ) ) {
		return (string) $theme->get( 'Version' );
	}

	return '';
}

/**
 * Check if Bricks Builder is active.
 *
 * @return bool
 */
function slashed_bricks_is_bricks_active() {
	$version = slashed_bricks_get_bricks_version();

	if ( '' === $version ) {
		return false;
	}

	return version_compare( $version, '1.9.2', '>=' );
}

// ─── Layer preamble ─────────────────────────────────────────────────────────
//
// Bricks outputs @layer bricks { ... } in its own stylesheet. When that
// stylesheet loads after the SLASHED layered bundle, @layer bricks has higher
// cascade priority than all slashed.* layers, causing Bricks' own defaults
// (e.g. [class*=brxe-] { max-width: 100% }) to override SLASHED layout rules.
//
// Pre-declaring @layer bricks at wp_head priority 1 — before wp_print_styles
// fires at priority 8 — locks bricks in as the lowest-priority layer. All
// slashed.* layers declared afterward in the SLASHED bundle are higher priority.
//
// This hook lives here, not inside Slashed_Bricks_Enqueue, so it fires whenever
// the Bricks integration is active (in unified mode: when the integration toggle
// is on; in standalone mode: always) without requiring Bricks to be the active
// theme. Declaring an empty @layer bricks on a site where Bricks is not active is
// harmless — the layer is simply never populated.
//
// The preamble is attached to a registered (src-less) style handle and emitted
// via wp_add_inline_style at wp_enqueue_scripts priority 1, so it prints before
// the SLASHED framework bundle (enqueued at the default priority) and locks
// `bricks` in as the lowest-priority cascade layer.
add_action(
	'wp_enqueue_scripts',
	function () {
		if ( function_exists( 'bricks_is_builder_main' ) && bricks_is_builder_main() ) {
			return;
		}
		wp_register_style( 'slashed-bricks-layer-order', false, array(), SLASHED_BRICKS_VERSION );
		wp_enqueue_style( 'slashed-bricks-layer-order' );
		wp_add_inline_style( 'slashed-bricks-layer-order', '@layer bricks;' );
	},
	1
);

// Token admin page (Slashed_Token_Page) and the main REST controller
// (Slashed_REST_Controller) are registered globally by slashed.php.
// In standalone mode the shared classes are loaded above and bootstrapped below.
if ( ! defined( 'SLASHED_VERSION' ) ) {
	// Standalone mode: bootstrap the full global pipeline that slashed.php provides
	// in unified mode — CSS delivery, token REST API, admin page, override injection.
	new Slashed_Core_Enqueue();

	add_action(
		'rest_api_init',
		function () {
			( new Slashed_REST_Controller() )->register_routes();
		}
	);

	if ( is_admin() ) {
		add_action(
			'plugins_loaded',
			function () {
				new Slashed_Token_Page();
			},
			20
		);
	}

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
 * Register Bricks-specific REST routes via rest_api_init.
 *
 * WordPress fires `rest_api_init` exclusively during REST dispatch —
 * never on normal admin or frontend requests. Hooking here guarantees
 * the routes exist regardless of `is_admin()` state.
 *
 * The token CRUD controller (Slashed_REST_Controller) is registered
 * globally by slashed.php (or by the standalone bootstrap above).
 * Only Bricks-specific endpoints (reBEMer, fonts) are registered here.
 */
function slashed_bricks_rest_routes_init() {
	// Slashed_REST_Controller (token CRUD) is registered globally by slashed.php.
	// Register only the Bricks-specific endpoints here.
	require_once SLASHED_BRICKS_PATH . 'includes/class-rebemer-rest.php';
	require_once SLASHED_BRICKS_PATH . 'includes/class-fonts-rest.php';

	( new Slashed_Bricks_ReBEMer_REST() )->register_routes();
	( new Slashed_Bricks_Fonts_REST() )->register_routes();
}
add_action( 'rest_api_init', 'slashed_bricks_rest_routes_init' );

/**
 * Load the shared Bricks data classes (parser → resolver → inventory).
 *
 * Required by both bootstrap paths — slashed_bricks_data_init() at
 * plugins_loaded and slashed_bricks_init() at after_setup_theme. Each calls
 * this independently because the two paths gate on different signals (the
 * `template` option vs the live Bricks version), so neither may assume the
 * other has already run. Idempotent via require_once.
 */
function slashed_bricks_require_data_classes() {
	require_once SLASHED_BRICKS_PATH . 'includes/class-css-parser.php';
	require_once SLASHED_BRICKS_PATH . '../../includes/class-color-math.php';
	require_once SLASHED_BRICKS_PATH . 'includes/class-color-resolver.php';
	require_once SLASHED_BRICKS_PATH . 'includes/class-inventory.php';
	require_once SLASHED_BRICKS_PATH . 'includes/class-elements.php';
}

/**
 * Data managers: early initialization at plugins_loaded.
 *
 * Bricks' Database::__construct() reads bricks_global_variables and
 * bricks_global_classes via get_option() during theme functions.php load —
 * which happens AFTER plugins_loaded but BEFORE after_setup_theme.
 * Registering our option filters here guarantees they are in place when
 * Bricks reads those options for the first time.
 *
 * Runs unconditionally: if Bricks is not the active theme the option filters
 * simply never fire, which is harmless.
 */
function slashed_bricks_data_init() {
	// Bail early on non-Bricks sites to avoid loading classes needlessly.
	if ( 'bricks' !== strtolower( (string) get_option( 'template', '' ) ) ) {
		return;
	}

	slashed_bricks_require_data_classes();
	require_once SLASHED_BRICKS_PATH . 'includes/class-variables.php';
	require_once SLASHED_BRICKS_PATH . 'includes/class-classes.php';

	new Slashed_Bricks_Variables();
	new Slashed_Bricks_Classes();

	// Invalidate the Bricks Font-Manager CPT cache on every custom-font save.
	// Registered here (plugins_loaded, all request types) rather than from REST
	// route registration so the cache is busted on normal admin saves too, not
	// only during REST requests. The collector + transient live in the
	// always-loaded Slashed_Token_Page.
	if ( class_exists( 'Slashed_Token_Page' ) ) {
		add_action(
			'save_post_' . Slashed_Token_Page::get_bricks_fonts_post_type(),
			array( 'Slashed_Token_Page', 'flush_bricks_fonts_cache' )
		);
	}
}
add_action( 'plugins_loaded', 'slashed_bricks_data_init', 20 );

/**
 * CSS enqueue: late initialization at after_setup_theme.
 *
 * Enqueue needs the theme to be active and Bricks version checks to pass.
 * Data managers (variables, classes, colors) are already initialized above.
 */
function slashed_bricks_init() {
	if ( ! slashed_bricks_is_bricks_active() ) {
		add_action( 'admin_notices', 'slashed_bricks_missing_bricks_notice' );
		return;
	}

	slashed_bricks_require_data_classes();
	require_once SLASHED_BRICKS_PATH . 'includes/class-enqueue.php';

	new Slashed_Bricks_Enqueue();
}
add_action( 'after_setup_theme', 'slashed_bricks_init' );

/**
 * reBEMer: enqueue the editor bundle and localize editor data.
 *
 * Both classes hook themselves onto wp_enqueue_scripts and gate on
 * bricks_is_builder_main(), so registering them here at after_setup_theme
 * (priority 20 to follow slashed_bricks_init) is sufficient.
 *
 * Slashed_Bricks_ReBEMer_Enqueue registers the script at priority 9999.
 * Slashed_Bricks_Editor_Data localizes it at priority 10000, after the
 * handle exists.
 *
 * Bails out cleanly when Bricks isn't the active theme.
 */
function slashed_bricks_rebemer_init() {
	if ( ! slashed_bricks_is_bricks_active() ) {
		return;
	}

	require_once SLASHED_BRICKS_PATH . 'includes/class-rebemer-enqueue.php';
	require_once SLASHED_BRICKS_PATH . 'includes/class-editor-data.php';
	new Slashed_Bricks_ReBEMer_Enqueue();
	new Slashed_Bricks_Editor_Data();
}
add_action( 'after_setup_theme', 'slashed_bricks_rebemer_init', 20 );

/**
 * Display admin notice when Bricks Builder is not active.
 */
function slashed_bricks_missing_bricks_notice() {
	?>
	<div class="notice notice-error">
		<p>
			<strong>SLASHED for Bricks</strong> requires Bricks Builder to be installed and active.
		</p>
	</div>
	<?php
}

// ─── Legacy cron cleanup ─────────────────────────────────────────────────────

/**
 * Remove the daily version-check cron scheduled by older releases.
 *
 * The plugin no longer phones home to check for framework releases — the CSS
 * ships bundled and updates through normal plugin releases — so this clears any
 * orphaned event left behind by an upgrade, both on deactivation and on load.
 */
function slashed_bricks_deactivation_cleanup() {
	if ( wp_next_scheduled( 'slashed_bricks_version_check' ) ) {
		// Clear every scheduled instance, matching the unified plugin's cleanup.
		wp_clear_scheduled_hook( 'slashed_bricks_version_check' );
		delete_transient( 'slashed_bricks_latest_version' );
	}
}
add_action( 'wp_loaded', 'slashed_bricks_deactivation_cleanup' );
if ( ! defined( 'SLASHED_VERSION' ) ) {
	register_deactivation_hook( __FILE__, 'slashed_bricks_deactivation_cleanup' );
}
