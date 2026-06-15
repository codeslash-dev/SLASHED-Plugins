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

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_post_slashed_save_settings', array( $this, 'handle_save' ) );
	}

	public function register_menu() {
		add_menu_page(
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
		$raw_source = isset( $_POST['css_source'] ) ? sanitize_key( $_POST['css_source'] ) : 'local';

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$raw_cdn_version = isset( $_POST['cdn_version'] ) ? sanitize_text_field( wp_unslash( $_POST['cdn_version'] ) ) : '';

		$data = array(
			'css_bundle'   => in_array( $raw_bundle, Slashed_Settings::ALLOWED_BUNDLES, true ) ? $raw_bundle : 'optimal',
			'css_source'   => in_array( $raw_source, Slashed_Settings::ALLOWED_SOURCES, true ) ? $raw_source : 'local',
			'cdn_version'  => $raw_cdn_version,
			'integrations' => array(),
		);
		foreach ( Slashed_Settings::KNOWN_INTEGRATIONS as $slug ) {
			$data['integrations'][ $slug ] = array_key_exists( $slug, $raw_integrations );
		}

		Slashed_Settings::save( $data );

		// Save plugin behavioural settings (html_font_size, show_class_hints).
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$allowed_font_sizes = array( '', '100', '62.5' );
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$raw_font_size = isset( $_POST['html_font_size'] ) ? sanitize_text_field( wp_unslash( $_POST['html_font_size'] ) ) : '';
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$raw_class_hints = isset( $_POST['show_class_hints'] );

		Slashed_Token_Store::update_plugin_settings(
			array(
				'html_font_size'   => in_array( $raw_font_size, $allowed_font_sizes, true ) ? $raw_font_size : '',
				'show_class_hints' => $raw_class_hints,
			)
		);

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
		$css_source   = $settings['css_source'];
		$cdn_version  = $settings['cdn_version'];
		$saved        = ! empty( $_GET['slashed_saved'] ); // phpcs:ignore WordPress.Security.NonceVerification

		$local_version    = Slashed_Framework_Updater::get_local_version();
		$local_file_ok    = file_exists( SLASHED_PATH . 'dist/slashed.' . $css_bundle . '.css' );
		$update_nonce     = wp_create_nonce( 'slashed_framework_update' );
		$plugin_settings  = Slashed_Token_Store::get_plugin_settings();
		$html_font_size   = $plugin_settings['html_font_size'] ?? '';
		$show_class_hints = ! empty( $plugin_settings['show_class_hints'] );
		?>
		<style>
		.slashed-bundle-grid {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 12px;
			max-width: 920px;
			margin: 12px 0 24px;
		}
		.slashed-bundle-card {
			display: block;
			border: 2px solid #c3c4c7;
			border-radius: 6px;
			padding: 16px;
			cursor: pointer;
			position: relative;
			background: #fff;
		}
		.slashed-bundle-card:hover { border-color: #2271b1; }
		.slashed-bundle-card.is-selected { border-color: #2271b1; background: #f0f6fc; }
		.slashed-bundle-card input[type=radio] {
			position: absolute;
			top: 16px;
			right: 14px;
			margin: 0;
		}
		.slashed-bundle-card__name {
			font-size: 14px;
			font-weight: 600;
			display: block;
			margin-bottom: 3px;
			padding-right: 22px;
			color: #1e1e1e;
		}
		.slashed-bundle-card__tagline {
			font-size: 12px;
			color: #50575e;
			display: block;
			margin-bottom: 10px;
		}
		.slashed-bundle-card__badge {
			display: inline-block;
			background: #00a32a;
			color: #fff;
			font-size: 10px;
			font-weight: 600;
			padding: 1px 7px;
			border-radius: 10px;
			text-transform: uppercase;
			letter-spacing: .04em;
			margin-left: 5px;
			vertical-align: middle;
		}
		.slashed-bundle-card hr {
			border: none;
			border-top: 1px solid #e2e4e7;
			margin: 10px 0 8px;
		}
		.slashed-bundle-card__list {
			list-style: none;
			padding: 0;
			margin: 0;
			font-size: 12px;
			color: #3c434a;
			line-height: 1.6;
		}
		.slashed-bundle-card__list li {
			padding-left: 16px;
			position: relative;
		}
		.slashed-bundle-card__list li::before {
			content: '✓';
			position: absolute;
			left: 0;
			color: #00a32a;
			font-size: 11px;
			line-height: 1.6;
		}
		.slashed-bundle-card__list li.added::before {
			content: '+';
			color: #2271b1;
			font-weight: 700;
		}
		@media (max-width: 900px) {
			.slashed-bundle-grid { grid-template-columns: 1fr; }
		}
		</style>

		<div class="wrap">
			<?php
			$active_fw_version = ( 'cdn' === $css_source )
				? ( $cdn_version ? $cdn_version : SLASHED_CSS_REF )
				: ( $local_version ? $local_version : SLASHED_CSS_REF );
			?>
			<h1><?php esc_html_e( 'SLASHED', 'slashed' ); ?> <span style="font-weight:400;font-size:13px;color:#999;"><?php echo esc_html( SLASHED_VERSION ); ?></span>
				<?php if ( $active_fw_version ) : ?>
				<span style="font-weight:400;font-size:13px;color:#bbb;margin-left:6px;">· <?php esc_html_e( 'Framework:', 'slashed' ); ?> <?php echo esc_html( $active_fw_version ); ?></span>
				<?php endif; ?>
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
					'essential' => array(
						'label'   => __( 'Essential', 'slashed' ),
						'tagline' => __( 'Core layer only', 'slashed' ),
						'items'   => array(
							__( 'Design tokens — color, type, spacing, layout, motion, shadows, radius, z-index', 'slashed' ),
							__( 'HSL fallbacks for oklch/light-dark() (broad browser support)', 'slashed' ),
							__( 'CSS reset &amp; base element styles', 'slashed' ),
							__( 'Layout primitives — container, grid, stack, cluster', 'slashed' ),
							__( 'Interaction states (.is-* classes)', 'slashed' ),
							__( 'Themes — light &amp; dark mode', 'slashed' ),
							__( 'Motion &amp; animation scale', 'slashed' ),
							__( 'Accessibility &amp; print layers', 'slashed' ),
						),
					),
					'optimal'   => array(
						'label'   => __( 'Optimal', 'slashed' ),
						'tagline' => __( 'Recommended for most sites', 'slashed' ),
						'badge'   => __( 'Recommended', 'slashed' ),
						'base'    => __( 'Everything in Essential, plus:', 'slashed' ),
						'items'   => array(
							__( 'Extended color palette — surface tints, tonal steps', 'slashed' ),
							__( 'Extended size tokens — fluid type scale, fractional spacing', 'slashed' ),
							__( 'Form element styles — inputs, selects, checkboxes, buttons', 'slashed' ),
							__( 'Legacy browser support — CSS grid fallbacks, older resets', 'slashed' ),
						),
					),
					'full'      => array(
						'label'   => __( 'Full', 'slashed' ),
						'tagline' => __( 'All layers', 'slashed' ),
						'base'    => __( 'Everything in Optimal, plus:', 'slashed' ),
						'items'   => array(
							__( 'Component tokens — card, button, badge, dialog, table, nav…', 'slashed' ),
							__( 'UI component styles — .sf-card, .sf-btn, .sf-badge, .sf-dialog…', 'slashed' ),
							__( 'Utility classes — .sf-flex, .sf-grid, .sf-text-*, .sf-bg-*…', 'slashed' ),
						),
					),
				);
				?>
				<div class="slashed-bundle-grid">
					<?php foreach ( $bundles as $value => $bundle ) : ?>
					<label class="slashed-bundle-card<?php echo $css_bundle === $value ? ' is-selected' : ''; ?>" for="bundle-<?php echo esc_attr( $value ); ?>">
						<input type="radio"
							id="bundle-<?php echo esc_attr( $value ); ?>"
							name="css_bundle"
							value="<?php echo esc_attr( $value ); ?>"
							<?php checked( $css_bundle, $value ); ?>>
						<span class="slashed-bundle-card__name">
							<?php echo esc_html( $bundle['label'] ); ?>
							<?php if ( ! empty( $bundle['badge'] ) ) : ?>
								<span class="slashed-bundle-card__badge"><?php echo esc_html( $bundle['badge'] ); ?></span>
							<?php endif; ?>
						</span>
						<span class="slashed-bundle-card__tagline"><?php echo esc_html( $bundle['tagline'] ); ?></span>
						<hr>
						<?php if ( ! empty( $bundle['base'] ) ) : ?>
							<p style="margin:0 0 4px;font-size:12px;color:#50575e;"><?php echo esc_html( $bundle['base'] ); ?></p>
						<?php endif; ?>
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

				<h2 style="margin-top:1.5em;"><?php esc_html_e( 'CSS delivery', 'slashed' ); ?></h2>
				<p class="description"><?php esc_html_e( 'Choose how the framework CSS is loaded. Local files ship with the plugin; CDN lets you pin any release tag.', 'slashed' ); ?></p>

				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Source', 'slashed' ); ?></th>
						<td>
							<label style="display:block;margin-bottom:6px;">
								<input type="radio" name="css_source" value="local" <?php checked( $css_source, 'local' ); ?>>
								<?php esc_html_e( 'Local files (recommended)', 'slashed' ); ?>
							</label>
							<div id="slashed-local-controls" style="margin-left:22px;margin-bottom:10px;<?php echo 'cdn' === $css_source ? 'display:none;' : ''; ?>">
								<?php if ( $local_file_ok ) : ?>
									<span id="slashed-local-version" style="color:#3c3;">&#10003; <?php echo esc_html( $local_version ); ?></span>
								<?php else : ?>
									<span style="color:#c33;"><?php esc_html_e( 'Local CSS file not found. Click Update to download it.', 'slashed' ); ?></span>
								<?php endif; ?>
								&nbsp;
								<button type="button" id="slashed-check-btn" class="button button-small"><?php esc_html_e( 'Check for updates', 'slashed' ); ?></button>
								<button type="button" id="slashed-update-btn" class="button button-small button-primary" style="margin-left:4px;"><?php esc_html_e( 'Update framework', 'slashed' ); ?></button>
								<span id="slashed-update-msg" style="margin-left:8px;font-style:italic;"></span>

								<div style="margin-top:10px;">
									<button type="button" id="slashed-rollback-toggle" class="button button-small" style="color:#646970;">
										<?php esc_html_e( 'Install a previous version ▾', 'slashed' ); ?>
									</button>
									<div id="slashed-rollback-controls" style="display:none;margin-top:8px;align-items:center;gap:8px;flex-wrap:wrap;">
										<select id="slashed-version-select" style="min-width:160px;" disabled>
											<option value=""><?php esc_html_e( 'Loading versions…', 'slashed' ); ?></option>
										</select>
										<button type="button" id="slashed-install-ver-btn" class="button button-small" disabled>
											<?php esc_html_e( 'Install selected', 'slashed' ); ?>
										</button>
										<span id="slashed-rollback-msg" style="font-style:italic;font-size:12px;"></span>
									</div>
								</div>
							</div>

							<label style="display:block;">
								<input type="radio" name="css_source" value="cdn" <?php checked( $css_source, 'cdn' ); ?>>
								<?php esc_html_e( 'CDN (jsDelivr)', 'slashed' ); ?>
							</label>
							<div id="slashed-cdn-controls" style="margin-left:22px;margin-top:6px;<?php echo 'cdn' !== $css_source ? 'display:none;' : ''; ?>">
								<?php if ( 'cdn' === $css_source ) : ?>
									<p style="margin:0 0 8px;">
										<span style="color:#3c3;">&#10003; <?php esc_html_e( 'Currently serving:', 'slashed' ); ?> <strong><?php echo esc_html( $cdn_version ); ?></strong></span>
									</p>
								<?php endif; ?>
								<label for="slashed-cdn-version"><?php esc_html_e( 'Version tag:', 'slashed' ); ?></label>
								<input type="text" id="slashed-cdn-version" name="cdn_version"
									value="<?php echo esc_attr( $cdn_version ); ?>"
									placeholder="<?php echo esc_attr( SLASHED_CSS_REF ); ?>"
									style="width:160px;margin-left:6px;">
								<p class="description" style="margin-top:4px;">
									<?php esc_html_e( 'Enter a release tag, e.g.', 'slashed' ); ?>
									<code><?php echo esc_html( SLASHED_CSS_REF ); ?></code><?php esc_html_e( ', or', 'slashed' ); ?> <code>latest</code><?php esc_html_e( ' to always track the newest release. Leave blank to track the version this plugin ships with.', 'slashed' ); ?>
								</p>
								<p class="description" style="margin-top:4px;">
									<?php esc_html_e( 'To roll back, enter any older release tag (e.g.', 'slashed' ); ?>
									<code>v0.4.0</code><?php esc_html_e( ') and save.', 'slashed' ); ?>
								</p>
							</div>
						</td>
					</tr>
				</table>

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
					<tr>
						<th scope="row"><?php esc_html_e( 'Class hints', 'slashed' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="show_class_hints" <?php checked( $show_class_hints ); ?>>
								<?php esc_html_e( 'Show class hints in Bricks editor', 'slashed' ); ?>
								<span style="display:inline-block;font-size:10px;font-weight:600;padding:1px 7px;border-radius:10px;text-transform:uppercase;letter-spacing:.04em;background:#f0f4ff;color:#2563eb;border:1px solid #bfdbfe;margin-left:4px;">Bricks</span>
							</label>
							<p class="description"><?php esc_html_e( 'When enabled, hovering a SLASHED class in the Bricks class manager shows a short description of what it does.', 'slashed' ); ?></p>
						</td>
					</tr>
				</table>

				<?php submit_button( __( 'Save settings', 'slashed' ) ); ?>
			</form>

		</div>

		<script>
		(function() {
			var nonce   = <?php echo wp_json_encode( $update_nonce ); ?>;
			var ajaxUrl = <?php echo wp_json_encode( admin_url( 'admin-ajax.php' ) ); ?>;

			// Highlight selected bundle card on change.
			document.querySelectorAll('.slashed-bundle-card input[type=radio]').forEach(function(radio) {
				radio.addEventListener('change', function() {
					document.querySelectorAll('.slashed-bundle-card').forEach(function(card) {
						card.classList.toggle('is-selected', card.querySelector('input[type=radio]').checked);
					});
				});
			});

			// Toggle local / CDN control sections.
			document.querySelectorAll('input[name="css_source"]').forEach(function(radio) {
				radio.addEventListener('change', function() {
					document.getElementById('slashed-local-controls').style.display = this.value === 'local' ? '' : 'none';
					document.getElementById('slashed-cdn-controls').style.display   = this.value === 'cdn'   ? '' : 'none';
				});
			});

			function setMsg(msg, color) {
				var el = document.getElementById('slashed-update-msg');
				el.textContent = msg;
				el.style.color = color || '';
			}

			function setRollbackMsg(msg, color) {
				var el = document.getElementById('slashed-rollback-msg');
				el.textContent = msg;
				el.style.color = color || '';
			}

			document.getElementById('slashed-check-btn').addEventListener('click', function() {
				setMsg(<?php echo wp_json_encode( __( 'Checking…', 'slashed' ) ); ?>);
				fetch(ajaxUrl, {
					method: 'POST',
					headers: {'Content-Type': 'application/x-www-form-urlencoded'},
					body: new URLSearchParams({action: 'slashed_check_framework_update', nonce: nonce})
				})
				.then(function(r){ return r.json(); })
				.then(function(data) {
					if (data.success) {
						setMsg(<?php echo wp_json_encode( __( 'Latest:', 'slashed' ) ); ?> + ' ' + data.data.latest);
					} else {
						setMsg(data.data.message, '#c33');
					}
				})
				.catch(function(){ setMsg(<?php echo wp_json_encode( __( 'Request failed.', 'slashed' ) ); ?>, '#c33'); });
			});

			document.getElementById('slashed-update-btn').addEventListener('click', function() {
				if (!confirm(<?php echo wp_json_encode( __( 'Download and install the latest framework CSS?', 'slashed' ) ); ?>)) return;
				setMsg(<?php echo wp_json_encode( __( 'Downloading…', 'slashed' ) ); ?>);
				fetch(ajaxUrl, {
					method: 'POST',
					headers: {'Content-Type': 'application/x-www-form-urlencoded'},
					body: new URLSearchParams({action: 'slashed_do_framework_update', nonce: nonce})
				})
				.then(function(r){ return r.json(); })
				.then(function(data) {
					if (data.success) {
						setMsg(data.data.message, '#3c3');
						var ver = document.getElementById('slashed-local-version');
						if (ver) ver.textContent = '✓ ' + data.data.version;
					} else {
						setMsg(data.data.message, '#c33');
					}
				})
				.catch(function(){ setMsg(<?php echo wp_json_encode( __( 'Request failed.', 'slashed' ) ); ?>, '#c33'); });
			});

			// Version rollback: fetch list on toggle, then install on confirm.
			var rollbackLoaded = false;
			document.getElementById('slashed-rollback-toggle').addEventListener('click', function() {
				var controls = document.getElementById('slashed-rollback-controls');
				var open = controls.style.display !== 'none';
				controls.style.display = open ? 'none' : 'flex';

				if (!open && !rollbackLoaded) {
					rollbackLoaded = true;
					setRollbackMsg(<?php echo wp_json_encode( __( 'Loading versions…', 'slashed' ) ); ?>);
					fetch(ajaxUrl, {
						method: 'POST',
						headers: {'Content-Type': 'application/x-www-form-urlencoded'},
						body: new URLSearchParams({action: 'slashed_list_framework_versions', nonce: nonce})
					})
					.then(function(r){ return r.json(); })
					.then(function(data) {
						var sel = document.getElementById('slashed-version-select');
						var btn = document.getElementById('slashed-install-ver-btn');
						if (data.success && data.data.versions && data.data.versions.length) {
							sel.innerHTML = '';
							data.data.versions.forEach(function(ver) {
								var opt = document.createElement('option');
								opt.value = ver;
								opt.textContent = ver;
								sel.appendChild(opt);
							});
							sel.disabled = false;
							btn.disabled = false;
							setRollbackMsg('');
						} else {
							setRollbackMsg((data.data && data.data.message) || <?php echo wp_json_encode( __( 'Could not load versions.', 'slashed' ) ); ?>, '#c33');
						}
					})
					.catch(function(){ setRollbackMsg(<?php echo wp_json_encode( __( 'Request failed.', 'slashed' ) ); ?>, '#c33'); });
				}
			});

			document.getElementById('slashed-install-ver-btn').addEventListener('click', function() {
				var sel = document.getElementById('slashed-version-select');
				var ver = sel.value;
				if (!ver) return;
				if (!confirm(<?php echo wp_json_encode( __( 'Install version', 'slashed' ) ); ?> + ' ' + ver + '?')) return;
				setRollbackMsg(<?php echo wp_json_encode( __( 'Downloading…', 'slashed' ) ); ?>);
				fetch(ajaxUrl, {
					method: 'POST',
					headers: {'Content-Type': 'application/x-www-form-urlencoded'},
					body: new URLSearchParams({action: 'slashed_do_framework_update', nonce: nonce, version: ver})
				})
				.then(function(r){ return r.json(); })
				.then(function(data) {
					if (data.success) {
						setRollbackMsg(data.data.message, '#3c3');
						var localVer = document.getElementById('slashed-local-version');
						if (localVer) localVer.textContent = '✓ ' + data.data.version;
					} else {
						setRollbackMsg(data.data.message, '#c33');
					}
				})
				.catch(function(){ setRollbackMsg(<?php echo wp_json_encode( __( 'Request failed.', 'slashed' ) ); ?>, '#c33'); });
			});
		}());
		</script>
		<?php
	}
}
