<?php
/**
 * Golden-value regression tests for Slashed_Color_Math — the dependency-free
 * OKLCH ⇄ hex color-space math that powers PHP-side swatch previews.
 *
 * The same conversion also exists in JS (the vendored OklchColorDesk /
 * WcagPanel components drive the interactive picker). These are hand-maintained
 * parallel implementations with no build-time link, so they can silently
 * diverge — a preview swatch computed in PHP would then stop matching the
 * colour the picker shows. These golden values lock the PHP output so any
 * future change to the conversion math is caught here rather than shipping as a
 * silent visual drift. If the framework's canonical algorithm intentionally
 * changes, update these constants deliberately (and mirror the change in JS).
 *
 * Pure math, no WordPress runtime — see class doc comment.
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class ColorMathTest extends TestCase {

	/**
	 * @return array<string, array{0: float, 1: float, 2: float, 3: string}>
	 */
	public function oklch_to_hex_cases() {
		return array(
			// [ L, C, H, expected hex ]
			'blue (primary source)' => array( 0.45, 0.20, 264.0, '#1745c2' ),
			'green'                 => array( 0.70, 0.15, 145.0, '#5bb661' ),
			'warm red'              => array( 0.60, 0.12, 29.0, '#bd6255' ),
			'achromatic grey'       => array( 0.50, 0.0, 0.0, '#636363' ),
			'pale yellow'           => array( 0.90, 0.05, 90.0, '#ebddb9' ),
			'deep violet'           => array( 0.20, 0.10, 300.0, '#1e023b' ),
		);
	}

	/**
	 * @dataProvider oklch_to_hex_cases
	 */
	public function test_oklch_to_hex_matches_golden( $l, $c, $h, $expected ) {
		$this->assertSame( $expected, Slashed_Color_Math::oklch_to_hex( $l, $c, $h ) );
	}

	public function test_parse_oklch_reads_components() {
		$this->assertSame( array( 0.45, 0.2, 264.0 ), Slashed_Color_Math::parse_oklch( 'oklch(0.45 0.2 264)' ) );
		$this->assertSame( array( 0.45, 0.2, 264.0 ), Slashed_Color_Math::parse_oklch( 'oklch(0.45 0.2 264deg)' ) );
	}

	public function test_parse_oklch_rejects_garbage() {
		$this->assertNull( Slashed_Color_Math::parse_oklch( 'rgb(1,2,3)' ) );
		$this->assertNull( Slashed_Color_Math::parse_oklch( 'not a color' ) );
	}

	public function test_hex_to_oklch_matches_golden() {
		$oklch = Slashed_Color_Math::hex_to_oklch( '#3b82f6' );
		$this->assertNotNull( $oklch );
		// Tolerance keeps the assertion stable against last-decimal float noise
		// while still pinning the conversion to the current algorithm.
		$this->assertEqualsWithDelta( 0.6231, $oklch[0], 0.0005 );
		$this->assertEqualsWithDelta( 0.1880, $oklch[1], 0.0005 );
		$this->assertEqualsWithDelta( 259.8145, $oklch[2], 0.001 );
	}

	public function test_hex_to_oklch_rejects_non_hex() {
		$this->assertNull( Slashed_Color_Math::hex_to_oklch( 'oklch(0.5 0.1 200)' ) );
		$this->assertNull( Slashed_Color_Math::hex_to_oklch( 'nope' ) );
	}

	/**
	 * hex → oklch → hex must return the original colour (the two directions are
	 * inverse transforms). Guards against a matrix/gamma change breaking one
	 * direction without the other.
	 *
	 * @dataProvider round_trip_cases
	 */
	public function test_hex_oklch_round_trip( $hex ) {
		$oklch = Slashed_Color_Math::hex_to_oklch( $hex );
		$this->assertNotNull( $oklch );
		$this->assertSame( $hex, Slashed_Color_Math::oklch_to_hex( $oklch[0], $oklch[1], $oklch[2] ) );
	}

	/**
	 * @return array<string, array{0: string}>
	 */
	public function round_trip_cases() {
		return array(
			'brand blue' => array( '#3b82f6' ),
			'black'      => array( '#000000' ),
			'white'      => array( '#ffffff' ),
			'mid grey'   => array( '#808080' ),
			'orange'     => array( '#ff8800' ),
		);
	}
}
