<?php
/**
 * stdout carries nothing but the JSON the probe parses, so PHP diagnostics go to
 * stderr. Otherwise a single notice raised while loading or running the emitter
 * interleaves with json_encode()'s output and the probe dies on an opaque
 * JSON.parse error instead of reporting the actual PHP problem.
 */
ini_set( 'display_errors', 'stderr' );
error_reporting( E_ALL );

/**
 * Standalone harness: runs the real Slashed_CSS_Generator emission path outside
 * a WordPress bootstrap so tests/override-effect-probe.mjs can measure the
 * exact CSS a site would serve for a given set of token overrides.
 *
 * The point of going through the real generator (rather than hand-writing
 * ":root { --x: y }" in the probe) is that everything between the stored option
 * and the page — value re-validation, the derived-token expansion for the scale
 * knobs, and the @layer / unlayered wrapper choice — is part of what can make a
 * configurator control silently do nothing.
 *
 * WordPress is stubbed the same way tests-php/bootstrap.php stubs it: an
 * in-memory option store plus an identity apply_filters(). Slashed_Settings is
 * loaded so the flat-bundle switch (Slashed_CSS_Loader::layers_enabled()) is
 * exercised for real.
 *
 * Usage:
 *   echo '{"label": {"--sf-space-ratio-min": "1.618"}}' \
 *     | php tests/php-harness/emit-override-css.php [--flat]
 *
 * Reads a JSON object of { label: { "--sf-name": "value" } } on stdin, writes a
 * JSON object of { label: cssString } to stdout.
 */

define( 'ABSPATH', __DIR__ . '/' );

$GLOBALS['slashed_test_options'] = array();

function get_option( $name, $default = false ) {
	return array_key_exists( $name, $GLOBALS['slashed_test_options'] )
		? $GLOBALS['slashed_test_options'][ $name ]
		: $default;
}

function update_option( $name, $value ) {
	$GLOBALS['slashed_test_options'][ $name ] = $value;
	return true;
}

function delete_option( $name ) {
	unset( $GLOBALS['slashed_test_options'][ $name ] );
	return true;
}

function apply_filters( $tag, $value ) {
	return $value;
}

function wp_parse_url( $url, $component = -1 ) {
	return parse_url( $url, $component ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url
}

// Slashed_CSS_Loader::layers_enabled() resolves the served bundle URL to decide
// the layer mode, so point the plugin's path constants at the committed dist/ —
// the harness then exercises the same resolution a real install performs.
$plugin = dirname( __DIR__, 2 ) . '/SLASHED-for-WP/';
define( 'SLASHED_PATH', $plugin );
define( 'SLASHED_URL', 'https://example.test/wp-content/plugins/slashed/' );

$includes = $plugin . 'includes/';
require $includes . 'class-settings.php';
require $includes . 'class-css-loader.php';
require $includes . 'class-token-store.php';
require $includes . 'class-css-generator.php';

$cases = json_decode( file_get_contents( 'php://stdin' ), true );
if ( ! is_array( $cases ) ) {
	fwrite( STDERR, "Expected a JSON object of { label: overrides } on stdin.\n" );
	exit( 1 );
}

$flat  = in_array( '--flat', array_slice( $argv, 1 ), true );
$cache = new ReflectionProperty( 'Slashed_CSS_Generator', 'cache' );
$cache->setAccessible( true );

$out = array();
foreach ( $cases as $label => $overrides ) {
	$GLOBALS['slashed_test_options'] = array( Slashed_Settings::OPTION_KEY => array( 'css_flat' => $flat ) );
	$cache->setValue( null, null );
	Slashed_Token_Store::update_overrides( is_array( $overrides ) ? $overrides : array() );
	$out[ $label ] = Slashed_CSS_Generator::get_override_css();
}

echo json_encode( $out, JSON_UNESCAPED_SLASHES );
