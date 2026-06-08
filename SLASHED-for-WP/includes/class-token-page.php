<?php
/**
 * SLASHED token editor admin page.
 *
 * Registers the "Tokens" admin page and mounts the Svelte SPA built from
 * integrations/bricks/admin-app/. The SPA is the global token editor for
 * all SLASHED integrations — not Bricks-specific.
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
				__( 'Tokens', 'slashed' ),
				__( 'Tokens', 'slashed' ),
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
	 * Enqueue the Svelte token editor bundle on this page only.
	 *
	 * The built assets live in integrations/bricks/assets/admin-app/ — that
	 * is where admin-app/ is built. The SPA source lives alongside Bricks
	 * integration code because it was born there; the built output can be
	 * relocated when a separate build target is warranted.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 */
	public function enqueue_assets( $hook_suffix ) {
		if ( '' === $this->hook_suffix || $hook_suffix !== $this->hook_suffix ) {
			return;
		}

		if ( defined( 'SLASHED_URL' ) ) {
			$plugin_url  = SLASHED_URL  . 'integrations/bricks/';
			$plugin_path = SLASHED_PATH . 'integrations/bricks/';
		} else {
			// Standalone Bricks plugin: SLASHED_BRICKS_* already point to integrations/bricks/.
			$plugin_url  = SLASHED_BRICKS_URL;
			$plugin_path = SLASHED_BRICKS_PATH;
		}

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

		wp_localize_script(
			'slashed-admin-app',
			'slashedApp',
			array(
				'rest'               => array(
					'url'   => esc_url_raw( rest_url( Slashed_REST_Controller::NAMESPACE ) ),
					'nonce' => wp_create_nonce( 'wp_rest' ),
				),
				'tabs'               => Slashed_Tab_Registry::get_all(),
				'defaults'           => Slashed_Token_Defaults::get_all(),
				'settings'           => Slashed_Token_Store::get_settings(),
				'pluginSettings'     => Slashed_Token_Store::get_plugin_settings(),
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
		// Resolve the shared data/ dir from whichever entry point is loaded.
		// Unified defines SLASHED_PATH; standalone integrations define their own
		// base two levels below the plugin root (integrations/<builder>/).
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

	/**
	 * Transient key caching the Bricks Font-Manager CPT font list.
	 *
	 * Shared with Slashed_Bricks_Fonts_REST, which busts it on
	 * save_post_{<font CPT slug>} (see get_bricks_fonts_post_type()). Kept
	 * here too because this class is the canonical owner of the collector and
	 * is always loaded, whereas the REST class is only required during REST
	 * dispatch.
	 */
	const CPT_FONTS_TRANSIENT = 'slashed_bricks_cpt_fonts';

	/**
	 * Post type slug for the Bricks Font Manager CPT.
	 *
	 * Bricks does not expose this as a constant we can rely on, so we use the
	 * slug observed in the wild (Bricks › Settings › Custom Fonts admin URLs
	 * read /wp-admin/edit.php?post_type=bricks_fonts). BRICKS_DB_CUSTOM_FONTS
	 * is honoured first in case a future Bricks version defines it.
	 */
	const CPT_FONTS_POST_TYPE = 'bricks_fonts';

	/**
	 * Resolve the Bricks Font Manager CPT slug: prefer the constant Bricks may
	 * define, fall back to the known slug.
	 *
	 * @return string
	 */
	public static function get_bricks_fonts_post_type() {
		return defined( 'BRICKS_DB_CUSTOM_FONTS' ) ? BRICKS_DB_CUSTOM_FONTS : self::CPT_FONTS_POST_TYPE;
	}

	/**
	 * Flush the cached Bricks Font-Manager CPT font list.
	 *
	 * Registered on save_post_{<font CPT slug>} (see get_bricks_fonts_post_type())
	 * from an always-loaded bootstrap path (see slashed-bricks.php) rather than
	 * from REST route registration, so the cache is invalidated on every
	 * custom-font save — including normal admin saves, not only REST requests.
	 */
	public static function flush_bricks_fonts_cache() {
		delete_transient( self::CPT_FONTS_TRANSIENT );
	}

	/**
	 * Collect every font Bricks already knows how to serve.
	 *
	 * Canonical implementation shared by the admin SPA bootstrap (here) and
	 * the REST endpoint (Slashed_Bricks_Fonts_REST::get_fonts(), which is a
	 * thin wrapper around this method). SLASHED never loads fonts itself —
	 * Bricks owns that pipeline — so this only enumerates names for the
	 * typography "Bricks fonts" dropdown.
	 *
	 * Bricks does not expose a PHP API for its font registry, so we probe the
	 * WP options it is known to use across versions and skip any unrecognised
	 * shapes gracefully (the SPA falls back to a manual text input):
	 *   - bricks_custom_fonts: font_family | family | title | name
	 *   - bricks_google_fonts: family | font_family | name | title
	 *   - bricks_adobe_fonts:  fonts[].font_family | family
	 *   - Font Manager CPT (slug resolved by get_bricks_fonts_post_type(), the
	 *     'bricks_fonts' post type observed in Bricks › Settings › Custom
	 *     Fonts admin URLs): the post title is the family name. Fonts created
	 *     via the builder UI may stay in 'draft' even after the files upload,
	 *     so both 'publish' and 'draft' are included. We read titles directly
	 *     rather than calling Bricks\Custom_Fonts::get_custom_fonts() (static
	 *     cache + @font-face side-effects + publish-only — all unnecessary for
	 *     a name lookup), and cache the result in a 1-hour transient busted on
	 *     CPT save.
	 *
	 * Returns an empty array when the Bricks integration is disabled.
	 *
	 * @return array<int, array{family: string, label: string, source: string}>
	 */
	public static function get_bricks_fonts() {
		if ( class_exists( 'Slashed_Settings' ) && ! Slashed_Settings::is_enabled( 'bricks' ) ) {
			return array();
		}

		$fonts = array();

		// Custom fonts from bricks_custom_fonts option.
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

		// Google Fonts added via Bricks settings.
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

		// Adobe Fonts (Typekit).
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

		// Fonts uploaded via Bricks Font Manager CPT (includes 'draft' status).
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

		// Deduplicate by family name (case-insensitive), keeping first entry.
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
		esc_html_e( 'SLASHED admin SPA bundle is missing. Run `npm install && npm run build` inside integrations/bricks/admin-app/ to generate it.', 'slashed' );
		echo '</p></div>';
	}
}
