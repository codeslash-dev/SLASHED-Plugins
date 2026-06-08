<?php
/**
 * Plugin Name: SLASHED for Bricks
 * Plugin URI: https://github.com/codeslash-dev/SLASHED
 * Description: Integrates the SLASHED cascade-layer CSS framework with Bricks Builder - providing CSS variables, utility classes, and color palette synchronization.
 * Version: 0.5.21
 * Author: jackgranatowski
 * Author URI: https://github.com/codeslash-dev/SLASHED
 * License: MIT
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
    define( 'SLASHED_BRICKS_VERSION', '0.5.21' );
    define( 'SLASHED_BRICKS_PATH', plugin_dir_path( __FILE__ ) );
    define( 'SLASHED_BRICKS_URL', plugin_dir_url( __FILE__ ) );
    define( 'SLASHED_BRICKS_CSS_REF', 'v0.5.21' );
}

/**
 * In unified mode slashed.php loads the shared infrastructure before this file
 * is included. In standalone mode (this plugin activated directly), load
 * everything from the shared includes directory two levels up.
 */
if ( ! defined( 'SLASHED_VERSION' ) ) {
	add_action( 'init', function () {
		load_plugin_textdomain( 'slashed-bricks', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
	} );
}

if ( ! class_exists( 'Slashed_Token_Store' ) ) {
	$_slashed_shared = SLASHED_BRICKS_PATH . '../../includes/';
	require_once $_slashed_shared . 'class-settings.php';
	require_once $_slashed_shared . 'class-css-loader.php';
	require_once $_slashed_shared . 'class-core-enqueue.php';
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
 * plugin; falls back to the Bricks token store in standalone mode.
 *
 * @return string One of 'essential', 'optimal', 'full'.
 */
function slashed_bricks_get_css_bundle() {
    if ( class_exists( 'Slashed_CSS_Loader' ) ) {
        return Slashed_CSS_Loader::get_bundle();
    }
    $settings = Slashed_Token_Store::get_plugin_settings();
    $bundle   = isset( $settings['css_bundle'] ) ? (string) $settings['css_bundle'] : 'optimal';
    if ( ! in_array( $bundle, Slashed_Token_Store::ALLOWED_CSS_BUNDLES, true ) ) {
        $bundle = 'optimal';
    }
    return $bundle;
}

/**
 * Get the URL for the SLASHED CSS bundle.
 *
 * Delegates to the shared Slashed_CSS_Loader when running under the unified
 * plugin, then applies the per-integration filter. In standalone mode, builds
 * the URL from the framework's GitHub Release asset for SLASHED_BRICKS_CSS_REF,
 * with a local-file fallback.
 *
 * Use the 'slashed_bricks/css_bundle_url' filter to override.
 *
 * @return string URL to the CSS bundle.
 */
function slashed_bricks_get_css_url() {
    if ( class_exists( 'Slashed_CSS_Loader' ) ) {
        return apply_filters( 'slashed_bricks/css_bundle_url', Slashed_CSS_Loader::get_url() );
    }

    // Standalone fallback.
    $bundle      = slashed_bricks_get_css_bundle();
    $filename    = 'slashed.' . $bundle . '.css';
    $default_url = sprintf(
        'https://github.com/codeslash-dev/SLASHED/releases/download/%s/%s',
        rawurlencode( SLASHED_BRICKS_CSS_REF ),
        $filename
    );

    // Check plugin root dist/ first (two levels up: integrations/bricks/ → plugin root).
    $plugin_dist = SLASHED_BRICKS_PATH . '../../dist/' . $filename;
    if ( file_exists( $plugin_dist ) ) {
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

// Token admin page (Slashed_Token_Page) and the main REST controller
// (Slashed_REST_Controller) are registered globally by slashed.php.
// In standalone mode the shared classes are loaded above and bootstrapped below.
if ( ! defined( 'SLASHED_VERSION' ) ) {
	// Standalone mode: bootstrap the full global pipeline that slashed.php provides
	// in unified mode — CSS delivery, token REST API, admin page, override injection.
	new Slashed_Core_Enqueue();

	add_action( 'rest_api_init', function () {
		( new Slashed_REST_Controller() )->register_routes();
	} );

	if ( is_admin() ) {
		add_action( 'plugins_loaded', function () {
			new Slashed_Token_Page();
		}, 20 );
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
    require_once SLASHED_BRICKS_PATH . 'includes/class-color-resolver.php';
    require_once SLASHED_BRICKS_PATH . 'includes/class-inventory.php';
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
 * reBEMer: enqueue the editor bundle inside the Bricks builder main panel.
 *
 * The Enqueue class hooks itself onto wp_enqueue_scripts and gates on
 * bricks_is_builder_main(), so registering it here at after_setup_theme
 * (priority 20 to follow slashed_bricks_init) is sufficient — the actual
 * decision to enqueue happens later, per-request.
 *
 * Bails out cleanly when Bricks isn't the active theme; the missing-Bricks
 * notice from slashed_bricks_init() already covers that case.
 */
function slashed_bricks_rebemer_init() {
    if ( ! slashed_bricks_is_bricks_active() ) {
        return;
    }

    require_once SLASHED_BRICKS_PATH . 'includes/class-rebemer-enqueue.php';
    new Slashed_Bricks_ReBEMer_Enqueue();
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

// ─── Stale inventory / version detection ────────────────────────────────────

/**
 * Register a daily cron event to check for a newer framework release.
 * Fires once on plugin load; wp_schedule_event is a no-op if already scheduled.
 */
function slashed_bricks_schedule_version_check() {
	if ( ! wp_next_scheduled( 'slashed_bricks_version_check' ) ) {
		wp_schedule_event( time(), 'daily', 'slashed_bricks_version_check' );
	}
}
add_action( 'wp_loaded', 'slashed_bricks_schedule_version_check' );

/**
 * Cron callback: fetch the latest GitHub release tag and cache it.
 * Uses the jsDelivr package metadata API (no auth, generous rate limit).
 */
function slashed_bricks_run_version_check() {
	$url      = 'https://data.jsdelivr.com/v1/packages/gh/codeslash-dev/SLASHED';
	$response = wp_remote_get(
		$url,
		array(
			'timeout'    => 10,
			'user-agent' => 'SLASHED-Bricks/' . SLASHED_BRICKS_VERSION . '; WordPress/' . get_bloginfo( 'version' ),
		)
	);

	if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
		return;
	}

	$body = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( ! is_array( $body ) || empty( $body['versions'] ) || ! is_array( $body['versions'] ) ) {
		return;
	}

	// Versions are returned newest-first. Find the latest semver entry (X.Y.Z or vX.Y.Z).
	// Anchored stable-only match — kept identical to
	// Slashed_Framework_Updater::get_latest_version() so both update detectors agree.
	$latest = null;
	foreach ( $body['versions'] as $entry ) {
		$ver = isset( $entry['version'] ) ? ltrim( (string) $entry['version'], 'v' ) : '';
		if ( preg_match( '/^\d+\.\d+\.\d+$/', $ver ) ) {
			$latest = 'v' . $ver;
			break;
		}
	}

	if ( ! $latest ) {
		return;
	}

	set_transient( 'slashed_bricks_latest_version', $latest, DAY_IN_SECONDS * 2 );
}
add_action( 'slashed_bricks_version_check', 'slashed_bricks_run_version_check' );

/**
 * Add a SLASHED widget to the WP Dashboard when the installed framework
 * version is behind the latest released tag.
 */
function slashed_bricks_dashboard_setup() {
	$latest  = get_transient( 'slashed_bricks_latest_version' );
	$current = ltrim( SLASHED_BRICKS_CSS_REF, 'v' );

	if ( ! $latest || ! current_user_can( 'manage_options' ) ) {
		return;
	}

	// Trim leading 'v' for version_compare.
	$latest_clean = ltrim( $latest, 'v' );

	if ( version_compare( $latest_clean, $current, '<=' ) ) {
		return; // Up to date — no widget needed.
	}

	wp_add_dashboard_widget(
		'slashed_bricks_update_notice',
		'SLASHED Framework Update Available',
		'slashed_bricks_dashboard_widget_cb'
	);
}
add_action( 'wp_dashboard_setup', 'slashed_bricks_dashboard_setup' );

/**
 * Unschedule the version-check cron on plugin deactivation so no orphaned
 * scheduled tasks remain after the plugin is turned off.
 */
function slashed_bricks_deactivation_cleanup() {
	$timestamp = wp_next_scheduled( 'slashed_bricks_version_check' );
	if ( $timestamp ) {
		wp_unschedule_event( $timestamp, 'slashed_bricks_version_check' );
	}
}
if ( ! defined( 'SLASHED_VERSION' ) ) {
    register_deactivation_hook( __FILE__, 'slashed_bricks_deactivation_cleanup' );
}

/**
 * Dashboard widget content: informs the user a newer framework version exists.
 */
function slashed_bricks_dashboard_widget_cb() {
	$latest  = get_transient( 'slashed_bricks_latest_version' );
	$current = SLASHED_BRICKS_CSS_REF;
	printf(
		'<p>A newer SLASHED framework release is available: <strong>%s</strong> (you are on %s).</p>
		<p>Update the plugin to load the latest CSS bundle and token inventory.</p>',
		esc_html( $latest ),
		esc_html( $current )
	);
}
