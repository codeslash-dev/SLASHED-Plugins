<?php
/**
 * reBEMer defaults admin page.
 *
 * A standalone WP admin subpage (sibling of Manual CSS) for editing the
 * default BEM names reBEMer pre-fills in the Bricks builder — kept out of
 * the Design Settings SPA on purpose. Lets the user:
 *   - choose how layout containers are named (container mode), and
 *   - set a default BEM name for any registered Bricks element (core,
 *     plugin, or custom), enumerated via Slashed_Bricks_Elements.
 *
 * Bricks-only: the menu registers only when the Bricks integration (and
 * thus the element registry) is loaded. Saved values live in the shared
 * `rebemer_element_map` / `rebemer_container_mode` plugin settings the
 * Bricks editor already reads back via window.slashedBricksEditor.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Slashed_ReBEMer_Page {

	const PAGE_SLUG    = 'slashed-rebemer';
	const NONCE_KEY    = 'slashed_rebemer_nonce';
	const NONCE_ACTION = 'slashed_save_rebemer';

	/** Valid container-naming modes (mirror of element-types.js CONTAINER_MODES). */
	const CONTAINER_MODES = array( 'type', 'role', 'generic' );

	/** Bricks layout containers — named via container mode, not the type map. */
	const LAYOUT_CONTAINERS = array( 'section', 'container', 'block', 'div' );

	/**
	 * Built-in element-type → BEM default.
	 *
	 * Mirror of ELEMENT_TYPE_LABEL_MAP in
	 * integrations/bricks/editor-app/src/lib/element-types.js — KEEP IN SYNC.
	 * Only used to show the correct placeholder/default; the editor remains
	 * the source of truth at pre-fill time.
	 *
	 * @var array<string,string>
	 */
	const BUILTIN_DEFAULTS = array(
		'heading'           => 'heading',
		'text-basic'        => 'text',
		'text'              => 'text',
		'text-link'         => 'link',
		'code'              => 'code',
		'post-title'        => 'title',
		'post-content'      => 'content',
		'post-excerpt'      => 'excerpt',
		'post-meta'         => 'meta',
		'image'             => 'image',
		'icon'              => 'icon',
		'icon-box'          => 'icon',
		'video'             => 'video',
		'audio'             => 'audio',
		'svg'               => 'svg',
		'logo'              => 'logo',
		'shape'             => 'shape',
		'divider'           => 'divider',
		'separator'         => 'separator',
		'button'            => 'button',
		'button-group'      => 'buttons',
		'nav-nested'        => 'nav',
		'nav-menu'          => 'nav',
		'list'              => 'list',
		'search'            => 'search',
		'social-icons'      => 'social',
		'accordion'         => 'accordion',
		'accordion-nested'  => 'accordion',
		'tabs'              => 'tabs',
		'tabs-nested'       => 'tabs',
		'slider'            => 'slider',
		'slider-nested'     => 'slider',
		'carousel'          => 'carousel',
		'countdown'         => 'countdown',
		'counter'           => 'counter',
		'progress-bar'      => 'progress',
		'alert'             => 'alert',
		'testimonials'      => 'testimonials',
		'pricing'           => 'pricing',
		'team'              => 'team',
		'map'               => 'map',
		'google-maps'       => 'map',
		'breadcrumbs'       => 'breadcrumbs',
		'pagination'        => 'pagination',
		'form'              => 'form',
		'posts'             => 'posts',
		'related-posts'     => 'posts',
		'template'          => 'item',
	);

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_post_slashed_save_rebemer', array( $this, 'handle_save' ) );
	}

	public function register_menu() {
		// reBEMer is a Bricks-only feature; only show it when the Bricks
		// element registry is available.
		if ( ! class_exists( 'Slashed_Bricks_Elements' ) || ! class_exists( 'Slashed_Admin' ) ) {
			return;
		}

		add_submenu_page(
			\Slashed_Admin::PAGE_SLUG,
			__( 'reBEMer', 'slashed' ),
			__( 'reBEMer', 'slashed' ),
			'manage_options',
			self::PAGE_SLUG,
			array( $this, 'render_page' )
		);
	}

	/**
	 * All editable elements as name => human label, excluding layout
	 * containers, unioned with the built-in map so nothing the editor knows
	 * about disappears when Bricks data is momentarily unavailable.
	 *
	 * @return array<string,string>
	 */
	private static function elements() {
		$registry = class_exists( 'Slashed_Bricks_Elements' ) ? Slashed_Bricks_Elements::get_all() : array();
		$names    = array_unique( array_merge( array_keys( $registry ), array_keys( self::BUILTIN_DEFAULTS ) ) );

		$out = array();
		foreach ( $names as $name ) {
			if ( in_array( $name, self::LAYOUT_CONTAINERS, true ) ) {
				continue;
			}
			$out[ $name ] = isset( $registry[ $name ] ) ? $registry[ $name ] : '';
		}
		ksort( $out );
		return $out;
	}

	/**
	 * Built-in default BEM name for an element: the curated map value, else
	 * the slugified Bricks label, else 'item' — matching the editor's
	 * fallback chain.
	 *
	 * @param string $type  Element name.
	 * @param string $label Human label (may be empty).
	 * @return string
	 */
	private static function default_for( $type, $label ) {
		if ( isset( self::BUILTIN_DEFAULTS[ $type ] ) ) {
			return self::BUILTIN_DEFAULTS[ $type ];
		}
		$slug = sanitize_title( $label );
		return '' !== $slug ? $slug : 'item';
	}

	/**
	 * Handle the settings form submission.
	 */
	public function handle_save() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Insufficient permissions.', 'slashed' ) );
		}

		check_admin_referer( self::NONCE_ACTION, self::NONCE_KEY );

		$settings = Slashed_Token_Store::get_plugin_settings();

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- covered by check_admin_referer above.
		$mode = isset( $_POST['rebemer_container_mode'] )
			? sanitize_key( wp_unslash( $_POST['rebemer_container_mode'] ) )
			: 'type';
		$settings['rebemer_container_mode'] = in_array( $mode, self::CONTAINER_MODES, true ) ? $mode : 'type';

		$raw_map = isset( $_POST['rebemer_map'] ) && is_array( $_POST['rebemer_map'] )
			? wp_unslash( $_POST['rebemer_map'] )
			: array();
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		$elements  = self::elements();
		$overrides = array();
		foreach ( $raw_map as $type => $name ) {
			if ( ! is_string( $type ) || ! is_string( $name ) ) {
				continue;
			}
			$name = strtolower( trim( $name ) );
			if ( '' === $name ) {
				continue;
			}
			// Store sparse overrides only: a value equal to the built-in
			// default is the same as leaving it blank.
			$label = isset( $elements[ $type ] ) ? $elements[ $type ] : '';
			if ( $name === self::default_for( $type, $label ) ) {
				continue;
			}
			$overrides[ $type ] = $name;
		}

		// Reuse the REST controller's grammar + cap sanitizer so the page and
		// the API can never diverge.
		$settings['rebemer_element_map'] = class_exists( 'Slashed_REST_Controller' )
			? Slashed_REST_Controller::sanitize_rebemer_element_map( $overrides )
			: array();

		Slashed_Token_Store::update_plugin_settings( $settings );

		wp_safe_redirect(
			add_query_arg(
				array(
					'page'  => self::PAGE_SLUG,
					'saved' => '1',
				),
				admin_url( 'admin.php' )
			)
		);
		exit;
	}

	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$settings   = Slashed_Token_Store::get_plugin_settings();
		$mode       = isset( $settings['rebemer_container_mode'] ) ? (string) $settings['rebemer_container_mode'] : 'type';
		$mode       = in_array( $mode, self::CONTAINER_MODES, true ) ? $mode : 'type';
		$overrides  = isset( $settings['rebemer_element_map'] ) && is_array( $settings['rebemer_element_map'] )
			? $settings['rebemer_element_map']
			: array();
		$elements   = self::elements();
		$just_saved = isset( $_GET['saved'] ) && '1' === $_GET['saved']; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		$mode_labels = array(
			'type'    => __( 'Element type — container, section, div… (default)', 'slashed' ),
			'role'    => __( 'Smart role names — header, body, content, actions…', 'slashed' ),
			'generic' => __( 'Generic — item, item-2…', 'slashed' ),
		);
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'reBEMer default names', 'slashed' ); ?></h1>

			<?php if ( $just_saved ) : ?>
				<div class="notice notice-success is-dismissible">
					<p><?php esc_html_e( 'Settings saved.', 'slashed' ); ?></p>
				</div>
			<?php endif; ?>

			<p class="description" style="max-width:760px;margin-bottom:16px;">
				<?php esc_html_e( 'reBEMer pre-fills the in-builder panel with a BEM name for each element. Names you set on an element in Bricks always win — these defaults only seed unnamed elements. Leave a field blank to use the built-in suggestion shown as its placeholder.', 'slashed' ); ?>
			</p>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="slashed_save_rebemer">
				<?php wp_nonce_field( self::NONCE_ACTION, self::NONCE_KEY ); ?>

				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row">
								<label for="rebemer_container_mode"><?php esc_html_e( 'Layout container naming', 'slashed' ); ?></label>
							</th>
							<td>
								<select name="rebemer_container_mode" id="rebemer_container_mode">
									<?php foreach ( $mode_labels as $value => $label ) : ?>
										<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $mode, $value ); ?>>
											<?php echo esc_html( $label ); ?>
										</option>
									<?php endforeach; ?>
								</select>
								<p class="description">
									<?php esc_html_e( 'How section / container / div / block elements are named. These wrappers are not in the element list below.', 'slashed' ); ?>
								</p>
							</td>
						</tr>
					</tbody>
				</table>

				<h2 style="margin-top:8px;"><?php esc_html_e( 'Element default names', 'slashed' ); ?></h2>
				<p class="description" style="margin-bottom:10px;">
					<?php
					printf(
						/* translators: %d: number of Bricks elements */
						esc_html__( '%d elements registered in Bricks (including those added by plugins or custom code).', 'slashed' ),
						(int) count( $elements )
					);
					?>
				</p>

				<table class="widefat striped" style="max-width:760px;">
					<thead>
						<tr>
							<th style="width:45%;"><?php esc_html_e( 'Bricks element', 'slashed' ); ?></th>
							<th><?php esc_html_e( 'Default BEM name', 'slashed' ); ?></th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $elements as $type => $label ) : ?>
							<?php
							$default = self::default_for( $type, $label );
							$current = isset( $overrides[ $type ] ) ? (string) $overrides[ $type ] : '';
							?>
							<tr>
								<td>
									<code><?php echo esc_html( $type ); ?></code>
									<?php if ( $label ) : ?>
										<br><span class="description"><?php echo esc_html( $label ); ?></span>
									<?php endif; ?>
								</td>
								<td>
									<input
										type="text"
										name="rebemer_map[<?php echo esc_attr( $type ); ?>]"
										value="<?php echo esc_attr( $current ); ?>"
										placeholder="<?php echo esc_attr( $default ); ?>"
										class="regular-text code"
										pattern="[a-z][a-z0-9]*(-[a-z0-9]+)*"
										title="<?php esc_attr_e( 'Lowercase letters, digits and hyphens; must start with a letter.', 'slashed' ); ?>"
										style="font-family:monospace;"
									>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>

				<p class="submit">
					<button type="submit" class="button button-primary"><?php esc_html_e( 'Save changes', 'slashed' ); ?></button>
				</p>
			</form>
		</div>
		<?php
	}
}
