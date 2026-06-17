<?php
/**
 * Enqueue the reBEMer editor bundle inside the Bricks builder panel.
 *
 * Builder-only, capability-gated, stable filenames + filemtime cache-bust.
 * Editor data (class hints, color maps, variable hints) is localized
 * separately by Slashed_Bricks_Editor_Data.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Slashed_Bricks_ReBEMer_Enqueue {

	const SCRIPT_HANDLE      = 'slashed-bricks-rebemer';
	const STYLE_HANDLE       = 'slashed-bricks-rebemer';
	const VAR_HINTS_HANDLE   = 'slashed-bricks-var-hints';
	const ASSET_DIR          = 'assets/editor-app/';

	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ), 9999 );
		add_filter( 'script_loader_tag', array( $this, 'mark_as_module' ), 10, 3 );
	}

	public function enqueue() {
		if ( ! function_exists( 'bricks_is_builder_main' ) || ! bricks_is_builder_main() ) {
			return;
		}
		if ( ! current_user_can( 'bricks_full_access' ) && ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$base_path = SLASHED_BRICKS_PATH . self::ASSET_DIR;
		$base_url  = SLASHED_BRICKS_URL . self::ASSET_DIR;

		$js_path = $base_path . 'app.js';
		if ( ! file_exists( $js_path ) ) {
			return; // Bundle not built yet.
		}

		$js_ver  = (string) filemtime( $js_path );
		$css_ver = file_exists( $base_path . 'app.css' ) ? (string) filemtime( $base_path . 'app.css' ) : $js_ver;

		wp_enqueue_style( self::STYLE_HANDLE, $base_url . 'app.css', array(), $css_ver );
		wp_enqueue_script( self::SCRIPT_HANDLE, $base_url . 'app.js', array(), $js_ver, true );

		// Variable-picker tooltip hints — delivered as a standalone IIFE so the
		// Vite bundle does not need to be rebuilt to ship this feature. Depends
		// on the main bundle so it always loads after app.js.
		$hints_path = $base_path . 'variable-hints.iife.js';
		if ( file_exists( $hints_path ) ) {
			wp_enqueue_script(
				self::VAR_HINTS_HANDLE,
				$base_url . 'variable-hints.iife.js',
				array( self::SCRIPT_HANDLE ),
				(string) filemtime( $hints_path ),
				true
			);
		}
	}

	public function mark_as_module( $tag, $handle, $src ) {
		if ( self::SCRIPT_HANDLE !== $handle ) {
			return $tag;
		}
		// Strip any existing type attribute to avoid duplicates on WP < 6.3.
		$tag = preg_replace( '/\stype=["\'][^"\']*["\']/', '', $tag, 1 );
		return str_replace( '<script ', '<script type="module" ', $tag );
	}
}
