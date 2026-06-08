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

	const PAGE_SLUG  = 'slashed';
	const NONCE_KEY  = 'slashed_settings_save';
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

		$local_version  = Slashed_Framework_Updater::get_local_version();
		$local_file_ok  = file_exists( SLASHED_PATH . 'dist/slashed.' . $css_bundle . '.css' );
		$update_nonce   = wp_create_nonce( 'slashed_framework_update' );
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'SLASHED', 'slashed' ); ?> <span style="font-weight:400;font-size:13px;color:#999;"><?php echo esc_html( SLASHED_VERSION ); ?></span></h1>

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

				<table class="form-table" role="presentation">
					<?php
					$bundles = array(
						'essential' => __( 'Essential — core layer only: tokens, reset, layout, states, motion', 'slashed' ),
						'optimal'   => __( 'Optimal — + color palette, forms, legacy support (recommended)', 'slashed' ),
						'full'      => __( 'Full — + components + utilities', 'slashed' ),
					);
					foreach ( $bundles as $value => $label ) :
						?>
						<tr>
							<th scope="row" style="padding-top:6px;padding-bottom:6px;">
								<label for="bundle-<?php echo esc_attr( $value ); ?>"><?php echo esc_html( $label ); ?></label>
							</th>
							<td style="padding-top:6px;padding-bottom:6px;">
								<input type="radio" id="bundle-<?php echo esc_attr( $value ); ?>"
									name="css_bundle" value="<?php echo esc_attr( $value ); ?>"
									<?php checked( $css_bundle, $value ); ?>>
							</td>
						</tr>
					<?php endforeach; ?>
				</table>

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

				<?php submit_button( __( 'Save settings', 'slashed' ) ); ?>
			</form>

			<hr>
			<p style="color:#999;font-size:12px;">
				<?php
				printf(
					/* translators: %s: framework version tag */
					esc_html__( 'Framework: %s', 'slashed' ),
					esc_html( SLASHED_CSS_REF )
				);
				?>
			</p>
		</div>

		<script>
		(function() {
			var nonce = <?php echo wp_json_encode( $update_nonce ); ?>;
			var ajaxUrl = <?php echo wp_json_encode( admin_url( 'admin-ajax.php' ) ); ?>;

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
		}());
		</script>
		<?php
	}
}
