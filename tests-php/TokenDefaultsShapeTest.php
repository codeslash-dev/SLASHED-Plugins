<?php
/**
 * Structural-invariant tests for Slashed_Token_Defaults.
 *
 * This class is pure static default data (no WordPress runtime), so rather
 * than pin every literal value we guard the invariants other code relies on:
 *   - get_section() routing,
 *   - each oklch source group has a matching *_hex_hints group with identical
 *     keys (the admin colour picker pairs them; a drifted key = a swatch with
 *     no preview hint),
 *   - hex hints are well-formed #rrggbb,
 *   - fluid min/max ramps never invert.
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class TokenDefaultsShapeTest extends TestCase {

	public function test_get_all_exposes_the_expected_sections() {
		$all = Slashed_Token_Defaults::get_all();
		foreach ( array( 'colors', 'contrast', 'typography', 'spacing', 'layouts', 'radius', 'shadows', 'motion', 'zindex' ) as $section ) {
			$this->assertArrayHasKey( $section, $all );
			$this->assertIsArray( $all[ $section ] );
		}
	}

	public function test_get_section_returns_the_section_or_empty_array() {
		$this->assertSame( Slashed_Token_Defaults::get_colors(), Slashed_Token_Defaults::get_section( 'colors' ) );
		$this->assertSame( array(), Slashed_Token_Defaults::get_section( 'does-not-exist' ) );
	}

	/**
	 * Each oklch source group must have a hex-hint companion with the SAME
	 * family keys, so the picker always has a preview colour for every source.
	 *
	 * @dataProvider hint_pairs
	 */
	public function test_source_and_hex_hint_groups_share_identical_keys( $source_group, $hint_group ) {
		$colors = Slashed_Token_Defaults::get_colors();
		$this->assertArrayHasKey( $source_group, $colors );
		$this->assertArrayHasKey( $hint_group, $colors );
		$this->assertSame(
			array_keys( $colors[ $source_group ] ),
			array_keys( $colors[ $hint_group ] ),
			"$hint_group keys must mirror $source_group"
		);
	}

	public function hint_pairs() {
		return array(
			'brand'       => array( 'brand', 'brand_hex_hints' ),
			'brand_dark'  => array( 'brand_dark', 'brand_dark_hex_hints' ),
			'status'      => array( 'status', 'status_hex_hints' ),
			'status_dark' => array( 'status_dark', 'status_dark_hex_hints' ),
		);
	}

	public function test_all_hex_hints_are_well_formed() {
		$colors = Slashed_Token_Defaults::get_colors();
		foreach ( $colors as $group => $values ) {
			if ( false === strpos( $group, 'hex_hints' ) ) {
				continue;
			}
			foreach ( $values as $family => $hex ) {
				$this->assertMatchesRegularExpression( '/^#[0-9a-f]{6}$/i', $hex, "$group.$family is not a #rrggbb hex" );
			}
		}
	}

	public function test_fluid_size_ramps_never_invert() {
		$typography = Slashed_Token_Defaults::get_typography();
		$spacing    = Slashed_Token_Defaults::get_spacing();

		foreach ( $typography['font_sizes'] as $step => $pair ) {
			$this->assertLessThanOrEqual( $pair['max'], $pair['min'], "font size $step has min > max" );
		}
		foreach ( $spacing['space_sizes'] as $step => $pair ) {
			$this->assertLessThanOrEqual( $pair['max'], $pair['min'], "space size $step has min > max" );
		}
	}
}
