<?php
/**
 * Bricks settings admin page.
 *
 * A single tabbed WP admin subpage (sibling of Manual CSS) that gathers
 * every Bricks-specific setting in one place — kept out of the Design
 * Settings SPA on purpose. Tabs:
 *   - Element names — the default BEM names reBEMer pre-fills for each
 *     registered Bricks element (core, plugin, or custom), enumerated via
 *     Slashed_Bricks_Elements.
 *   - Options       — Bricks-only behavioural toggles (class hints).
 *   - Filter hooks  — read-only reference of the Bricks filter hooks.
 *
 * Bricks-only: the menu registers only when the Bricks integration (and
 * thus the element registry) is loaded. Saved values live in the shared
 * plugin settings the Bricks editor already reads back via
 * window.slashedBricksEditor.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Bricks_Settings_Page
 */
class Slashed_Bricks_Settings_Page {

	const PAGE_SLUG = 'slashed-bricks';

	/** reBEMer tab save (master toggle + element-name overrides). */
	const REBEMER_NONCE_KEY    = 'slashed_bricks_rebemer_nonce';
	const REBEMER_NONCE_ACTION = 'slashed_save_bricks_rebemer';

	/** Options tab save. */
	const OPTIONS_NONCE_KEY    = 'slashed_bricks_options_nonce';
	const OPTIONS_NONCE_ACTION = 'slashed_save_bricks_options';

