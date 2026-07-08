<?php
/**
 * Tests for Slashed_Token_Store — the option-persistence boundary.
 *
 * Previously "uncoverable without WordPress": every method calls
 * get_option/update_option/delete_option. The unit bootstrap now backs those
 * with an in-memory option store (see bootstrap.php), so the store's own logic
 * — corrupt-value guards, default merging, retired-key stripping, css_bundle
 * routing in standalone mode — is exercised here without a WP install.
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class TokenStoreTest extends TestCase {

	protected function setUp(): void {
		slashed_test_reset_state();
	}

	public function test_overrides_round_trip_through_the_option() {
		Slashed_Token_Store::update_overrides( array( '--sf-color-primary' => '#ff0000' ) );
		$this->assertSame(
			array( '--sf-color-primary' => '#ff0000' ),
			Slashed_Token_Store::get_overrides()
		);
	}

	public function test_get_overrides_defaults_to_empty_array_when_unset() {
		$this->assertSame( array(), Slashed_Token_Store::get_overrides() );
	}

	public function test_get_overrides_recovers_from_a_corrupt_option() {
		update_option( Slashed_Token_Store::OVERRIDES_OPTION_NAME, 'not-an-array' );
		$this->assertSame( array(), Slashed_Token_Store::get_overrides() );
	}

	public function test_delete_overrides_clears_the_option() {
		Slashed_Token_Store::update_overrides( array( '--sf-color-primary' => '#ff0000' ) );
		Slashed_Token_Store::delete_overrides();
		$this->assertSame( array(), Slashed_Token_Store::get_overrides() );
	}

	public function test_plugin_settings_merge_defaults_for_missing_keys() {
		$settings = Slashed_Token_Store::get_plugin_settings();
		$this->assertSame( 'optimal', $settings['css_bundle'] );
		$this->assertTrue( $settings['rebemer_enabled'] );
		$this->assertFalse( $settings['show_class_hints'] );
		$this->assertSame( array(), $settings['rebemer_element_map'] );
	}

	public function test_plugin_settings_strip_retired_keys_on_read() {
		update_option(
			Slashed_Token_Store::SETTINGS_OPTION_NAME,
			array(
				'show_class_hints'         => true,
				'rebemer_container_mode'   => 'legacy', // retired key an upgraded site may carry
			)
		);
		$settings = Slashed_Token_Store::get_plugin_settings();
		$this->assertArrayNotHasKey( 'rebemer_container_mode', $settings );
		$this->assertTrue( $settings['show_class_hints'] );
	}

	public function test_update_plugin_settings_persists_only_known_keys() {
		Slashed_Token_Store::update_plugin_settings(
			array(
				'show_color_panel' => false,
				'bogus_key'        => 'nope',
			)
		);
		$stored = get_option( Slashed_Token_Store::SETTINGS_OPTION_NAME );
		$this->assertArrayNotHasKey( 'bogus_key', $stored );
		$this->assertArrayHasKey( 'show_color_panel', $stored );
	}

	public function test_css_bundle_stays_in_the_local_row_in_standalone_mode() {
		// With no Slashed_Settings class loaded, css_bundle is not routed away —
		// it round-trips through the plugin's own settings row.
		$this->assertFalse( class_exists( 'Slashed_Settings' ), 'standalone-mode precondition' );
		Slashed_Token_Store::update_plugin_settings(
			array_merge(
				Slashed_Token_Store::PLUGIN_SETTING_DEFAULTS,
				array( 'css_bundle' => 'full' )
			)
		);
		$this->assertSame( 'full', Slashed_Token_Store::get_plugin_settings()['css_bundle'] );
	}
}
