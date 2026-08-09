<?php
/**
 * SLASHED Frontend Configurator.
 *
 * Injects the token editor as a floating overlay on any WordPress frontend
 * page for users who have the manage_options capability. The overlay renders
 * as a collapsible right-side panel; the live page itself acts as the preview
 * — token overrides are injected into the page's own CSS custom properties,
 * so every style change is visible in real time without an iframe.
 *
 * Activation: admin bar button (dispatches a custom DOM event that the Svelte
 * app listens to). State (open/closed, last active panel) is persisted in
 * localStorage so it survives navigation between pages.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Frontend_Configurator
 */
class Slashed_Frontend_Configurator {

	/**
	 * Attributes that opt the overlay's ES-module script out of third-party JS
	 * optimisers (LiteSpeed / SG Optimizer / WP Rocket / Perfmatters / Cloudflare
	 * Rocket Loader). Combining or delaying a native module breaks its scope and
	 * Svelte's delegated events, leaving the overlay rendered but unresponsive.
	 * See Slashed_Token_Page::NO_OPTIMIZE_ATTRS for the full rationale — kept as a
	 * local copy so this integration file has no cross-class coupling.
	 */
	const NO_OPTIMIZE_ATTRS = ' data-no-optimize="1" data-no-defer="1" data-no-delay="1" data-no-minify="1" data-nowprocket="1" data-cfasync="false"';

	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ), 30 );
		add_action( 'admin_bar_menu', array( $this, 'add_admin_bar_node' ), 100 );
		add_action( 'wp_footer', array( $this, 'render_container' ), 100 );
		add_filter( 'wp_inline_script_attributes', array( $this, 'mark_inline_no_optimize' ), 10, 2 );
	}

	/**
	 * Carry the optimiser opt-out onto the overlay handle's inline scripts
	 * (the `__SLASHED_FW_VERSION__` global and the `slashedApp` hydration data).
	 *
	 * @param array  $attributes Inline <script> tag attributes (includes `id`).
	 * @param string $data       The inline script body (unused).
	 * @return array
	 */
	public function mark_inline_no_optimize( $attributes, $data ) {
		$id = isset( $attributes['id'] ) ? (string) $attributes['id'] : '';
		if ( 0 === strpos( $id, 'slashed-frontend-overlay-js' ) ) {
			$attributes['data-no-optimize'] = '1';
			$attributes['data-nowprocket']  = '1';
			$attributes['data-cfasync']     = 'false';
		}
		return $attributes;
	}

	/**
	 * Enqueue the admin-app bundle (shared with the WP admin editor) on the
	 * frontend only for capable users. The same JS/CSS is reused; a different
	 * mount-point element triggers AppOverlay instead of the full App.
	 */
	public function enqueue_assets() {
		if ( ! $this->should_load() ) {
			return;
		}

		$plugin_url  = defined( 'SLASHED_URL' ) ? SLASHED_URL : '';
		$plugin_path = defined( 'SLASHED_PATH' ) ? SLASHED_PATH : '';

		$js_path = $plugin_path . 'assets/admin-app/app.js';

		if ( ! file_exists( $js_path ) ) {
			return;
		}

		$js_ver = (string) filemtime( $js_path );

		wp_enqueue_script(
			'slashed-frontend-overlay',
			$plugin_url . 'assets/admin-app/app.js',
			array(),
			$js_ver,
			true
		);

		add_filter( 'script_loader_tag', array( $this, 'mark_as_module' ), 10, 3 );

		// Framework version pill reads from this global (see StudioHeader.svelte).
		$fw_version = '';
		if ( class_exists( 'Slashed_Framework_Updater' ) ) {
			$fw_version = ltrim( Slashed_Framework_Updater::get_local_version(), 'v' );
		} elseif ( defined( 'SLASHED_CSS_REF' ) ) {
			$fw_version = ltrim( SLASHED_CSS_REF, 'v' );
		}
		wp_add_inline_script(
			'slashed-frontend-overlay',
			'window.__SLASHED_FW_VERSION__=' . wp_json_encode( $fw_version ) . ';',
			'before'
		);

		// Hydrate window.slashedApp — the presence of rest.url puts the app in
		// embedded (WordPress) mode: initial overrides from the DB, changes saved
		// via REST API, live CSS injected into the page's own <head>.
		$overrides = array();
		if ( class_exists( 'Slashed_Token_Store' ) ) {
			$overrides = Slashed_Token_Store::get_overrides();
		}

		wp_localize_script(
			'slashed-frontend-overlay',
			'slashedApp',
			array(
				'cssUrl'    => esc_url_raw( $plugin_url . 'assets/admin-app/app.css' ),
				'rest'      => array(
					'url'   => esc_url_raw( rest_url( Slashed_REST_Controller::NAMESPACE ) ),
					'nonce' => wp_create_nonce( 'wp_rest' ),
				),
				'overrides' => (object) $overrides,
			)
		);
	}

	/**
	 * Add a "/ Design" node to the admin bar that toggles the overlay.
	 *
	 * When the panel assets are already loaded (query param present) the button
	 * toggles via a custom DOM event so no page reload is required. When the
	 * assets have not been loaded yet the button navigates to the same URL with
	 * ?slashed-frontend-panel appended, which triggers asset injection on load.
	 *
	 * @param WP_Admin_Bar $wp_admin_bar Admin bar instance.
	 */
	public function add_admin_bar_node( $wp_admin_bar ) {
		if ( ! $this->can_access_frontend_panel() ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$panel_active = isset( $_GET['slashed-frontend-panel'] );

		// The overlay mount is deferred until its CSS loads (up to 5 s). Use a
		// data-slashed-ready attribute set by plugin-main.ts after mount() to
		// gate the toggle event, so early clicks fall back to a navigation
		// instead of dispatching to an unmounted (no-listener) component.
		$activate_url = esc_url( add_query_arg( 'slashed-frontend-panel', '' ) );
		if ( $panel_active ) {
			$href    = $activate_url;
			$onclick = "(function(e){var el=document.getElementById('slashed-frontend-overlay');if(el&&el.hasAttribute('data-slashed-ready')){document.dispatchEvent(new CustomEvent('slashed:toggle-overlay'));e.preventDefault();}})(event);";
		} else {
			$href    = $activate_url;
			$onclick = '';
		}

		$wp_admin_bar->add_node(
			array(
				'id'    => 'slashed-frontend-editor',
				'title' => '<span aria-hidden="true" style="font-weight:900;margin-right:3px;">/</span> Design',
				'href'  => $href,
				'meta'  => array(
					'onclick' => $onclick,
					'title'   => 'Toggle SLASHED token editor overlay',
				),
			)
		);
	}

	/**
	 * Output the mount-point div at the end of the page body.
	 * The Svelte entry (plugin-main.ts) detects #slashed-frontend-overlay
	 * and mounts AppOverlay into it.
	 */
	public function render_container() {
		if ( ! $this->should_load() ) {
			return;
		}
		// pointer-events:none until the Svelte overlay mounts. This container is a
		// full-height fixed layer (the whole viewport width on mobile), so while it
		// sits empty — before mount, which plugin-main.ts defers until the panel
		// CSS loads (up to 5s), and forever if the module is broken by a JS
		// optimiser — a transparent hit-testing layer would silently swallow every
		// click over its area. AppOverlay's syncHostBounds() sets pointer-events
		// back to auto once mounted, and the panel/trigger re-enable it on their
		// own surfaces, so the live editor stays fully interactive.
		echo '<div id="slashed-frontend-overlay" style="position:fixed;right:0;top:var(--wp-admin--admin-bar--height,32px);width:min(420px,100vw);height:calc(100vh - var(--wp-admin--admin-bar--height,32px));z-index:99998;pointer-events:none;"></div>';
	}

	/**
	 * Add type="module" to the overlay script tag (ESM bundle).
	 *
	 * @param string $tag    Script HTML tag.
	 * @param string $handle Registered script handle.
	 * @param string $src    Script source URL.
	 * @return string
	 */
	public function mark_as_module( $tag, $handle, $src ) {
		if ( 'slashed-frontend-overlay' !== $handle ) {
			return $tag;
		}
		return preg_replace(
			'/<script(\b[^>]*)>/',
			'<script type="module"' . self::NO_OPTIMIZE_ATTRS . '$1>',
			$tag,
			1
		);
	}

	/**
	 * Whether the current user can access the frontend panel at all.
	 * Used for the admin-bar node — shows the entry point on every frontend page.
	 *
	 * @return bool
	 */
	private function can_access_frontend_panel() {
		return ! is_admin()
			&& is_admin_bar_showing()
			&& current_user_can( 'manage_options' );
	}

	/**
	 * Whether the overlay assets and mount container should be injected.
	 * Requires ?slashed-frontend-panel in the URL in addition to capability checks,
	 * so the panel only activates on pages where it is explicitly requested.
	 *
	 * @return bool
	 */
	private function should_load() {
		return $this->can_access_frontend_panel()
			&& isset( $_GET['slashed-frontend-panel'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	}
}
