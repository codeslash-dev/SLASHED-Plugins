<?php
/**
 * CSS enqueue logic for frontend and Bricks editor iframe.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Slashed_Bricks_Enqueue
 *
 * Adds Bricks-specific inline rules on top of the globally-registered
 * `slashed-framework` handle (registered by Slashed_Core_Enqueue).
 */
class Slashed_Bricks_Enqueue {

    public function __construct() {
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_styles' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_editor_styles' ) );
    }

    /**
     * Add Bricks-specific inline CSS on the frontend and canvas iframe.
     *
     * `slashed-framework` is registered globally by Slashed_Core_Enqueue.
     * This method only adds the dark-mode bridge that maps Bricks'
     * data-brx-theme attribute to SLASHED's colour-scheme / --sf-is-dark
     * system. The builder-panel context is skipped for the same reason the
     * global enqueue skips it (see Slashed_Core_Enqueue::enqueue_frontend).
     */
    public function enqueue_frontend_styles() {
        if ( function_exists( 'bricks_is_builder_main' ) && bricks_is_builder_main() ) {
            return;
        }

        // Bridge Bricks' dark mode toggle (data-brx-theme attribute) to SLASHED's theme system.
        wp_add_inline_style(
            'slashed-framework',
            '@layer slashed.themes{[data-brx-theme="light"]{color-scheme:light;--sf-is-dark:0}[data-brx-theme="dark"]{color-scheme:dark;--sf-is-dark:1}}'
        );
    }

    /**
     * Enqueue editor-specific styles in the Bricks admin panel.
     *
     * Only loads on Bricks builder pages for panel styling.
     */
    public function enqueue_editor_styles() {
        if ( ! function_exists( 'bricks_is_builder_main' ) ) {
            return;
        }

        if ( ! bricks_is_builder_main() ) {
            return;
        }

        $editor_css = SLASHED_BRICKS_URL . 'assets/editor.css';

        wp_enqueue_style(
            'slashed-bricks-editor',
            $editor_css,
            array(),
            SLASHED_BRICKS_VERSION
        );
    }
}
