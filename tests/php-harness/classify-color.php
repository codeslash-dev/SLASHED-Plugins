<?php
/**
 * Standalone harness: reflectively invokes
 * Slashed_Gutenberg_Presets::classify_color() outside a WordPress bootstrap,
 * for cross-implementation testing against the JS classifyVar() ports in
 * ../color-model-cross-impl.test.js (PL-015).
 *
 * classify_color() is private and reads no instance state (verified: its
 * body only references the self::BRAND_FAMILIES / self::STATUS_FAMILIES
 * class constants), so newInstanceWithoutConstructor() avoids needing a real
 * WordPress bootstrap for the constructor's add_theme_support()/add_filter()
 * calls.
 *
 * Usage: reads a JSON array of --sf-color-* var names from stdin, writes a
 * JSON array of { var, result } to stdout, where result mirrors
 * classify_color()'s return shape (or null).
 */

define( 'ABSPATH', __DIR__ . '/' );

require dirname( __DIR__, 2 ) . '/SLASHED-for-WP/integrations/gutenberg/includes/class-presets.php';

$vars = json_decode( file_get_contents( 'php://stdin' ), true );
if ( ! is_array( $vars ) ) {
	fwrite( STDERR, "Expected a JSON array of var names on stdin.\n" );
	exit( 1 );
}

$reflection = new ReflectionClass( 'Slashed_Gutenberg_Presets' );
$instance   = $reflection->newInstanceWithoutConstructor();
$method     = $reflection->getMethod( 'classify_color' );
$method->setAccessible( true );

$results = array();
foreach ( $vars as $var ) {
	$results[] = array(
		'var'    => $var,
		'result' => $method->invoke( $instance, $var ),
	);
}

echo json_encode( $results );
