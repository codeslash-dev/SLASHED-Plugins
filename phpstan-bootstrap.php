<?php
/**
 * PHPStan bootstrap.
 *
 * These constants are defined at runtime in slashed.php and the per-integration
 * bootstrap files (slashed-bricks.php, slashed-gutenberg.php). PHPStan analyses
 * each file in isolation and can't see those runtime define() calls, so we
 * declare them here. The values are placeholders — only their types matter for
 * static analysis.
 *
 * @package SLASHED
 */

define( 'SLASHED_VERSION', '0.0.0' );
define( 'SLASHED_PATH', '/' );
define( 'SLASHED_URL', 'https://example.test/' );
define( 'SLASHED_CSS_REF', 'v0.0.0' );

define( 'SLASHED_BRICKS_VERSION', '0.0.0' );
define( 'SLASHED_BRICKS_PATH', '/' );
define( 'SLASHED_BRICKS_URL', 'https://example.test/' );
define( 'SLASHED_BRICKS_CSS_REF', 'v0.0.0' );

define( 'SLASHED_GUTENBERG_VERSION', '0.0.0' );
define( 'SLASHED_GUTENBERG_PATH', '/' );
define( 'SLASHED_GUTENBERG_URL', 'https://example.test/' );
define( 'SLASHED_GUTENBERG_CSS_REF', 'v0.0.0' );
define( 'SLASHED_GUTENBERG_ALLOWED_BUNDLES', array( 'essential', 'optimal', 'full' ) );
