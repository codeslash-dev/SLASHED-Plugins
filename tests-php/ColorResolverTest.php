<?php
/**
 * Golden-value + invariant regression tests for Slashed_Color_Resolver — the
 * pure resolver that turns parsed --sf-color-* source values into the full
 * hex swatch map (scale 50-950, alpha steps, semantic aliases) the builder
 * colour picker previews.
 *
 * Like ColorMathTest, the golden hexes lock the *current* output of a
 * dependency-free approximation (see the class doc comment) so a future change
 * to the scale/alpha/alias machinery is caught here rather than shipping as a
 * silent visual drift. If the framework's canonical derivation intentionally
 * changes, update these constants deliberately.
 *
 * Pure math, no WordPress runtime — the resolver only depends on
 * Slashed_Color_Math and Slashed_Token_Defaults, both required in bootstrap.
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class ColorResolverTest extends TestCase {

	/**
	 * Light-mode golden values for the default (unparsed) source set.
	 *
	 * @dataProvider light_golden
	 */
	public function test_resolve_matches_golden( $key, $expected ) {
		$map = Slashed_Color_Resolver::resolve( array() );
		$this->assertArrayHasKey( $key, $map );
		$this->assertSame( $expected, $map[ $key ] );
	}

	public function light_golden() {
		return array(
			'family base'      => array( '--sf-color-primary', '#0137ee' ),
			'lightest step'    => array( '--sf-color-primary-50', '#f4f8ff' ),
			'darkest step'     => array( '--sf-color-primary-950', '#000001' ),
			'alpha a5'         => array( '--sf-color-primary-a5', '#f2f5fe' ),
			'alpha a50'        => array( '--sf-color-primary-a50', '#809bf7' ),
			'neutral 200'      => array( '--sf-color-neutral-200', '#dddfe3' ),
			'success 500'      => array( '--sf-color-success-500', '#00791b' ),
			'surface base'     => array( '--sf-color-base', '#eff2f6' ),
			'semantic text'    => array( '--sf-color-text', '#1c1c2e' ),
			'semantic bg'      => array( '--sf-color-bg', '#fcfcfd' ),
		);
	}

	/**
	 * Dark-mode golden values — the dark resolver inverts the surface and
	 * composites alpha over the dark base rather than white.
	 *
	 * @dataProvider dark_golden
	 */
	public function test_resolve_dark_matches_golden( $key, $expected ) {
		$map = Slashed_Color_Resolver::resolve_dark( array() );
		$this->assertArrayHasKey( $key, $map );
		$this->assertSame( $expected, $map[ $key ] );
	}

	public function dark_golden() {
		return array(
			'family base'   => array( '--sf-color-primary', '#5196ff' ),
			'surface base'  => array( '--sf-color-base', '#1a1b1c' ),
			'semantic text' => array( '--sf-color-text', '#e3ecfb' ),
		);
	}

	public function test_base_500_and_light_are_the_direct_source_conversion() {
		$map = Slashed_Color_Resolver::resolve( array() );
		foreach ( array( 'primary', 'neutral', 'success' ) as $family ) {
			$base = $map[ '--sf-color-' . $family ];
			$this->assertSame( $base, $map[ '--sf-color-' . $family . '-500' ], "$family: -500 must equal the family base" );
			$this->assertSame( $base, $map[ '--sf-color-' . $family . '-light' ], "$family: -light must equal the family base" );
		}
	}

	public function test_semantic_aliases_point_at_their_target_steps() {
		$map     = Slashed_Color_Resolver::resolve( array() );
		$aliases = array(
			'hover'  => '600',
			'active' => '800',
			'subtle' => 'a10',
			'muted'  => 'a30',
			'ghost'  => 'a5',
		);
		foreach ( $aliases as $alias => $target ) {
			$this->assertSame(
				$map[ '--sf-color-primary-' . $target ],
				$map[ '--sf-color-primary-' . $alias ],
				"alias -$alias must resolve to step -$target"
			);
		}
	}

	public function test_light_and_dark_resolve_the_same_variable_set() {
		$light = array_keys( Slashed_Color_Resolver::resolve( array() ) );
		$dark  = array_keys( Slashed_Color_Resolver::resolve_dark( array() ) );
		sort( $light );
		sort( $dark );
		$this->assertSame( $light, $dark, 'light and dark maps must cover identical --sf-color-* variables' );
	}

	public function test_every_value_is_a_six_digit_hex_string() {
		foreach ( Slashed_Color_Resolver::resolve( array() ) as $key => $value ) {
			$this->assertMatchesRegularExpression( '/^#[0-9a-f]{6}$/', $value, "$key produced a non-hex value: $value" );
		}
	}

	public function test_parsed_oklch_source_overrides_the_default() {
		$map = Slashed_Color_Resolver::resolve(
			array( '--sf-color-primary-light' => 'oklch(0.70 0.10 145)' )
		);
		$this->assertSame( '#76af77', $map['--sf-color-primary'] );
	}

	public function test_hex_source_is_accepted_and_round_trips() {
		$map = Slashed_Color_Resolver::resolve(
			array( '--sf-color-primary-light' => '#3b82f6' )
		);
		$this->assertSame( '#3b82f6', $map['--sf-color-primary'] );
	}

	public function test_explicit_dark_override_wins_over_auto_derivation() {
		$map = Slashed_Color_Resolver::resolve_dark(
			array( '--sf-color-primary-dark' => 'oklch(0.80 0.05 145)' )
		);
		$this->assertSame( '#aac7aa', $map['--sf-color-primary'] );
	}

	public function test_unparseable_source_value_falls_back_to_the_default() {
		// A garbage / injection-shaped value can't parse as oklch or hex, so the
		// resolver falls back to the framework default rather than emitting it —
		// and the output is still a plain hex string, never the raw input.
		$map = Slashed_Color_Resolver::resolve(
			array( '--sf-color-primary-light' => 'red; } html{ color:red' )
		);
		$this->assertSame( '#0137ee', $map['--sf-color-primary'] );
	}
}