	/** Bricks layout containers — named after their own type, not the map. */
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
		'heading'          => 'heading',
		'text-basic'       => 'text',
		'text'             => 'text',
		'text-link'        => 'link',
		'code'             => 'code',
		'post-title'       => 'title',
		'post-content'     => 'content',
		'post-excerpt'     => 'excerpt',
		'post-meta'        => 'meta',
		'image'            => 'image',
		'icon'             => 'icon',
		'icon-box'         => 'icon',
		'video'            => 'video',
		'audio'            => 'audio',
		'svg'              => 'svg',
		'logo'             => 'logo',
		'shape'            => 'shape',
		'divider'          => 'divider',
		'separator'        => 'separator',
		'button'           => 'button',
		'button-group'     => 'buttons',
		'nav-nested'       => 'nav',
		'nav-menu'         => 'nav',
		'list'             => 'list',
		'search'           => 'search',
		'social-icons'     => 'social',
		'accordion'        => 'accordion',
		'accordion-nested' => 'accordion',
		'tabs'             => 'tabs',
		'tabs-nested'      => 'tabs',
		'slider'           => 'slider',
		'slider-nested'    => 'slider',
		'carousel'         => 'carousel',
		'countdown'        => 'countdown',
		'counter'          => 'counter',
		'progress-bar'     => 'progress',
		'alert'            => 'alert',
		'testimonials'     => 'testimonials',
		'pricing'          => 'pricing',
		'team'             => 'team',
		'map'              => 'map',
		'google-maps'      => 'map',
		'breadcrumbs'      => 'breadcrumbs',
		'pagination'       => 'pagination',
		'form'             => 'form',
		'posts'            => 'posts',
		'related-posts'    => 'posts',
		'template'         => 'item',
	);

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_post_slashed_save_bricks_rebemer', array( $this, 'handle_save_rebemer' ) );
		add_action( 'admin_post_slashed_save_bricks_options', array( $this, 'handle_save_options' ) );
	}

	public function register_menu() {
		// Bricks-only feature; only show it when the Bricks element registry
		// (and the shared admin menu) is available.
		if ( ! class_exists( 'Slashed_Bricks_Elements' ) || ! class_exists( 'Slashed_Admin' ) ) {
			return;
		}

		add_submenu_page(
			\Slashed_Admin::PAGE_SLUG,
			__( 'Bricks settings', 'slashed' ),
			__( 'Bricks settings', 'slashed' ),
			'manage_options',
			self::PAGE_SLUG,
			array( $this, 'render_page' )
		);
	}

	/**
	 * Tab slug => human label.
	 *
	 * @return array<string,string>
	 */
	private static function tabs() {
		return array(
			'rebemer' => __( 'reBEMer', 'slashed' ),
			'options' => __( 'Options', 'slashed' ),
			'hooks'   => __( 'Filter hooks', 'slashed' ),
		);
	}

	/**
	 * Currently selected tab (defaults to 'rebemer').
	 *
	 * @return string
	 */
	private static function current_tab() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only tab switch, no state change.
		$tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'rebemer';
		return array_key_exists( $tab, self::tabs() ) ? $tab : 'rebemer';
	}

	/**
	 * URL for a given tab.
	 *
	 * @param string $tab   Tab slug.
	 * @param bool   $saved Whether to flag a successful save.
	 * @return string
	 */
	private static function tab_url( $tab, $saved = false ) {
		$args = array(
			'page' => self::PAGE_SLUG,
			'tab'  => $tab,
		);
		if ( $saved ) {
			$args['saved'] = '1';
		}
		return add_query_arg( $args, admin_url( 'admin.php' ) );
	}

	/**
	 * All editable elements as name => human label, including layout
	 * containers, unioned with the built-in map and the container list so
	 * nothing the editor knows about disappears when Bricks data is momentarily
	 * unavailable.
	 *
	 * @return array<string,string>
	 */
	private static function elements() {
		$registry = class_exists( 'Slashed_Bricks_Elements' ) ? Slashed_Bricks_Elements::get_all() : array();
		$names    = array_unique(
			array_merge(
				array_keys( $registry ),
				array_keys( self::BUILTIN_DEFAULTS ),
				self::LAYOUT_CONTAINERS
			)
		);

		$out = array();
		foreach ( $names as $name ) {
			$out[ $name ] = isset( $registry[ $name ] ) ? $registry[ $name ] : '';
		}
		ksort( $out );
		return $out;
	}

	/**
	 * Built-in default BEM name for an element: layout containers default to
	 * their own Bricks type (matching the editor's suggestContainerName), then
	 * the curated map value, else the slugified Bricks label, else 'item' —
	 * matching the editor's fallback chain.
	 *
	 * @param string $type  Element name.
	 * @param string $label Human label (may be empty).
	 * @return string
	 */
	private static function default_for( $type, $label ) {
		if ( in_array( $type, self::LAYOUT_CONTAINERS, true ) ) {
			return $type;
		}
		if ( isset( self::BUILTIN_DEFAULTS[ $type ] ) ) {
			return self::BUILTIN_DEFAULTS[ $type ];
		}
		$slug = sanitize_title( $label );
		return '' !== $slug ? $slug : 'item';
	}

	/**
	 * Save the reBEMer tab (master toggle + element-name overrides).
	 */
	public function handle_save_rebemer() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Insufficient permissions.', 'slashed' ) );
		}

		check_admin_referer( self::REBEMER_NONCE_ACTION, self::REBEMER_NONCE_KEY );

		// Read-merge-write: keep every sibling setting (Manual CSS, options…).
		$settings = Slashed_Token_Store::get_plugin_settings();

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- covered by check_admin_referer above.
		$settings['rebemer_enabled'] = isset( $_POST['rebemer_enabled'] );
		$posted_map                  = ( isset( $_POST['rebemer_map'] ) && is_array( $_POST['rebemer_map'] ) ) ? wp_unslash( $_POST['rebemer_map'] ) : array();
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		$elements  = self::elements();
		// Seed from the stored map and only reconcile rows actually rendered on
		// the form. Overrides for elements that aren't currently registered
		// (e.g. a temporarily deactivated plugin) have no row here and are left
		// untouched, so saving never silently drops them.
		$overrides = isset( $settings['rebemer_element_map'] ) && is_array( $settings['rebemer_element_map'] )
			? $settings['rebemer_element_map']
			: array();
		foreach ( $elements as $type => $label ) {
			$name = ( isset( $posted_map[ $type ] ) && is_string( $posted_map[ $type ] ) )
				? strtolower( trim( $posted_map[ $type ] ) )
				: '';

			// Store sparse overrides only: blank, or a value equal to the
			// built-in default, clears the override for that element.
			if ( '' === $name || self::default_for( $type, $label ) === $name ) {
				unset( $overrides[ $type ] );
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

		wp_safe_redirect( self::tab_url( 'rebemer', true ) );
		exit;
	}

	/**
	 * Save the Options tab.
	 */
	public function handle_save_options() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Insufficient permissions.', 'slashed' ) );
		}

		check_admin_referer( self::OPTIONS_NONCE_ACTION, self::OPTIONS_NONCE_KEY );

		// Read-merge-write so we only touch the option toggles.
		$settings = Slashed_Token_Store::get_plugin_settings();
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- covered by check_admin_referer above.
		$settings['show_color_panel'] = isset( $_POST['show_color_panel'] );
		$settings['show_class_hints'] = isset( $_POST['show_class_hints'] );
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		Slashed_Token_Store::update_plugin_settings( $settings );

		wp_safe_redirect( self::tab_url( 'options', true ) );
		exit;
	}

	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$tab = self::current_tab();
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display-only success flag.
		$just_saved = isset( $_GET['saved'] ) && '1' === $_GET['saved'];
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Bricks settings', 'slashed' ); ?></h1>

			<h2 class="nav-tab-wrapper">
				<?php foreach ( self::tabs() as $slug => $label ) : ?>
					<a
						href="<?php echo esc_url( self::tab_url( $slug ) ); ?>"
						class="nav-tab<?php echo $tab === $slug ? ' nav-tab-active' : ''; ?>"
					>
						<?php echo esc_html( $label ); ?>
					</a>
				<?php endforeach; ?>
			</h2>

			<?php
			if ( 'options' === $tab ) {
				$this->render_options_tab( $just_saved );
			} elseif ( 'hooks' === $tab ) {
				$this->render_hooks_tab();
			} else {
				$this->render_rebemer_tab( $just_saved );
			}
			?>
		</div>
		<?php
	}

	/**
	 * reBEMer tab body: the master enable toggle plus the element-name
	 * override table (both saved by one form).
	 *
	 * @param bool $just_saved Whether to show the saved notice.
	 */
	private function render_rebemer_tab( $just_saved ) {
		$settings        = Slashed_Token_Store::get_plugin_settings();
		$rebemer_enabled = ! empty( $settings['rebemer_enabled'] );
		$overrides       = isset( $settings['rebemer_element_map'] ) && is_array( $settings['rebemer_element_map'] )
			? $settings['rebemer_element_map']
			: array();
		$elements        = self::elements();
		?>
		<?php if ( $just_saved ) : ?>
			<div class="notice notice-success is-dismissible">
				<p><?php esc_html_e( 'Settings saved.', 'slashed' ); ?></p>
			</div>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="slashed_save_bricks_rebemer">
			<?php wp_nonce_field( self::REBEMER_NONCE_ACTION, self::REBEMER_NONCE_KEY ); ?>

			<table class="form-table" role="presentation">
				<tbody>
					<tr>
						<th scope="row"><?php esc_html_e( 'reBEMer', 'slashed' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="rebemer_enabled" <?php checked( $rebemer_enabled ); ?>>
								<?php esc_html_e( 'Enable the reBEMer BEM-naming tool in the Bricks builder', 'slashed' ); ?>
							</label>
							<p class="description"><?php esc_html_e( 'Adds the BEM badges and rename panel to the Bricks structure panel. Turn off to hide them; the colour tools are unaffected.', 'slashed' ); ?></p>
						</td>
					</tr>
				</tbody>
			</table>

			<h2 style="margin-top:8px;"><?php esc_html_e( 'Element default names', 'slashed' ); ?></h2>

			<p class="description" style="max-width:760px;margin:4px 0;">
				<?php esc_html_e( 'reBEMer pre-fills the in-builder panel with a BEM name for each element. Names you set on an element in Bricks always win — these defaults only seed unnamed elements. Leave a field blank to use the built-in suggestion shown as its placeholder.', 'slashed' ); ?>
			</p>

			<p class="description" style="max-width:760px;margin-bottom:16px;">
				<?php esc_html_e( 'Layout containers (section / container / div / block) default to their own Bricks type — set a name below to override that.', 'slashed' ); ?>
			</p>

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
		<?php
	}

	/**
	 * Options tab body.
	 *
	 * @param bool $just_saved Whether to show the saved notice.
	 */
	private function render_options_tab( $just_saved ) {
		$settings         = Slashed_Token_Store::get_plugin_settings();
		$show_color_panel = ! empty( $settings['show_color_panel'] );
		$show_class_hints = ! empty( $settings['show_class_hints'] );
		?>
		<?php if ( $just_saved ) : ?>
			<div class="notice notice-success is-dismissible">
				<p><?php esc_html_e( 'Settings saved.', 'slashed' ); ?></p>
			</div>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="slashed_save_bricks_options">
			<?php wp_nonce_field( self::OPTIONS_NONCE_ACTION, self::OPTIONS_NONCE_KEY ); ?>

			<table class="form-table" role="presentation">
				<tbody>
					<tr>
						<th scope="row"><?php esc_html_e( 'Color System shortcut', 'slashed' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="show_color_panel" <?php checked( $show_color_panel ); ?>>
								<?php esc_html_e( 'Show the “Colors” launcher in the Bricks builder', 'slashed' ); ?>
							</label>
							<p class="description"><?php esc_html_e( 'The pill pinned to the bottom-right of the builder that opens the SLASHED Color System panel.', 'slashed' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Class hints', 'slashed' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="show_class_hints" <?php checked( $show_class_hints ); ?>>
								<?php esc_html_e( 'Show class hints in Bricks editor', 'slashed' ); ?>
							</label>
							<p class="description"><?php esc_html_e( 'When enabled, hovering a SLASHED class in the Bricks class manager shows a short description of what it does.', 'slashed' ); ?></p>
						</td>
					</tr>
				</tbody>
			</table>

			<p class="submit">
				<button type="submit" class="button button-primary"><?php esc_html_e( 'Save changes', 'slashed' ); ?></button>
			</p>
		</form>
		<?php
	}

	/**
	 * All documented Bricks filter hooks.
	 *
	 * @return array[]
	 */
	private static function get_hooks() {
		return array(
			array(
				'name'        => 'slashed_bricks/css_bundle_url',
				'description' => 'Override which CSS bundle URL is loaded on the frontend.',
				'params'      => '$url (string) — The current CSS bundle URL.',
				'example'     => "add_filter( 'slashed_bricks/css_bundle_url', function( \$url ) {\n    // Load from a CDN instead.\n    return 'https://cdn.example.com/slashed/slashed.optimal.css';\n} );",
			),
			array(
				'name'        => 'slashed_bricks/registered_classes',
				'description' => 'Filter the array of classes before registration with Bricks.',
				'params'      => "\$classes (array) — Array of class definitions with 'name' and 'category'.",
				'example'     => "add_filter( 'slashed_bricks/registered_classes', function( \$classes ) {\n    // Remove state classes.\n    return array_filter( \$classes, function( \$class ) {\n        return \$class['category'] !== 'slashed-cat-state';\n    } );\n} );",
			),
			array(
				'name'        => 'slashed_bricks/registered_variables',
				'description' => 'Filter the CSS variables array before registration with Bricks.',
				'params'      => "\$variables (array) — Array of variable entries, each with 'id', 'name', 'value', and 'category' (a slashed-cat-* id).",
				'example'     => "add_filter( 'slashed_bricks/registered_variables', function( \$variables ) {\n    // Remove z-index variables.\n    return array_filter( \$variables, function( \$variable ) {\n        return \$variable['category'] !== 'slashed-cat-z-index';\n    } );\n} );",
			),
			array(
				'name'        => 'slashed_bricks/variables',
				'description' => 'Filter the raw grouped variable map (category label → --sf-* names) before it is turned into Bricks entries. Lower-level than registered_variables.',
				'params'      => '$variables (array) — Map of category label to array of --sf-* names.',
				'example'     => "add_filter( 'slashed_bricks/variables', function( \$variables ) {\n    // Drop a whole category from pickers + autocomplete.\n    unset( \$variables['Z-Index'] );\n    return \$variables;\n} );",
			),
			array(
				'name'        => 'slashed_bricks/inventory',
				'description' => 'Replace the resolved inventory wholesale. Useful for tests, custom forks of the framework, or sites that want to ship their own token list.',
				'params'      => "\$inventory (array) — Array with keys 'variables', 'sf_classes', 'is_classes'.",
				'example'     => "add_filter( 'slashed_bricks/inventory', function( \$inventory ) {\n    \$inventory['variables'][] = '--sf-color-my-custom';\n    return \$inventory;\n} );",
			),
			array(
				'name'        => 'slashed_bricks/inventory_local_path',
				'description' => 'Override the local CSS path the inventory parses. Return a string for a specific path, false to skip local resolution, or null (default) to use bundled candidates.',
				'params'      => '$path (string|false|null) — Override path or control flag.',
				'example'     => "// Use a child-theme copy of the bundle.\nadd_filter( 'slashed_bricks/inventory_local_path', function() {\n    return get_stylesheet_directory() . '/assets/slashed.optimal.css';\n} );",
			),
			array(
				'name'        => 'slashed_bricks/show_color_swatches',
				'description' => 'Toggle the colour squares painted next to --sf-color-* entries in the Bricks variable-picker dropdown (builder-side only). Defaults to true.',
				'params'      => '$show (bool) — Whether to paint the picker swatches.',
				'example'     => "// Hide the variable-picker swatches.\nadd_filter( 'slashed_bricks/show_color_swatches', '__return_false' );",
			),
			array(
				'name'        => 'slashed_bricks/show_color_panel',
				'description' => 'Toggle the in-builder Color System Panel and its launcher pill. Defaults to true.',
				'params'      => '$show (bool) — Whether to load the Color System Panel.',
				'example'     => "// Hide the Color System panel.\nadd_filter( 'slashed_bricks/show_color_panel', '__return_false' );",
			),
		);
	}

	/**
	 * Filter hooks tab body (read-only reference).
	 */
	private function render_hooks_tab() {
		$hooks = self::get_hooks();
		?>
		<style>
		.slashed-hook {
			border: 1px solid #f0f0f1;
			border-radius: 4px;
			padding: 14px 16px;
			margin-bottom: 10px;
			background: #fcfcfd;
			max-width: 860px;
		}
		.slashed-hook:last-child { margin-bottom: 0; }
		.slashed-hook__name {
			margin: 0 0 6px;
			font-size: 13px;
			font-weight: 600;
		}
		.slashed-hook__name code {
			background: #e7e8ea;
			padding: 3px 8px;
			border-radius: 3px;
			font-size: 12.5px;
			font-weight: 600;
		}
		.slashed-hook__desc {
			margin: 0 0 6px;
			font-size: 13px;
			color: #1d2327;
		}
		.slashed-hook__params {
			margin: 0 0 10px;
			font-size: 12px;
			color: #50575e;
		}
		.slashed-hook__params code {
			background: #f0f0f1;
			padding: 1px 4px;
			border-radius: 2px;
			font-size: 11.5px;
		}
		.slashed-hook__example {
			margin: 0;
			padding: 12px 14px;
			background: #1d2327;
			color: #e4e6e8;
			border-radius: 4px;
			overflow-x: auto;
			font-size: 12px;
			line-height: 1.55;
			font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
		}
		</style>

		<p class="description" style="max-width:720px;margin:16px 0;">
			<?php esc_html_e( 'These WordPress filter hooks let you customise the Bricks integration from your theme or an mu-plugin. They only fire while the Bricks integration is active.', 'slashed' ); ?>
		</p>

		<?php foreach ( $hooks as $hook ) : ?>
			<div class="slashed-hook">
				<h3 class="slashed-hook__name"><code><?php echo esc_html( $hook['name'] ); ?></code></h3>
				<p class="slashed-hook__desc"><?php echo esc_html( $hook['description'] ); ?></p>
				<p class="slashed-hook__params">
					<strong><?php esc_html_e( 'Parameters:', 'slashed' ); ?></strong>
					<code><?php echo esc_html( $hook['params'] ); ?></code>
				</p>
				<pre class="slashed-hook__example"><?php echo esc_html( $hook['example'] ); ?></pre>
			</div>
		<?php endforeach; ?>
		<?php
	}
}
