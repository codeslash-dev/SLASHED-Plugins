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
}
