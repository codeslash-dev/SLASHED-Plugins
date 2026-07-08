<?php
/**
 * PHPUnit bootstrap for the plain-PHP unit suite.
 *
 * Scope: pure/near-pure logic that needs no WordPress runtime — no wpdb,
 * no hooks system, no admin bootstrap. Classes under test are required
 * directly (never through slashed.php) so a real WP install is never
 * needed to run this suite.
 *
 * The one WordPress core function these classes call,
 * sanitize_key( $key ), is stubbed here with its documented behaviour
 * (lowercase, strip everything but [a-z0-9_-]) rather than pulling in a
 * mocking framework for a single pure string function.
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

$includes = dirname( __DIR__ ) . '/SLASHED-for-WP/includes/';

require_once $includes . 'class-css-parser.php';
require_once $includes . 'class-css-generator.php';
require_once $includes . 'class-token-store.php';
require_once $includes . 'class-rest-controller.php';
require_once $includes . 'class-color-math.php';
require_once $includes . 'class-category-map.php';
require_once $includes . 'class-token-defaults.php';
require_once $includes . 'class-color-resolver.php';
