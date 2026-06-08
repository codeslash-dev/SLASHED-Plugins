<?php
/**
 * Bricks CSS parser — thin shim over the shared Slashed_CSS_Parser.
 *
 * The parser logic is builder-agnostic and now lives in the shared
 * includes/class-css-parser.php so every integration parses the bundle the
 * same way. This subclass preserves the historical Slashed_Bricks_CSS_Parser
 * name so existing Bricks code and any third-party references keep working.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Load the shared base. Path is correct in both unified and standalone modes
// (SLASHED_BRICKS_PATH is defined at the top of slashed-bricks.php). require_once
// is idempotent, so this is harmless when slashed.php already loaded it.
require_once SLASHED_BRICKS_PATH . '../../includes/class-css-parser.php';

if ( ! class_exists( 'Slashed_Bricks_CSS_Parser' ) ) {
	/**
	 * Class Slashed_Bricks_CSS_Parser
	 *
	 * Behaviourally identical to Slashed_CSS_Parser; exists only as a stable
	 * alias for the Bricks integration's existing call sites.
	 */
	class Slashed_Bricks_CSS_Parser extends Slashed_CSS_Parser {}
}
