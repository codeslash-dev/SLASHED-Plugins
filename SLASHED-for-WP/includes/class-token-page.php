<?php
/**
 * SLASHED token editor admin page.
 *
 * Registers the "Tokens" admin page and mounts the Svelte SPA built from
 * admin-app/ (new unified build) with a fallback to the legacy
 * integrations/bricks/admin-app/ build.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Token_Page
 */
class Slashed_Token_Page {

	/**
	 * Admin page slug.
	 */
	const PAGE_SLUG = 'slashed-tokens';

	/** @var string Hook suffix from add_*_page(), used to gate asset enqueue. */
	private $hook_suffix = '';

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * Register the Tokens page under the top-level SLASHED menu.
	 *
	 * In unified mode (slashed.php active): sub-page of 'slashed'.
	 * In standalone mode: own top-level menu (fallback for direct activation
	 * of an integration plugin that bundles the shared includes).
	 */
	public function register_menu() {
		if ( defined( 'SLASHED_VERSION' ) ) {
			$this->hook_suffix = (string) add_submenu_page(
				'slashed',
				__( 'Design Settings', 'slashed' ),
				__( 'Design Settings', 'slashed' ),
				'manage_options',
				self::PAGE_SLUG,
				array( $this, 'render_page' )
			);
		} else {
			$this->hook_suffix = (string) add_menu_page(
				__( 'SLASHED Tokens', 'slashed' ),
				__( 'SLASHED', 'slashed' ),
				'manage_options',
				self::PAGE_SLUG,
				array( $this, 'render_page' ),
				'dashicons-art',
				59
			);
		}
	}

	/**
	 * Resolve the base URL and path for the admin-app bundle.
	 *
	 * Prefers the new top-level admin-app/ build (SLASHED_PATH/assets/admin-app/).
	 * Falls back to the legacy integrations/bricks/assets/admin-app/ location
	 * so existing installations keep working until the new build is present.
	 *
	 * @return array{url: string, path: string}
	 */
	private function resolve_bundle_base() {
		if ( defined( 'SLASHED_PATH' ) && file_exists( SLASHED_PATH . 'assets/admin-app/app.js' ) ) {
			return array(
				'url'  => SLASHED_URL,
				'path' => SLASHED_PATH,
			);
		}

		if ( defined( 'SLASHED_PATH' ) && defined( 'SLASHED_URL' ) ) {
			return array(
				'url'  => SLASHED_URL . 'integrations/bricks/',
				'path' => SLASHED_PATH . 'integrations/bricks/',
			);
		}

		// Standalone Bricks plugin: SLASHED_BRICKS_* already point to integrations/bricks/.
		if ( ! defined( 'SLASHED_BRICKS_URL' ) || ! defined( 'SLASHED_BRICKS_PATH' ) ) {
			return array( 'url' => '', 'path' => '' );
		}
		return array(
			'url'  => SLASHED_BRICKS_URL,
			'path' => SLASHED_BRICKS_PATH,
		);
	}

