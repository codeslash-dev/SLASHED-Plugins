<?php
/**
 * Emission tests for the flat-bundle path: when the flat CSS variant is served,
 * the override block must be emitted UNLAYERED.
 *
 * Why this matters: the flat bundles are the layered rules with every @layer
 * stripped, and an unlayered declaration beats any layered one regardless of
 * specificity or source order. A `@layer slashed.overrides` wrapper is
 * therefore completely inert against a flat bundle — every token override
 * (colours, spacing, the modular scales) silently stops reaching the page.
 *
 * Runs in a separate process: it loads Slashed_Settings / Slashed_CSS_Loader,
 * and their mere presence switches other units into "unified mode" (see
 * Slashed_Token_Store::get_plugin_settings and TokenStoreTest's standalone-mode
 * test), so that must not leak into the rest of the suite.
 *
 * @runTestsInSeparateProcesses
 * @preserveGlobalState disabled
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class CssGeneratorFlatBundleTest extends TestCase {

	protected function setUp(): void {
		slashed_test_reset_state();
		// layers_enabled() resolves the real bundle URL, so the plugin's path
		// constants have to point at the committed dist/ for the flat and layered
		// filenames to exist. Per-test process isolation keeps these local.
		if ( ! defined( 'SLASHED_PATH' ) ) {
			define( 'SLASHED_PATH', dirname( __DIR__ ) . '/SLASHED-for-WP/' );
		}
		if ( ! defined( 'SLASHED_URL' ) ) {
			define( 'SLASHED_URL', 'https://example.test/wp-content/plugins/slashed/' );
		}
		$includes = dirname( __DIR__ ) . '/SLASHED-for-WP/includes/';
		require_once $includes . 'class-settings.php';
		require_once $includes . 'class-css-loader.php';
	}

	/** Set the flat toggle the way the settings page does. */
	private function set_flat( bool $flat ): void {
		update_option( Slashed_Settings::OPTION_KEY, array( 'css_flat' => $flat ) );
	}

	public function test_layered_bundle_keeps_the_overrides_layer_wrapper() {
		$this->set_flat( false );
		Slashed_Token_Store::update_overrides( array( '--sf-color-primary' => '#ff0000' ) );

		$this->assertSame(
			"@layer slashed.overrides {\n\t:root {\n\t\t--sf-color-primary: #ff0000;\n\t}\n}",
			Slashed_CSS_Generator::get_override_css()
		);
	}

	public function test_flat_bundle_emits_the_same_declarations_unlayered() {
		$this->set_flat( true );
		Slashed_Token_Store::update_overrides( array( '--sf-color-primary' => '#ff0000' ) );

		$this->assertSame(
			":root {\n\t--sf-color-primary: #ff0000;\n}",
			Slashed_CSS_Generator::get_override_css()
		);
	}

	public function test_flat_bundle_carries_every_declaration_including_derived_ones() {
		$this->set_flat( true );
		// --sf-space-ratio-min is a source knob the framework's generative
		// clamp()s read; --sf-radius-scale additionally expands to derived
		// output tokens. Both must survive the unlayered path intact.
		Slashed_Token_Store::update_overrides(
			array(
				'--sf-space-ratio-min' => '1.618',
				'--sf-radius-scale'    => '2',
			)
		);

		$css = Slashed_CSS_Generator::get_override_css();
		$this->assertStringNotContainsString( '@layer', $css );
		$this->assertStringContainsString( '--sf-space-ratio-min: 1.618;', $css );
		$this->assertStringContainsString( '--sf-radius-m: 16px;', $css );
		$this->assertStringContainsString( '--sf-radius-scale: 2;', $css );
	}

	/**
	 * The setting is not the authority — the served bundle is. `slashed/css_bundle_url`
	 * can point at a bundle css_flat does not describe, and emitting the wrong
	 * layer mode for it reintroduces exactly the inert-override bug.
	 *
	 * @dataProvider provide_bundle_urls
	 */
	public function test_layer_mode_is_read_from_the_resolved_bundle_url( $url, $expected ) {
		$this->assertSame( $expected, Slashed_CSS_Loader::url_layer_mode( $url ) );
	}

	public function provide_bundle_urls() {
		return array(
			'layered, minified'    => array( 'https://x.test/dist/slashed.optimal.min.css', true ),
			'layered, unminified'  => array( 'https://x.test/dist/slashed.full.css', true ),
			'flat, minified'       => array( 'https://x.test/dist/slashed.optimal.flat.min.css', false ),
			'flat, unminified'     => array( 'https://x.test/dist/slashed.full.flat.css', false ),
			'query string ignored' => array( 'https://x.test/dist/slashed.optimal.flat.min.css?ver=123', false ),
			'unrecognised name'    => array( 'https://cdn.test/assets/a1b2c3.css', null ),
			'empty'                => array( '', null ),
		);
	}

	public function test_wrap_layer_follows_the_same_switch() {
		$this->set_flat( false );
		$this->assertTrue( Slashed_CSS_Loader::layers_enabled() );
		$this->assertSame(
			'@layer slashed.themes{:root{--sf-is-dark:1}}',
			Slashed_CSS_Loader::wrap_layer( 'slashed.themes', ':root{--sf-is-dark:1}' )
		);

		$this->set_flat( true );
		$this->assertFalse( Slashed_CSS_Loader::layers_enabled() );
		$this->assertSame(
			':root{--sf-is-dark:1}',
			Slashed_CSS_Loader::wrap_layer( 'slashed.themes', ':root{--sf-is-dark:1}' )
		);
	}
}
