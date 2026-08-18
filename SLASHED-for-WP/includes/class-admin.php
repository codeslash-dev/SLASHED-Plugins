<?php
/**
 * Unified SLASHED admin page.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Admin
 *
 * Registers the top-level "SLASHED" menu and renders the integration
 * toggle page. Builder-specific settings pages (e.g. Bricks token
 * overrides) appear as sub-pages when their integration is active.
 */
class Slashed_Admin {

	const PAGE_SLUG    = 'slashed';
	const NONCE_KEY    = 'slashed_settings_save';
	const NONCE_ACTION = 'slashed_save_settings';

	/**
	 * Admin menu hook suffix for the settings page, captured at registration so
	 * the stylesheet is only enqueued on this screen.
	 *
	 * @var string
	 */
	private $hook_suffix = '';

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_post_slashed_save_settings', array( $this, 'handle_save' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	public function register_menu() {
		$this->hook_suffix = add_menu_page(
			__( 'SLASHED', 'slashed' ),
			__( 'SLASHED', 'slashed' ),
			'manage_options',
			self::PAGE_SLUG,
			array( $this, 'render_page' ),
			'dashicons-art',
			59
		);

		// Override the auto-generated first submenu entry label.
		add_submenu_page(
			self::PAGE_SLUG,
			__( 'Plugin Settings', 'slashed' ),
			__( 'Plugin Settings', 'slashed' ),
			'manage_options',
			self::PAGE_SLUG,
			array( $this, 'render_page' )
		);
	}

	/**
	 * Enqueue the settings-page stylesheet, scoped to the SLASHED settings screen.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 */
	public function enqueue_assets( $hook_suffix ) {
		if ( '' === $this->hook_suffix || $hook_suffix !== $this->hook_suffix ) {
			return;
		}

		$css_path = SLASHED_PATH . 'assets/admin/settings.css';
		wp_enqueue_style(
			'slashed-settings',
			SLASHED_URL . 'assets/admin/settings.css',
			array(),
			file_exists( $css_path ) ? (string) filemtime( $css_path ) : SLASHED_VERSION
		);
	}

	/**
	 * Handle the settings form POST.
	 * Redirects back to the settings page with a status flag.
	 */
	public function handle_save() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Insufficient permissions.', 'slashed' ) );
		}

		check_admin_referer( self::NONCE_ACTION, self::NONCE_KEY );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- nonce verified above via check_admin_referer.
		$raw_integrations = isset( $_POST['integrations'] ) && is_array( $_POST['integrations'] )
			? array_map( 'sanitize_key', $_POST['integrations'] )
			: array();

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$raw_bundle = isset( $_POST['css_bundle'] ) ? sanitize_key( $_POST['css_bundle'] ) : 'optimal';

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$raw_flat = ! empty( $_POST['css_flat'] );

		$data = array(
			'css_bundle'   => Slashed_Settings::normalize_bundle( $raw_bundle ),
			'css_flat'     => $raw_flat,
			'integrations' => array(),
		);
		foreach ( Slashed_Settings::KNOWN_INTEGRATIONS as $slug ) {
			$data['integrations'][ $slug ] = array_key_exists( $slug, $raw_integrations );
		}

		Slashed_Settings::save( $data );

		// Save general plugin behaviour (html_font_size). Read-merge-write so
		// Bricks-owned settings (class hints, reBEMer names) and the Manual CSS
		// mode set on their own pages are never clobbered.
		$allowed_font_sizes = array( '', '100', '62.5' );
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$raw_font_size = isset( $_POST['html_font_size'] ) ? sanitize_text_field( wp_unslash( $_POST['html_font_size'] ) ) : '';

		$plugin_settings                   = Slashed_Token_Store::get_plugin_settings();
		$plugin_settings['html_font_size'] = in_array( $raw_font_size, $allowed_font_sizes, true ) ? $raw_font_size : '';
		Slashed_Token_Store::update_plugin_settings( $plugin_settings );

		wp_safe_redirect(
			add_query_arg( 'slashed_saved', '1', admin_url( 'admin.php?page=' . self::PAGE_SLUG ) )
		);
		exit;
	}

	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$settings     = Slashed_Settings::get();
		$integrations = $settings['integrations'];
		$css_bundle   = $settings['css_bundle'];
		$css_flat     = $settings['css_flat'];
		$saved        = ! empty( $_GET['slashed_saved'] ); // phpcs:ignore WordPress.Security.NonceVerification

		$plugin_settings = Slashed_Token_Store::get_plugin_settings();
		$html_font_size  = $plugin_settings['html_font_size'] ?? '';
		?>

		<div class="wrap">
			<?php $active_fw_version = SLASHED_CSS_REF; ?>
			<h1><?php esc_html_e( 'SLASHED', 'slashed' ); ?> <span style="font-weight:400;font-size:13px;color:#999;"><?php echo esc_html( SLASHED_VERSION ); ?></span>
				<span style="font-weight:400;font-size:13px;color:#bbb;margin-left:6px;">· <?php esc_html_e( 'Framework:', 'slashed' ); ?> <?php echo esc_html( $active_fw_version ); ?></span>
			</h1>

			<?php if ( $saved ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Settings saved.', 'slashed' ); ?></p></div>
			<?php endif; ?>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="slashed_save_settings">
				<?php wp_nonce_field( self::NONCE_ACTION, self::NONCE_KEY ); ?>

				<h2 style="margin-top:1.5em;"><?php esc_html_e( 'CSS framework', 'slashed' ); ?></h2>
				<p class="description">
					<?php esc_html_e( 'The SLASHED framework CSS loads automatically on your site — no page builder required. Choose the smallest bundle that covers your needs.', 'slashed' ); ?>
					&nbsp;<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . \Slashed_Token_Page::PAGE_SLUG ) ); ?>"><?php esc_html_e( 'Customize design tokens →', 'slashed' ); ?></a>
				</p>

				<?php
				$bundles = array(
					'optimal' => array(
						'label'   => __( 'Optimal', 'slashed' ),
						'tagline' => __( 'The whole framework, lean — recommended for most sites.', 'slashed' ),
						'badge'   => __( 'Recommended', 'slashed' ),
						'items'   => array(
							__( 'Design tokens — color, type, spacing, layout, motion, macros, shadows, radius, z-index', 'slashed' ),
							__( 'CSS reset &amp; base element styles', 'slashed' ),
							__( 'Layout primitives — .sf-container, .sf-stack, .sf-grid, .sf-cluster, .sf-sidebar…', 'slashed' ),
							__( 'Macro-classes — .sf-prose, .sf-flow, .sf-truncate, .sf-scroll-snap, .sf-scroll-shadow…', 'slashed' ),
							__( 'Interaction states (.is-* and .has-* classes)', 'slashed' ),
							__( 'Themes — light &amp; dark mode via light-dark(); [data-theme] scoping', 'slashed' ),
							__( 'Motion, accessibility &amp; print layers', 'slashed' ),
							__( 'Classless form styling — inputs, selects, checkboxes, buttons', 'slashed' ),
						),
					),
					'full'    => array(
						'label'   => __( 'Full', 'slashed' ),
						'tagline' => __( 'Everything in Optimal, plus the component and utility layers.', 'slashed' ),
						'base'    => __( 'Everything in Optimal, plus:', 'slashed' ),
						'items'   => array(
							__( 'Component classes — .sf-btn, .sf-card, and their component token layer', 'slashed' ),
							__( 'Utility helpers — heading, text-size, hover, list-reset, marker, selection, sticky', 'slashed' ),
						),
					),
				);
				?>
				<div class="slashed-bundle-grid">
					<?php foreach ( $bundles as $value => $bundle ) : ?>
					<label class="slashed-bundle-card" for="bundle-<?php echo esc_attr( $value ); ?>">
						<input type="radio"
							id="bundle-<?php echo esc_attr( $value ); ?>"
							name="css_bundle"
							value="<?php echo esc_attr( $value ); ?>"
							<?php checked( $css_bundle, $value ); ?>>
						<span class="slashed-bundle-card__radio" aria-hidden="true"></span>
						<span class="slashed-bundle-card__head">
							<span class="slashed-bundle-card__name"><?php echo esc_html( $bundle['label'] ); ?></span>
							<?php if ( ! empty( $bundle['badge'] ) ) : ?>
								<span class="slashed-bundle-card__badge"><?php echo esc_html( $bundle['badge'] ); ?></span>
							<?php endif; ?>
						</span>
						<span class="slashed-bundle-card__tagline"><?php echo esc_html( $bundle['tagline'] ); ?></span>
						<ul class="slashed-bundle-card__list">
							<?php foreach ( $bundle['items'] as $item ) : ?>
								<li<?php echo ! empty( $bundle['base'] ) ? ' class="added"' : ''; ?>>
									<?php
									// Items may contain safe HTML like &amp; — output through wp_kses.
									echo wp_kses( $item, array( 'code' => array() ) );
									?>
								</li>
							<?php endforeach; ?>
						</ul>
					</label>
					<?php endforeach; ?>
				</div>

				<label class="slashed-flat-row">
					<input type="checkbox" name="css_flat" value="1" <?php checked( $css_flat ); ?>>
					<span class="slashed-flat-row__switch" aria-hidden="true"></span>
					<span class="slashed-flat-row__text">
						<strong><?php esc_html_e( 'Flat CSS — no cascade layers', 'slashed' ); ?></strong>
						<span class="slashed-flat-row__desc">
							<?php esc_html_e( 'Loads the flat variant of the selected bundle (e.g. slashed.optimal.flat.css) — identical rules, but without @layer declarations. Turn this on only if a theme or plugin that doesn\'t support CSS cascade layers is conflicting with SLASHED.', 'slashed' ); ?>
						</span>
					</span>
				</label>

				<h2><?php esc_html_e( 'Builder integrations', 'slashed' ); ?></h2>
				<p class="description"><?php esc_html_e( 'Optional deeper integration with your page builder. Adds builder-specific features on top of the core CSS delivery.', 'slashed' ); ?></p>

				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Bricks Builder', 'slashed' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="integrations[bricks]"
									<?php checked( $integrations['bricks'] ); ?>>
								<?php esc_html_e( 'Enable', 'slashed' ); ?>
							</label>
							<p class="description">
							<?php
							if ( defined( 'BRICKS_VERSION' ) ) {
								printf(
									/* translators: %s: Bricks version */
									esc_html__( 'Bricks %s detected.', 'slashed' ),
									esc_html( BRICKS_VERSION )
								);
							} else {
								esc_html_e( 'Bricks Builder not detected.', 'slashed' );
							}
							?>
							<?php esc_html_e( 'Injects CSS variables into Global Variables, syncs the color palette, and enables the reBEMer class manager.', 'slashed' ); ?>
							</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Gutenberg / Block Editor', 'slashed' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="integrations[gutenberg]"
									<?php checked( $integrations['gutenberg'] ); ?>>
								<?php esc_html_e( 'Enable', 'slashed' ); ?>
							</label>
							<p class="description"><?php esc_html_e( 'Syncs SLASHED colors with the block editor palette and bridges the editor dark-mode toggle.', 'slashed' ); ?></p>
						</td>
					</tr>
				</table>

				<h2><?php esc_html_e( 'Site behaviour', 'slashed' ); ?></h2>
				<p class="description"><?php esc_html_e( 'Fine-tune how SLASHED integrates with your site.', 'slashed' ); ?></p>

				<table class="form-table" role="presentation">
					<tr>
						<th scope="row">
							<label for="slashed-html-font-size"><?php esc_html_e( 'HTML font size', 'slashed' ); ?></label>
						</th>
						<td>
							<select id="slashed-html-font-size" name="html_font_size">
								<option value="" <?php selected( $html_font_size, '' ); ?>><?php esc_html_e( 'Default (don\'t override)', 'slashed' ); ?></option>
								<option value="100" <?php selected( $html_font_size, '100' ); ?>><?php esc_html_e( 'Force 100%', 'slashed' ); ?></option>
								<option value="62.5" <?php selected( $html_font_size, '62.5' ); ?>><?php esc_html_e( 'Force 62.5%', 'slashed' ); ?></option>
							</select>
							<p class="description"><?php esc_html_e( 'Override the HTML root font-size when your theme or builder conflicts with rem-based framework values.', 'slashed' ); ?></p>
						</td>
					</tr>
				</table>

				<?php submit_button( __( 'Save settings', 'slashed' ) ); ?>
			</form>

		</div>

		<?php
	}
}
