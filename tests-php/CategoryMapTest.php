<?php
/**
 * Tests for Slashed_Category_Map — the pure first-segment → category-label
 * lookup and the display-order list that group --sf-* variables in the admin
 * UI. No WordPress runtime (see class doc comment).
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class CategoryMapTest extends TestCase {

	/**
	 * @dataProvider known_segments
	 */
	public function test_label_for_maps_known_first_segments( $segment, $expected ) {
		$this->assertSame( $expected, Slashed_Category_Map::label_for( $segment ) );
	}

	public function known_segments() {
		return array(
			'color -> Colors'          => array( 'color', 'Colors' ),
			'font -> Typography'       => array( 'font', 'Typography' ),
			'space -> Spacing'         => array( 'space', 'Spacing' ),
			'size -> Sizing'           => array( 'size', 'Sizing' ),
			'container -> Layout'      => array( 'container', 'Layout' ),
			'border -> Borders'        => array( 'border', 'Borders' ),
			'radius -> Radius'         => array( 'radius', 'Radius' ),
			'shadow -> Shadows'        => array( 'shadow', 'Shadows' ),
			'duration -> Motion'       => array( 'duration', 'Motion' ),
			'z -> Z-Index'             => array( 'z', 'Z-Index' ),
			'primary -> Fallback'      => array( 'primary', 'Fallback/Legacy' ),
			'truncate -> Misc'         => array( 'truncate', 'Misc' ),
		);
	}

	/**
	 * @dataProvider unmapped_segments
	 */
	public function test_label_for_returns_null_for_unmapped_input( $segment ) {
		$this->assertNull( Slashed_Category_Map::label_for( $segment ) );
	}

	public function unmapped_segments() {
		return array(
			'unknown token'   => array( 'wibble' ),
			'empty string'    => array( '' ),
			'case sensitive'  => array( 'Color' ),   // map keys are lowercase.
			'partial match'   => array( 'colo' ),
			'trailing hyphen' => array( 'color-' ),
		);
	}

	public function test_order_lists_canonical_categories_without_duplicates() {
		$order = Slashed_Category_Map::order();

		$this->assertContains( 'Colors', $order );
		$this->assertContains( 'Misc', $order );
		$this->assertContains( 'Fallback/Legacy', $order );
		$this->assertSame( array_values( array_unique( $order ) ), $order, 'order() must not contain duplicate categories' );
	}

	public function test_every_mapped_label_appears_in_the_order_list() {
		// A label a variable can be assigned to but that isn't in order() would
		// sort inconsistently in the UI — guard the two lists against drift.
		$order = Slashed_Category_Map::order();
		foreach ( $this->known_segments() as $case ) {
			$this->assertContains( $case[1], $order, "label '{$case[1]}' is produced by label_for() but missing from order()" );
		}
	}

	/**
	 * The t-shirt scale (2xs → 3xl) must read small→large after sorting with
	 * compare(), not in the lexicographic jumble a plain sort() produced
	 * (2xl, 2xs, 3xl, l, m, s, xl, xs). This is the core of issue #232.
	 */
	public function test_compare_orders_tshirt_scale_small_to_large() {
		$input = array(
			'--sf-space-2xl',
			'--sf-space-2xs',
			'--sf-space-3xl',
			'--sf-space-l',
			'--sf-space-m',
			'--sf-space-s',
			'--sf-space-xl',
			'--sf-space-xs',
		);
		usort( $input, array( 'Slashed_Category_Map', 'compare' ) );

		$this->assertSame(
			array(
				'--sf-space-2xs',
				'--sf-space-xs',
				'--sf-space-s',
				'--sf-space-m',
				'--sf-space-l',
				'--sf-space-xl',
				'--sf-space-2xl',
				'--sf-space-3xl',
			),
			$input
		);
	}

	/**
	 * Edge keywords (none, px, base) slot into the scale, and non-scale config
	 * tokens (ratio, scale) sort after the scale members of the family.
	 */
	public function test_compare_places_edge_keywords_and_non_scale_tokens() {
		$input = array(
			'--sf-space-scale',
			'--sf-space-m',
			'--sf-space-none',
			'--sf-space-px',
			'--sf-space-xs',
			'--sf-space-ratio',
		);
		usort( $input, array( 'Slashed_Category_Map', 'compare' ) );

		$this->assertSame(
			array(
				// none → px → xs → m are the scale members (base "--sf-space").
				'--sf-space-none',
				'--sf-space-px',
				'--sf-space-xs',
				'--sf-space-m',
				// Non-scale config tokens keep natural order, after the scale.
				'--sf-space-ratio',
				'--sf-space-scale',
			),
			$input
		);
	}

	/**
	 * Numeric colour steps must order numerically (50 < 100 < 950), with the
	 * bare family token ahead of its numbered steps.
	 */
	public function test_compare_orders_numeric_colour_steps_numerically() {
		$input = array(
			'--sf-color-primary-100',
			'--sf-color-primary-50',
			'--sf-color-primary-950',
			'--sf-color-primary',
			'--sf-color-primary-500',
		);
		usort( $input, array( 'Slashed_Category_Map', 'compare' ) );

		$this->assertSame(
			array(
				'--sf-color-primary',
				'--sf-color-primary-50',
				'--sf-color-primary-100',
				'--sf-color-primary-500',
				'--sf-color-primary-950',
			),
			$input
		);
	}

	/**
	 * Distinct families must stay grouped together (not interleaved) so the
	 * category list still reads one family at a time.
	 */
	public function test_compare_keeps_distinct_families_grouped() {
		$input = array(
			'--sf-size-xl',
			'--sf-space-s',
			'--sf-size-s',
			'--sf-space-xl',
		);
		usort( $input, array( 'Slashed_Category_Map', 'compare' ) );

		$this->assertSame(
			array(
				'--sf-size-s',
				'--sf-size-xl',
				'--sf-space-s',
				'--sf-space-xl',
			),
			$input
		);
	}

	public function test_scale_order_is_monotonic_across_the_tshirt_scale() {
		$scale    = Slashed_Category_Map::scale_order();
		$sequence = array( '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl' );
		$prev     = -1;
		foreach ( $sequence as $key ) {
			$this->assertArrayHasKey( $key, $scale );
			$this->assertGreaterThan( $prev, $scale[ $key ], "scale rank for '{$key}' must increase along the scale" );
			$prev = $scale[ $key ];
		}
	}
}
