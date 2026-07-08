<?php
/**
 * Tests for Slashed_REST_Controller::sanitize_overrides() — the name gate on
 * the flat { "--sf-name": value } override map saved by POST /tokens/overrides.
 *
 * CssGeneratorValidateOverrideValueTest already covers the *value* allowlist in
 * depth; this suite covers the complementary half sanitize_overrides() owns:
 *   - the property-name gate (`^--sf-[a-z0-9-]+$`),
 *   - dropping non-string keys / non-scalar values,
 *   - coercing accepted int/float values to strings,
 * so a bad *name* can never become a CSS property even when the value is valid.
 *
 * sanitize_overrides() is a pure private method (its only collaborator,
 * Slashed_CSS_Generator::validate_override_value(), needs no WordPress runtime)
 * exercised here through reflection to keep the controller's public surface
 * unchanged.
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class RestControllerSanitizeOverridesTest extends TestCase {

	/**
	 * @param array $overrides
	 * @return array
	 */
	private function sanitize( array $overrides ) {
		$m = new ReflectionMethod( 'Slashed_REST_Controller', 'sanitize_overrides' );
		$m->setAccessible( true );
		return $m->invoke( new Slashed_REST_Controller(), $overrides );
	}

	public function test_keeps_valid_name_value_pairs() {
		$this->assertSame(
			array( '--sf-color-brand' => '#ff0000' ),
			$this->sanitize( array( '--sf-color-brand' => '#ff0000' ) )
		);
	}

	public function test_coerces_accepted_numeric_values_to_strings() {
		$this->assertSame( array( '--sf-space-x' => '5' ), $this->sanitize( array( '--sf-space-x' => 5 ) ) );
		$this->assertSame( array( '--sf-space-x' => '1.5' ), $this->sanitize( array( '--sf-space-x' => 1.5 ) ) );
	}

	/**
	 * @dataProvider rejected_names
	 */
	public function test_drops_names_outside_the_custom_property_gate( $name ) {
		$this->assertSame( array(), $this->sanitize( array( $name => '#ffffff' ) ) );
	}

	public function rejected_names() {
		return array(
			'uppercase segment'  => array( '--sf-Color-Brand' ),
			'missing --sf-'      => array( 'color-brand' ),
			'other -- namespace' => array( '--wp-x' ),
			'bare prefix'        => array( '--sf-' ),
			'underscore'         => array( '--sf-color_brand' ),
			'trailing space'     => array( '--sf-x ' ),
		);
	}

	/**
	 * @dataProvider rejected_values
	 */
	public function test_drops_unsafe_or_non_scalar_values( $value ) {
		$this->assertSame( array(), $this->sanitize( array( '--sf-x' => $value ) ) );
	}

	public function rejected_values() {
		return array(
			'brace breakout'  => array( 'red; } html{' ),
			'closing brace'   => array( '}evil' ),
			'array'           => array( array( '#fff' ) ),
			'null'            => array( null ),
			'bool'            => array( true ),
			'empty string'    => array( '' ),
		);
	}

	public function test_keeps_only_the_valid_entries_from_a_mixed_map() {
		$out = $this->sanitize(
			array(
				'--sf-a' => '#111111',   // kept
				'bad'    => '#222222',   // dropped: name gate
				'--sf-b' => '}evil',     // dropped: unsafe value
			)
		);
		$this->assertSame( array( '--sf-a' => '#111111' ), $out );
	}
}