	/**
	 * Enqueue the Svelte token editor bundle on this page only.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 */
	public function enqueue_assets( $hook_suffix ) {
		if ( '' === $this->hook_suffix || $hook_suffix !== $this->hook_suffix ) {
			return;
		}

		$base = $this->resolve_bundle_base();
		$plugin_url  = $base['url'];
		$plugin_path = $base['path'];

		$js_path  = $plugin_path . 'assets/admin-app/app.js';
		$css_path = $plugin_path . 'assets/admin-app/app.css';

		if ( ! file_exists( $js_path ) ) {
			add_action( 'admin_notices', array( $this, 'render_missing_bundle_notice' ) );
			return;
		}

		$js_version  = (string) filemtime( $js_path );
		$css_version = file_exists( $css_path ) ? (string) filemtime( $css_path ) : $js_version;

		wp_enqueue_style(
			'slashed-admin-app',
			$plugin_url . 'assets/admin-app/app.css',
			array(),
			$css_version
		);

		wp_enqueue_script(
			'slashed-admin-app',
			$plugin_url . 'assets/admin-app/app.js',
			array(),
			$js_version,
			true
		);

		add_filter( 'script_loader_tag', array( $this, 'mark_as_module' ), 10, 3 );

		$plugin_settings = Slashed_Token_Store::get_plugin_settings();

		wp_localize_script(
			'slashed-admin-app',
			'slashedApp',
			array(
				'rest'               => array(
					'url'   => esc_url_raw( rest_url( Slashed_REST_Controller::NAMESPACE ) ),
					'nonce' => wp_create_nonce( 'wp_rest' ),
				),
				'overrides'          => (object) get_option( 'slashed_overrides', array() ),
				'tabs'               => Slashed_Tab_Registry::get_all(),
				'defaults'           => Slashed_Token_Defaults::get_all(),
				'settings'           => Slashed_Token_Store::get_settings(),
				'pluginSettings'     => array_merge(
					array(
						'manual_css_mode'  => false,
						'configurator_url' => '',
					),
					$plugin_settings
				),
				'inventory'          => class_exists( 'Slashed_Bricks_Inventory' ) ? Slashed_Bricks_Inventory::get() : null,
				'classHints'         => self::get_class_hints(),
				'versions'           => array(
					'plugin'    => defined( 'SLASHED_VERSION' ) ? SLASHED_VERSION : SLASHED_BRICKS_VERSION,
					'framework' => defined( 'SLASHED_CSS_REF' ) ? SLASHED_CSS_REF : SLASHED_BRICKS_CSS_REF,
				),
				'activeIntegrations' => array(
					'bricks'    => class_exists( 'Slashed_Settings' ) ? Slashed_Settings::is_enabled( 'bricks' ) : true,
					'gutenberg' => class_exists( 'Slashed_Settings' ) ? Slashed_Settings::is_enabled( 'gutenberg' ) : true,
				),
				'bricksFonts'        => self::get_bricks_fonts(),
				'settingsUrl'        => class_exists( 'Slashed_Admin' )
					? esc_url_raw( admin_url( 'admin.php?page=' . \Slashed_Admin::PAGE_SLUG ) )
					: '',
			)
		);
	}

	/**
	 * Load the class hints map from the bundled JSON file.
	 *
	 * @return array
	 */
	public static function get_class_hints() {
		if ( defined( 'SLASHED_PATH' ) ) {
			$path = SLASHED_PATH . 'data/classes-hints.json';
		} elseif ( defined( 'SLASHED_BRICKS_PATH' ) ) {
			$path = dirname( SLASHED_BRICKS_PATH, 2 ) . '/data/classes-hints.json';
		} elseif ( defined( 'SLASHED_GUTENBERG_PATH' ) ) {
			$path = dirname( SLASHED_GUTENBERG_PATH, 2 ) . '/data/classes-hints.json';
		} else {
			return array();
		}

		if ( ! file_exists( $path ) ) {
			return array();
		}

		$data = wp_json_file_decode( $path, array( 'associative' => true ) );
		return is_array( $data ) ? $data : array();
	}

	const CPT_FONTS_TRANSIENT = 'slashed_bricks_cpt_fonts';
	const CPT_FONTS_POST_TYPE = 'bricks_fonts';

	public static function get_bricks_fonts_post_type() {
		return defined( 'BRICKS_DB_CUSTOM_FONTS' ) ? BRICKS_DB_CUSTOM_FONTS : self::CPT_FONTS_POST_TYPE;
	}

	public static function flush_bricks_fonts_cache() {
		delete_transient( self::CPT_FONTS_TRANSIENT );
	}

