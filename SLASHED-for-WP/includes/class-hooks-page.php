<?php
/**
 * SLASHED Filter Hooks reference page.
 *
 * Static PHP subpage listing every available filter hook with descriptions,
 * parameter docs, and copy-paste PHP examples. No Svelte dependency — works
 * even when the SPA bundle is absent.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Hooks_Page
 */
class Slashed_Hooks_Page {

	const PAGE_SLUG = 'slashed-hooks';

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
	}

	public function register_menu() {
		if ( defined( 'SLASHED_VERSION' ) ) {
			add_submenu_page(
				'slashed',
				__( 'Filter Hooks', 'slashed' ),
				__( 'Filter Hooks', 'slashed' ),
				'manage_options',
				self::PAGE_SLUG,
				array( $this, 'render_page' )
			);
		}
	}

	/**
	 * All documented filter hooks, grouped by integration.
	 *
	 * @return array[]
	 */
	private static function get_hooks() {
		return array(
			'bricks' => array(
				'label' => 'Bricks integration',
				'hooks' => array(
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
				),
			),
		);
	}

	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$bricks_active = class_exists( 'Slashed_Settings' ) && Slashed_Settings::is_enabled( 'bricks' );
		$groups        = self::get_hooks();
		?>
		<style>
		.slashed-hooks-group {
			border: 1px solid #e2e4e7;
			border-radius: 6px;
			padding: 16px 20px;
			margin: 16px 0;
			max-width: 860px;
		}
		.slashed-hooks-group--inactive { opacity: .6; }
		.slashed-hooks-group__header {
			display: flex;
			align-items: center;
			gap: 8px;
			margin: 0 0 16px;
			flex-wrap: wrap;
		}
		.slashed-hooks-group__title { font-size: 13px; font-weight: 600; }
		.slashed-hooks-badge {
			display: inline-block;
			font-size: 10px;
			font-weight: 600;
			padding: 2px 7px;
			border-radius: 10px;
			text-transform: uppercase;
			letter-spacing: .04em;
		}
		.slashed-hooks-badge--bricks {
			background: #f0f4ff;
			color: #2563eb;
			border: 1px solid #bfdbfe;
		}
		.slashed-hooks-inactive-note {
			font-size: 12px;
			color: #8c8f94;
			font-style: italic;
			flex-basis: 100%;
		}
		.slashed-hook {
			border: 1px solid #f0f0f1;
			border-radius: 4px;
			padding: 14px 16px;
			margin-bottom: 10px;
			background: #fcfcfd;
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

		<div class="wrap">
			<h1><?php esc_html_e( 'Filter Hooks Reference', 'slashed' ); ?></h1>
			<p class="description" style="max-width:720px;margin-bottom:6px;">
				<?php esc_html_e( 'These WordPress filter hooks let you customise SLASHED integrations from your theme or an mu-plugin. Hooks only fire when their respective integration is active.', 'slashed' ); ?>
			</p>

			<?php foreach ( $groups as $slug => $group ) : ?>
				<?php
				$inactive = ( 'bricks' === $slug ) && ! $bricks_active;
				?>
				<div class="slashed-hooks-group<?php echo $inactive ? ' slashed-hooks-group--inactive' : ''; ?>">
					<div class="slashed-hooks-group__header">
						<span class="slashed-hooks-group__title"><?php echo esc_html( $group['label'] ); ?></span>
						<span class="slashed-hooks-badge slashed-hooks-badge--<?php echo esc_attr( $slug ); ?>"><?php echo esc_html( ucfirst( $slug ) ); ?></span>
						<?php if ( $inactive ) : ?>
							<span class="slashed-hooks-inactive-note">
								<?php esc_html_e( 'This integration is disabled — these hooks have no effect until it is turned on in Plugin Settings.', 'slashed' ); ?>
							</span>
						<?php endif; ?>
					</div>

					<?php foreach ( $group['hooks'] as $hook ) : ?>
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
				</div>
			<?php endforeach; ?>
		</div>
		<?php
	}
}
