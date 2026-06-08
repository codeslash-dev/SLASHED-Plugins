<?php
/**
 * CSS enqueue for the block editor and frontend.
 *
 * @package SLASHED_Gutenberg
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Gutenberg_Enqueue
 *
 * Loads the SLASHED CSS bundle in three contexts:
 *   1. Block editor canvas (enqueue_block_editor_assets) — so variables
 *      and design tokens are live in the editing surface.
 *   2. Public frontend (wp_enqueue_scripts) — the standard page load.
 *
 * Dark-mode bridge
 * ────────────────
 * SLASHED drives dark mode via `color-scheme` and `--sf-is-dark` (see
 * core/themes.css). The block editor uses `data-wp-dark-mode-active` on
 * <html> (WP 6.4+). An inline rule maps that attribute into SLASHED's
 * theme layer so the editing surface tracks the editor's dark-mode toggle.
 * The rule is harmless on the frontend where the attribute is never set.
 */
class Slashed_Gutenberg_Enqueue {

	public function __construct() {
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_styles' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_styles' ) );
	}

	/**
	 * Load SLASHED CSS into the block editor.
	 *
	 * `enqueue_block_editor_assets` fires for both the post editor and the
	 * site editor (FSE). Styles registered here are injected directly into
	 * the editor iframe so they affect the editing canvas, not the
	 * surrounding wp-admin chrome.
	 *
	 * In unified mode the shared Slashed_Core_Enqueue already enqueues the
	 * `slashed-framework` handle on this hook (at an earlier priority), so this
	 * method only layers the dark-mode bridge on top — avoiding a redundant
	 * second registration of the same handle. In standalone mode this class
	 * owns the bundle enqueue.
	 */
	public function enqueue_editor_styles() {
		if ( ! class_exists( 'Slashed_Core_Enqueue' ) ) {
			$css_url = slashed_gutenberg_get_css_url();
			if ( '' === $css_url ) {
				return;
			}
			wp_enqueue_style(
				'slashed-framework',
				$css_url,
				array(),
				$this->get_version( $css_url )
			);
		}

		// Bridge the Gutenberg dark-mode toggle to SLASHED's theme system.
		// Attaches to whichever code enqueued the shared handle.
		if ( wp_style_is( 'slashed-framework', 'enqueued' ) ) {
			wp_add_inline_style(
				'slashed-framework',
				'@layer slashed.themes{html[data-wp-dark-mode-active]{color-scheme:dark;--sf-is-dark:1}}'
			);
		}
	}

	/**
	 * Load SLASHED CSS on the public frontend.
	 *
	 * In unified mode the shared Slashed_Core_Enqueue owns the frontend bundle,
	 * so this method bails to avoid a duplicate enqueue. In standalone mode it
	 * enqueues the bundle itself.
	 *
	 * Skips the Bricks builder-panel context when Bricks is active:
	 * loading CSS resets into the builder chrome breaks Bricks' icons.
	 */
	public function enqueue_frontend_styles() {
		if ( class_exists( 'Slashed_Core_Enqueue' ) ) {
			return;
		}

		if ( function_exists( 'bricks_is_builder_main' ) && bricks_is_builder_main() ) {
			return;
		}

		$css_url = slashed_gutenberg_get_css_url();
		if ( '' === $css_url ) {
			return;
		}

		wp_enqueue_style(
			'slashed-framework',
			$css_url,
			array(),
			$this->get_version( $css_url )
		);
	}

	/**
	 * Derive a cache-busting version string from the local file mtime when
	 * available; falls back to the plugin version constant.
	 *
	 * @param string $css_url Resolved URL for the bundle.
	 * @return string
	 */
	private function get_version( $css_url ) {
		if ( class_exists( 'Slashed_CSS_Loader' ) ) {
			return Slashed_CSS_Loader::get_version( $css_url );
		}

		// Standalone fallback.
		$filename = basename( (string) wp_parse_url( $css_url, PHP_URL_PATH ) );
		if ( '' === $filename ) {
			return SLASHED_GUTENBERG_VERSION;
		}

		$repo_path  = SLASHED_GUTENBERG_PATH . '../../dist/' . $filename;
		$local_path = SLASHED_GUTENBERG_PATH . 'dist/' . $filename;

		if ( file_exists( $repo_path ) ) {
			return (string) filemtime( $repo_path );
		}
		if ( file_exists( $local_path ) ) {
			return (string) filemtime( $local_path );
		}

		return SLASHED_GUTENBERG_VERSION;
	}
}