	public static function get_bricks_fonts() {
		if ( class_exists( 'Slashed_Settings' ) && ! Slashed_Settings::is_enabled( 'bricks' ) ) {
			return array();
		}

		$fonts = array();

		$custom = get_option( 'bricks_custom_fonts', array() );
		if ( is_array( $custom ) ) {
			foreach ( $custom as $font ) {
				if ( ! is_array( $font ) ) {
					continue;
				}
				$family = $font['font_family'] ?? $font['family'] ?? $font['title'] ?? $font['name'] ?? null;
				$label  = $font['title'] ?? $font['name'] ?? $family;
				if ( ! $family || ! is_string( $family ) ) {
					continue;
				}
				$fonts[] = array(
					'family' => sanitize_text_field( $family ),
					'label'  => sanitize_text_field( is_string( $label ) ? $label : $family ),
					'source' => 'custom',
				);
			}
		}

		$google = get_option( 'bricks_google_fonts', array() );
		if ( is_array( $google ) ) {
			foreach ( $google as $font ) {
				if ( ! is_array( $font ) ) {
					continue;
				}
				$family = $font['family'] ?? $font['font_family'] ?? $font['name'] ?? $font['title'] ?? null;
				if ( ! $family || ! is_string( $family ) ) {
					continue;
				}
				$fonts[] = array(
					'family' => sanitize_text_field( $family ),
					'label'  => sanitize_text_field( $font['name'] ?? $family ),
					'source' => 'google',
				);
			}
		}

		$adobe = get_option( 'bricks_adobe_fonts', array() );
		if ( is_array( $adobe ) && ! empty( $adobe['fonts'] ) && is_array( $adobe['fonts'] ) ) {
			foreach ( $adobe['fonts'] as $font ) {
				if ( ! is_array( $font ) ) {
					continue;
				}
				$family = $font['font_family'] ?? $font['family'] ?? null;
				$label  = $font['label'] ?? $font['name'] ?? $family;
				if ( ! $family || ! is_string( $family ) ) {
					continue;
				}
				$fonts[] = array(
					'family' => sanitize_text_field( $family ),
					'label'  => sanitize_text_field( is_string( $label ) ? $label : $family ),
					'source' => 'adobe',
				);
			}
		}

		$font_post_type = self::get_bricks_fonts_post_type();
		if ( post_type_exists( $font_post_type ) ) {
			$cpt_cached = get_transient( self::CPT_FONTS_TRANSIENT );

			if ( false !== $cpt_cached && is_array( $cpt_cached ) ) {
				$fonts = array_merge( $fonts, $cpt_cached );
			} else {
				$cpt_fonts = array();
				$cpt_posts = get_posts(
					array(
						'post_type'      => $font_post_type,
						'posts_per_page' => -1,
						'post_status'    => array( 'publish', 'draft' ),
						'fields'         => 'ids',
						'no_found_rows'  => true,
					)
				);
				foreach ( $cpt_posts as $post_id ) {
					$family = html_entity_decode( (string) get_the_title( $post_id ), ENT_QUOTES, 'UTF-8' );
					if ( ! $family ) {
						continue;
					}
					$cpt_fonts[] = array(
						'family' => sanitize_text_field( $family ),
						'label'  => sanitize_text_field( $family ),
						'source' => 'custom',
					);
				}
				set_transient( self::CPT_FONTS_TRANSIENT, $cpt_fonts, HOUR_IN_SECONDS );
				$fonts = array_merge( $fonts, $cpt_fonts );
			}
		}

		$seen   = array();
		$unique = array();
		foreach ( $fonts as $font ) {
			$key = strtolower( $font['family'] );
			if ( ! isset( $seen[ $key ] ) ) {
				$seen[ $key ] = true;
				$unique[]     = $font;
			}
		}

		return $unique;
	}

	public function mark_as_module( $tag, $handle, $src ) {
		if ( 'slashed-admin-app' !== $handle ) {
			return $tag;
		}
		return preg_replace( '/<script(\b[^>]*)>/', '<script type="module"$1>', $tag, 1 );
	}

	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<div id="slashed-admin-app">
				<noscript>
					<div class="notice notice-warning">
						<p><?php esc_html_e( 'This settings page requires JavaScript to be enabled in your browser.', 'slashed' ); ?></p>
					</div>
				</noscript>
				<p style="color:#50575e; padding: 24px 0;">
					<?php esc_html_e( 'Loading SLASHED settings…', 'slashed' ); ?>
				</p>
			</div>
		</div>
		<?php
	}

	public function render_missing_bundle_notice() {
		echo '<div class="notice notice-error"><p>';
		esc_html_e( 'SLASHED admin SPA bundle is missing. Run `npm install && npm run build` inside admin-app/ to generate it.', 'slashed' );
		echo '</p></div>';
	}
}
