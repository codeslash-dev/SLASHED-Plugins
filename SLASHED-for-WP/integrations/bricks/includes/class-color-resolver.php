<?php
/**
 * Bricks color resolver — thin shim over the shared Slashed_Color_Resolver.
 *
 * The oklch→hex resolution and the full scale/alpha/alias machinery are
 * builder-agnostic and now live in the shared includes/class-color-resolver.php
 * so every integration previews colors identically. This subclass preserves
 * the historical Slashed_Bricks_Color_Resolver name for existing call sites.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once SLASHED_BRICKS_PATH . '../../includes/class-color-resolver.php';

if ( ! class_exists( 'Slashed_Bricks_Color_Resolver' ) ) {
	/**
	 * Class Slashed_Bricks_Color_Resolver
	 *
	 * Behaviourally identical to Slashed_Color_Resolver; exists only as a
	 * stable alias for the Bricks integration's existing call sites.
	 */
	class Slashed_Bricks_Color_Resolver extends Slashed_Color_Resolver {}
}
