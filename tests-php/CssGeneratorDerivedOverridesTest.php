<?php
/**
 * Tests for Slashed_CSS_Generator's derived-override computation — the
 * scale-knob expansion that turns a single --sf-*-scale value into the full
 * set of concrete output tokens (radius/border/motion) emitted before the
 * user's explicit overrides.
 *
 * compute_derived_overrides() and fmt_num() are pure (no WordPress runtime)
 * private static helpers; they are exercised here through reflection so the
 * production class keeps its narrow public surface. See the class doc comment
 * for why the derivation exists.
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class CssGeneratorDerivedOverridesTest extends TestCase {

	/**
	 * @param array $overrides
	 * @return array
	 */
	private function derive( array $overrides ) {
		$m = new ReflectionMethod( 'Slashed_CSS_Generator', 'compute_derived_overrides' );
		$m->setAccessible( true );
		return $m->invoke( null, $overrides );
	}

	private function fmt( $num ) {
		$m = new ReflectionMethod( 'Slashed_CSS_Generator', 'fmt_num' );
		$m->setAccessible( true );
		return $m->invoke( null, $num );
	}

	public function test_no_scale_knobs_derive_nothing() {
		$this->assertSame( array(), $this->derive( array() ) );
		$this->assertSame( array(), $this->derive( array( '--sf-color-primary' => '#fff' ) ) );
	}

	public function test_radius_scale_expands_the_full_radius_ramp() {
		$d = $this->derive( array( '--sf-radius-scale' => 2 ) );

		$this->assertSame( '2px', $d['--sf-radius-2xs'] );   // 1 * 2
		$this->assertSame( '16px', $d['--sf-radius-m'] );    // 8 * 2
		$this->assertSame( '96px', $d['--sf-radius-4xl'] );  // 48 * 2
		// Fixed sentinels that don't scale.
		$this->assertSame( '0', $d['--sf-radius-none'] );
		$this->assertSame( '9999px', $d['--sf-radius-full'] );
		$this->assertSame( 'var(--sf-radius-full)', $d['--sf-radius-pill'] );
		$this->assertSame( 'calc(var(--sf-radius-m) + var(--sf-component-pad))', $d['--sf-radius-outer'] );
	}

	public function test_border_scale_expands_the_width_ramp() {
		$d = $this->derive( array( '--sf-border-scale' => 3 ) );

		$this->assertSame( '3px', $d['--sf-border-width-1'] );
		$this->assertSame( '12px', $d['--sf-border-width-4'] );
	}

	public function test_motion_scale_expands_durations_and_animation_delays() {
		$d = $this->derive( array( '--sf-motion-scale' => 2 ) );

		$this->assertSame( '200ms', $d['--sf-duration-instant'] );  // 100 * 2
		$this->assertSame( '1200ms', $d['--sf-duration-slower'] );  // 600 * 2
		$this->assertSame( '0ms', $d['--sf-duration-none'] );
		$this->assertSame( '600ms', $d['--sf-theme-transition-duration'] ); // 300 * 2
		$this->assertSame( '150ms', $d['--sf-animation-delay-1'] );  // 75 * 1 * 2
		$this->assertSame( '750ms', $d['--sf-animation-delay-5'] );  // 75 * 5 * 2
	}

	public function test_fractional_scale_keeps_significant_decimals() {
		$d = $this->derive( array( '--sf-radius-scale' => 1.5 ) );

		$this->assertSame( '1.5px', $d['--sf-radius-2xs'] ); // 1 * 1.5
		$this->assertSame( '12px', $d['--sf-radius-m'] );    // 8 * 1.5 -> trailing zeros trimmed
	}

	/**
	 * A non-numeric scale value (including an injection-shaped string) is
	 * rejected by the is_numeric() guard, so nothing is derived — the malformed
	 * value can never reach fmt_num()/the emitter.
	 *
	 * @dataProvider non_numeric_scales
	 */
	public function test_non_numeric_scale_is_ignored( $value ) {
		$this->assertSame( array(), $this->derive( array( '--sf-radius-scale' => $value ) ) );
	}

	public function non_numeric_scales() {
		return array(
			'injection'   => array( '2; } html{' ),
			'empty'       => array( '' ),
			'word'        => array( 'large' ),
			'array'       => array( array( 2 ) ),
			'null'        => array( null ),
		);
	}

	/**
	 * fmt_num() trims trailing zeros and normalises signed/zero results to a
	 * bare '0' so no token is ever emitted as '0.000000' or '-0'.
	 *
	 * @dataProvider fmt_cases
	 */
	public function test_fmt_num_formats_numbers( $in, $expected ) {
		$this->assertSame( $expected, $this->fmt( $in ) );
	}

	public function fmt_cases() {
		return array(
			'integer'        => array( 2, '2' ),
			'one decimal'    => array( 1.5, '1.5' ),
			'zero'           => array( 0, '0' ),
			'negative zero'  => array( -0.0, '0' ),
			'small fraction' => array( 0.1, '0.1' ),
		);
	}
}
