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
		// build_family_scales() feeds BOTH the light and dark maps, so the alias
		// wiring is asserted against each — the light/dark key-set test alone
		// would not catch an alias pointing at the wrong step in one mode.
		$maps = array(
			'light' => Slashed_Color_Resolver::resolve( array() ),
			'dark'  => Slashed_Color_Resolver::resolve_dark( array() ),
		);
		// Alias suffix (with its exact separator) => target step. BEM state
		// modifiers use a double dash (`--hover`, `--active`) to match the
		// framework tokens in core/tokens.css; tonal aliases use a single dash.
		$aliases = array(
			'--hover'  => '600',
			'--active' => '800',
			'-subtle'  => 'a10',
			'-muted'   => 'a30',
			'-tint'    => 'a5',
		);
		foreach ( $maps as $mode => $map ) {
			foreach ( $aliases as $suffix => $target ) {
				$this->assertSame(
					$map[ '--sf-color-primary-' . $target ],
					$map[ '--sf-color-primary' . $suffix ],
					"$mode: alias $suffix must resolve to step -$target"
				);
			}
		}
	}

	public function test_state_modifier_aliases_use_the_double_dash_bem_naming() {
		// Regression guard: the builder colour-swatch and variable-picker
		// lookups key off the framework's real token names. `--hover`/`--active`
		// are BEM state modifiers (double dash); emitting the single-dash form
		// left those swatches blank in the Bricks variable dropdown. Checked in
		// both modes since build_family_scales() feeds the light and dark maps.
		$maps = array(
			'light' => Slashed_Color_Resolver::resolve( array() ),
			'dark'  => Slashed_Color_Resolver::resolve_dark( array() ),
		);
		foreach ( $maps as $mode => $map ) {
			foreach ( array( 'primary', 'action', 'neutral', 'success' ) as $family ) {
				$this->assertArrayHasKey( '--sf-color-' . $family . '--hover', $map, "$mode: $family must expose --hover" );
				$this->assertArrayHasKey( '--sf-color-' . $family . '--active', $map, "$mode: $family must expose --active" );
				$this->assertArrayNotHasKey( '--sf-color-' . $family . '-hover', $map, "$mode: $family must NOT expose single-dash -hover" );
				$this->assertArrayNotHasKey( '--sf-color-' . $family . '-active', $map, "$mode: $family must NOT expose single-dash -active" );
			}
		}
	}

	public function test_picker_only_tokens_are_resolved_in_both_modes() {
		// Regression guard: these tokens ship in the framework's variable picker
		// but are not produced by the per-family scale or the semantic passes.
		// Without them the Bricks colour dropdown rendered those rows swatch-less.
		$maps = array(
			'light' => Slashed_Color_Resolver::resolve( array() ),
			'dark'  => Slashed_Color_Resolver::resolve_dark( array() ),
		);
		$expected = array(
			// Per-family raw source tokens.
			'--sf-color-primary-source-light',
			'--sf-color-primary-source-dark',
			'--sf-color-action-source-light',
			'--sf-color-action-source-dark',
			'--sf-color-base-source-light',
			'--sf-color-base-source-dark',
			// Literals, caret alias, alt selection, subtle text.
			'--sf-color-white',
			'--sf-color-black',
			'--sf-color-caret',
			'--sf-color-selection-bg--alt',
			'--sf-color-selection-text--alt',
			'--sf-color-text--subtle',
		);
		foreach ( $maps as $mode => $map ) {
			foreach ( $expected as $key ) {
				$this->assertArrayHasKey( $key, $map, "$mode map must resolve $key" );
			}
		}
	}

	public function test_source_tokens_are_mode_independent_and_match_the_family_base() {
		// A -source-light / -source-dark token is an absolute input value, so it
		// reads the same in the light and dark maps; -source-light equals the
		// LIGHT family base and -source-dark equals the DARK family base.
		$light = Slashed_Color_Resolver::resolve( array() );
		$dark  = Slashed_Color_Resolver::resolve_dark( array() );

		// Cover EVERY family the resolver actually emits a source token for
		// (derived from the map so a newly-added family is covered automatically).
		$families = array();
		foreach ( array_keys( $light ) as $key ) {
			if ( preg_match( '/^--sf-color-(.+)-source-light$/', $key, $m ) ) {
				$families[] = $m[1];
			}
		}
		$this->assertNotEmpty( $families, 'resolver must emit per-family source tokens' );

		foreach ( $families as $family ) {
			$sl = '--sf-color-' . $family . '-source-light';
			$sd = '--sf-color-' . $family . '-source-dark';
			$this->assertArrayHasKey( $sd, $light, "$family must also expose -source-dark" );

			$this->assertSame( $light[ $sl ], $dark[ $sl ], "$family -source-light must be mode-independent" );
			$this->assertSame( $light[ $sd ], $dark[ $sd ], "$family -source-dark must be mode-independent" );

			$this->assertSame( $light[ '--sf-color-' . $family ], $light[ $sl ], "$family -source-light must equal the light family base" );
			$this->assertSame( $dark[ '--sf-color-' . $family ], $dark[ $sd ], "$family -source-dark must equal the dark family base" );
		}
	}

	public function test_caret_and_literals_resolve_as_expected() {
		$light = Slashed_Color_Resolver::resolve( array() );
		$this->assertSame( '#ffffff', $light['--sf-color-white'] );
		$this->assertSame( '#000000', $light['--sf-color-black'] );
		$this->assertSame( $light['--sf-color-action'], $light['--sf-color-caret'], 'caret aliases action' );
	}

	public function test_alt_selection_bg_uses_the_opposite_mode_formula() {
		// --sf-color-selection-bg--alt inverts the scheme of --sf-color-selection-bg
		// (see core/tokens.css), so it must NOT simply copy the same-mode value.
		$light = Slashed_Color_Resolver::resolve( array() );
		$dark  = Slashed_Color_Resolver::resolve_dark( array() );

		$this->assertArrayHasKey( '--sf-color-selection-bg--alt', $light );
		$this->assertArrayHasKey( '--sf-color-selection-bg--alt', $dark );
		$this->assertNotSame(
			$light['--sf-color-selection-bg'],
			$light['--sf-color-selection-bg--alt'],
			'alt selection must differ from the same-mode selection background'
		);

		// Exact-value guard: recompute the light-mode alt (the dark formula —
		// action dark-source clamped, 55% over white) from the public primitives.
		$dark_action = Slashed_Color_Math::parse_oklch( 'oklch(0.70 0.198 235)' ); // action -source-dark default
		list( $dl, $dc, $dh ) = $dark_action;
		$l        = max( 0.62, min( 0.93 - $dl * 0.4, 0.78 ) );
		$rgb      = Slashed_Color_Math::hex_to_rgb( Slashed_Color_Math::oklch_to_hex( $l, $dc, $dh ) );
		$expected = Slashed_Color_Math::rgb_to_hex( Slashed_Color_Math::mix_rgb( $rgb, array( 255, 255, 255 ), 0.55 ) );
		$this->assertSame( $expected, $light['--sf-color-selection-bg--alt'], 'light alt selection uses the dark formula over white' );
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
