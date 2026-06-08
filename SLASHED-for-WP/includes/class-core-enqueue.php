<?php
/**
 * Core SLASHED CSS enqueue — builder-agnostic.
 *
 * Registers and enqueues the `slashed-framework` stylesheet on every
 * WordPress site where the plugin is active, regardless of which builder
 * (if any) is installed. This makes SLASHED usable with custom themes,
 * classic themes, or any setup that does not match a bundled integration.
 *
 * Builder integrations add their own inline rules on top of the
 * `slashed-framework` handle (e.g. Bricks dark-mode bridge, Gutenberg
 * dark-mode bridge). Token override CSS is injected separately by
 * slashed_inject_token_overrides() at priority 20.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Core_Enqueue
 */
class Slashed_Core_Enqueue {

	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend' ) );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor' ) );
	}

	/**
	 * Enqueue the framework stylesheet on the public frontend (and Bricks canvas iframe).
	 *
	 * Skips the Bricks builder-panel context: loading CSS resets into the
	 * builder admin chrome breaks Bricks' toolbar icons and colours.
	 * bricks_is_builder_main() returns true only for that panel — the canvas
	 * iframe and public frontend both pass this guard correctly.
	 */
	public function enqueue_frontend() {
		if ( function_exists( 'bricks_is_builder_main' ) && bricks_is_builder_main() ) {
			return;
		}

		$url = Slashed_CSS_Loader::get_url();
		if ( '' === $url ) {
			return;
		}

		wp_enqueue_style( 'slashed-framework', $url, array(), Slashed_CSS_Loader::get_version( $url ) );

		// HTML font-size override — affects all rem-based framework values.
		$this->inject_html_font_size_css( 'slashed-framework' );
	}

	/**
	 * Enqueue the framework stylesheet in the block editor.
	 *
	 * Fires for both the post editor and FSE site editor. Styles are injected
	 * into the editor iframe so they affect the editing canvas without touching
	 * the surrounding wp-admin chrome.
	 */
	public function enqueue_editor() {
		$url = Slashed_CSS_Loader::get_url();
		if ( '' === $url ) {
			return;
		}
		wp_enqueue_style( 'slashed-framework', $url, array(), Slashed_CSS_Loader::get_version( $url ) );

		// Mirror the frontend rem-base override so the iframed editor canvas
		// matches the public site. The block editor is always iframed in WP 6.4+
		// (our declared minimum), so this rule targets the canvas <html>, not
		// the surrounding wp-admin chrome.
		$this->inject_html_font_size_css( 'slashed-framework' );
	}

	/**
	 * Add an inline html { font-size } rule to the given stylesheet handle when
	 * the plugin's html_font_size setting is set to a supported value.
	 *
	 * @param string $handle The registered stylesheet handle to attach the inline style to.
	 */
	private function inject_html_font_size_css( string $handle ): void {
		$settings  = Slashed_Token_Store::get_plugin_settings();
		$font_size = isset( $settings['html_font_size'] ) ? (string) $settings['html_font_size'] : '';
		if ( '100' === $font_size || '62.5' === $font_size ) {
			wp_add_inline_style( $handle, 'html { font-size: ' . $font_size . '% !important; }' );
		}
	}
}
