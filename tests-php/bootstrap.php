<?php
/**
 * PHPUnit bootstrap for the plain-PHP unit suite.
 *
 * Scope: pure/near-pure logic that needs no WordPress runtime — no wpdb,
 * no hooks system, no admin bootstrap. Classes under test are required
 * directly (never through slashed.php) so a real WP install is never
 * needed to run this suite.
 *
 * A few WordPress core functions these classes call are stubbed here with
 * their documented behaviour rather than pulling in a mocking framework or a
 * real WP install:
 *
 *   - sanitize_key( $key ) — lowercase, strip everything but [a-z0-9_-].
 *   - get_option / update_option / delete_option — backed by an in-memory
 *     option store (see $GLOBALS['slashed_test_options']); this is what lets
 *     the option-persistence + CSS-emission boundary (Slashed_Token_Store,
 *     Slashed_CSS_Generator::get_override_css) be exercised without WordPress.
 *   - apply_filters( $tag, $value, ... ) — identity pass-through (no hooks).
 *
 * Tests that touch the option store call slashed_test_reset_state() in their
 * setUp() to start from an empty store and a cleared generator cache.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( $key ) {
		$key = is_scalar( $key ) ? strtolower( (string) $key ) : '';
		return preg_replace( '/[^a-z0-9_-]/', '', $key );
	}
}

// ── In-memory WordPress option store ────────────────────────────────────────
$GLOBALS['slashed_test_options'] = array();

if ( ! function_exists( 'get_option' ) ) {
	function get_option( $name, $default = false ) {
		return array_key_exists( $name, $GLOBALS['slashed_test_options'] )
			? $GLOBALS['slashed_test_options'][ $name ]
			: $default;
	}
}

if ( ! function_exists( 'update_option' ) ) {
	function update_option( $name, $value ) {
		$GLOBALS['slashed_test_options'][ $name ] = $value;
		return true;
	}
}

if ( ! function_exists( 'delete_option' ) ) {
	function delete_option( $name ) {
		unset( $GLOBALS['slashed_test_options'][ $name ] );
		return true;
	}
}

if ( ! function_exists( 'apply_filters' ) ) {
	function apply_filters( $tag, $value ) {
		return $value; // No hook system in the unit suite; identity pass-through.
	}
}

if ( ! function_exists( 'wp_parse_url' ) ) {
	// WordPress's wrapper is a straight parse_url() delegate on the PHP versions
	// this plugin supports; the wrapper exists for pre-5.4.7 compatibility only.
	function wp_parse_url( $url, $component = -1 ) {
		return parse_url( $url, $component ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url
	}
}

/**
 * Reset the in-memory option store and the CSS generator's static cache so
 * each option-touching test starts from a clean slate.
 */
function slashed_test_reset_state() {
	$GLOBALS['slashed_test_options'] = array();
	$cache = new ReflectionProperty( 'Slashed_CSS_Generator', 'cache' );
	$cache->setAccessible( true );
	$cache->setValue( null, null );
}

$includes = dirname( __DIR__ ) . '/SLASHED-for-WP/includes/';

require_once $includes . 'class-css-parser.php';
require_once $includes . 'class-css-generator.php';
require_once $includes . 'class-token-store.php';
require_once $includes . 'class-rest-controller.php';
require_once $includes . 'class-color-math.php';
require_once $includes . 'class-category-map.php';
require_once $includes . 'class-token-defaults.php';
require_once $includes . 'class-color-resolver.php';
