<?php
/**
 * Enqueue the SLASHED token panel inside the block editor.
 *
 * Loads the buildless ES-module panel (assets/editor/panel.js + panel.css) on
 * the post and site editors and feeds it the live token inventory via
 * wp_localize_script. The panel itself is presentation-only; all data comes
 * from Slashed_Gutenberg_Inventory so it always matches the active CSS bundle.
 *
 * @package SLASHED_Gutenberg
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Gutenberg_Editor_Enqueue
 */
class Slashed_Gutenberg_Editor_Enqueue {

	const SCRIPT_HANDLE = 'slashed-gutenberg-panel';
	const STYLE_HANDLE  = 'slashed-gutenberg-panel';
	const ASSET_DIR     = 'assets/editor/';

	public function __construct() {
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue' ) );
		add_filter( 'script_loader_tag', array( $this, 'mark_as_module' ), 10, 3 );
	}

	/**
	 * Enqueue and localize the panel assets.
	 */
	public function enqueue() {
		/**
		 * Toggle the in-editor SLASHED token panel.
		 *
		 * @param bool $enabled Default true.
		 */
		if ( ! apply_filters( 'slashed_gutenberg/show_panel', true ) ) {
			return;
		}

		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}

		if ( ! class_exists( 'Slashed_Gutenberg_Inventory' ) ) {
			return;
		}

		$base_path = SLASHED_GUTENBERG_PATH . self::ASSET_DIR;
		$base_url  = SLASHED_GUTENBERG_URL . self::ASSET_DIR;

		$js_path = $base_path . 'panel.js';
		if ( ! file_exists( $js_path ) ) {
			return;
		}

		$js_ver  = (string) filemtime( $js_path );
		$css_path = $base_path . 'panel.css';
		$css_ver  = file_exists( $css_path ) ? (string) filemtime( $css_path ) : $js_ver;

		if ( file_exists( $css_path ) ) {
			wp_enqueue_style( self::STYLE_HANDLE, $base_url . 'panel.css', array(), $css_ver );
		}

		// Registered (not enqueued via deps) — it's an ES module that imports
		// its own siblings (color-model.js, apply.js) relative to its URL, so
		// it needs no WP-declared dependencies. wp.data / wp.blocks are read
		// from the global `wp` at runtime, which the editor guarantees.
		wp_enqueue_script( self::SCRIPT_HANDLE, $base_url . 'panel.js', array(), $js_ver, true );

		wp_localize_script( self::SCRIPT_HANDLE, 'slashedGutenbergEditor', $this->build_data() );
	}

	/**
	 * Assemble the localized data payload from the inventory.
	 *
	 * @return array
	 */
	private function build_data() {
		$inv = 'Slashed_Gutenberg_Inventory';

		$class_hints = array();
		if ( class_exists( 'Slashed_Token_Page' ) && method_exists( 'Slashed_Token_Page', 'get_class_hints' ) ) {
			$hints = Slashed_Token_Page::get_class_hints();
			if ( is_array( $hints ) ) {
				$class_hints = $hints;
			}
		}

		return array(
			'colors'     => array(
				'variables' => $inv::get_color_variables(),
				'light'     => $inv::get_color_hex_map(),
				'dark'      => $inv::get_color_hex_map_dark(),
			),
			'gradients'  => $this->build_gradients( $inv ),
			'classes'    => array(
				'layout' => $inv::get_sf_classes(),
				'state'  => $inv::get_is_classes(),
			),
			'variables'  => $inv::get_variables_by_category(),
			'classHints' => $class_hints,
		);
	}

	/**
	 * Build the gradient list for the panel: { name, slug, var }.
	 *
	 * @param string $inv Inventory class name.
	 * @return array<int, array{name:string, slug:string, var:string}>
	 */
	private function build_gradients( $inv ) {
		$labels = class_exists( 'Slashed_Gutenberg_Presets' )
			? Slashed_Gutenberg_Presets::GRADIENT_LABELS
			: array();

		$out = array();
		foreach ( $inv::get_variables() as $var ) {
			if ( 0 !== strpos( $var, '--sf-gradient-' ) ) {
				continue;
			}
			$suffix = substr( $var, strlen( '--sf-gradient-' ) );
			$label  = isset( $labels[ $suffix ] )
				? $labels[ $suffix ]
				: ucwords( str_replace( array( '--', '-' ), ' ', $suffix ) );

			$out[] = array(
				'name' => $label,
				'slug' => 'slashed-' . str_replace( '--', '-', $suffix ),
				'var'  => $var,
			);
		}
		return $out;
	}

	/**
	 * Add type="module" to the panel script tag so its ES imports resolve.
	 *
	 * @param string $tag    Full script tag.
	 * @param string $handle Script handle.
	 * @param string $src    Script src.
	 * @return string
	 */
	public function mark_as_module( $tag, $handle, $src ) {
		if ( self::SCRIPT_HANDLE !== $handle ) {
			return $tag;
		}
		$tag = preg_replace( '/\stype=["\'][^"\']*["\']/', '', $tag, 1 );
		return str_replace( '<script ', '<script type="module" ', $tag );
	}
}
