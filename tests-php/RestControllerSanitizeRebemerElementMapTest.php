<?php
/**
 * Tests for Slashed_REST_Controller::sanitize_rebemer_element_map().
 *
 * The only WordPress dependency this method has is sanitize_key(), stubbed
 * in bootstrap.php with its documented behaviour.
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class RestControllerSanitizeRebemerElementMapTest extends TestCase {

	public function test_non_array_input_returns_empty_array() {
		$this->assertSame( array(), Slashed_REST_Controller::sanitize_rebemer_element_map( 'not-an-array' ) );
		$this->assertSame( array(), Slashed_REST_Controller::sanitize_rebemer_element_map( null ) );
	}

	public function test_keeps_valid_string_pairs_and_normalizes_type_key() {
		// sanitize_key() lowercases and strips anything outside [a-z0-9_-] —
		// including spaces, which are removed rather than turned into hyphens.
		$result = Slashed_REST_Controller::sanitize_rebemer_element_map(
			array(
				'Container Element' => 'wrapper',
				'text-basic'         => 'heading',
			)
		);

		$this->assertSame(
			array(
				'containerelement' => 'wrapper',
				'text-basic'       => 'heading',
			),
			$result
		);
	}

	public function test_lowercases_and_trims_the_value() {
		$result = Slashed_REST_Controller::sanitize_rebemer_element_map( array( 'section' => '  Card  ' ) );

		$this->assertSame( array( 'section' => 'card' ), $result );
	}

	public function test_drops_non_string_entries() {
		$result = Slashed_REST_Controller::sanitize_rebemer_element_map(
			array(
				'section' => 42,
				0         => 'name',
				'valid'   => 'ok',
			)
		);

		$this->assertSame( array( 'valid' => 'ok' ), $result );
	}

	public function test_drops_entries_that_normalize_to_an_empty_key_or_value() {
		$result = Slashed_REST_Controller::sanitize_rebemer_element_map(
			array(
				'!!!' => 'ok',
				'key' => '   ',
			)
		);

		$this->assertSame( array(), $result );
	}

	/**
	 * @dataProvider reserved_names
	 */
	public function test_drops_reserved_bem_names( $reserved ) {
		$result = Slashed_REST_Controller::sanitize_rebemer_element_map( array( 'section' => $reserved ) );

		$this->assertSame( array(), $result );
	}

	public function reserved_names() {
		return array(
			array( 'auto' ),
			array( 'inherit' ),
			array( 'initial' ),
			array( 'unset' ),
			array( 'revert' ),
			array( 'revert-layer' ),
			array( 'none' ),
		);
	}

	/**
	 * @dataProvider invalid_bem_names
	 */
	public function test_drops_names_that_fail_the_bem_grammar( $invalid ) {
		$result = Slashed_REST_Controller::sanitize_rebemer_element_map( array( 'section' => $invalid ) );

		$this->assertSame( array(), $result );
	}

	public function invalid_bem_names() {
		return array(
			'leading digit'    => array( '1card' ),
			'leading hyphen'   => array( '-card' ),
			'double hyphen'    => array( 'card--title' ),
			'trailing hyphen'  => array( 'card-' ),
			'underscore'       => array( 'card_title' ),
		);
	}

	public function test_uppercase_value_is_lowercased_before_grammar_check_and_kept() {
		// Values go through strtolower() before the BEM regex runs, so "Card"
		// normalizes to the well-formed "card" rather than being dropped.
		$result = Slashed_REST_Controller::sanitize_rebemer_element_map( array( 'section' => 'Card' ) );

		$this->assertSame( array( 'section' => 'card' ), $result );
	}

	public function test_caps_the_entry_count_at_rebemer_map_cap() {
		$raw = array();
		for ( $i = 0; $i < Slashed_REST_Controller::REBEMER_MAP_CAP + 50; $i++ ) {
			$raw[ 'type-' . $i ] = 'name-' . $i;
		}

		$result = Slashed_REST_Controller::sanitize_rebemer_element_map( $raw );

		$this->assertCount( Slashed_REST_Controller::REBEMER_MAP_CAP, $result );
	}
}
