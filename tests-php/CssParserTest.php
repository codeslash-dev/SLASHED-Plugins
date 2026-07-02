<?php
/**
 * Tests for Slashed_CSS_Parser::parse() — pure CSS-string-to-inventory
 * extraction, no WordPress dependency (see class doc comment).
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class CssParserTest extends TestCase {

	public function test_empty_input_returns_empty_inventory() {
		$this->assertSame( Slashed_CSS_Parser::empty_inventory(), Slashed_CSS_Parser::parse( '' ) );
		$this->assertSame( Slashed_CSS_Parser::empty_inventory(), Slashed_CSS_Parser::parse( null ) );
	}

	public function test_extracts_declared_variables_only() {
		$css = <<<'CSS'
		:root {
			--sf-color-primary: oklch(0.6 0.15 250);
			--sf-space-m: 1rem;
		}
		/* see --sf-color-* for the full palette */
		.thing { color: var(--sf-color-primary); }
		CSS;

		$result = Slashed_CSS_Parser::parse( $css );

		$this->assertSame( array( '--sf-color-primary', '--sf-space-m' ), $result['variables'] );
	}

	public function test_extracts_property_registrations() {
		$css   = '@property --sf-color-accent-light { syntax: "<color>"; inherits: true; initial-value: oklch(0.7 0.1 200); }';
		$result = Slashed_CSS_Parser::parse( $css );

		$this->assertSame( array( '--sf-color-accent-light' ), $result['variables'] );
	}

	public function test_extracts_sf_and_is_classes_separately() {
		$css   = '.sf-stack-2 { } .sf-stack-10 { } .is-current { } .not-tracked { }';
		$result = Slashed_CSS_Parser::parse( $css );

		$this->assertSame( array( 'sf-stack-2', 'sf-stack-10' ), $result['sf_classes'] );
		$this->assertSame( array( 'is-current' ), $result['is_classes'] );
	}

	public function test_class_names_natural_sort_orders_numeric_suffixes_correctly() {
		$css   = '.sf-space-10 {} .sf-space-2 {} .sf-space-1 {}';
		$result = Slashed_CSS_Parser::parse( $css );

		$this->assertSame( array( 'sf-space-1', 'sf-space-2', 'sf-space-10' ), $result['sf_classes'] );
	}

	public function test_extracts_color_variable_values_from_declarations() {
		$css   = '--sf-color-brand: oklch(0.5 0.2 30);';
		$result = Slashed_CSS_Parser::parse( $css );

		$this->assertSame( array( '--sf-color-brand' => 'oklch(0.5 0.2 30)' ), $result['color_values'] );
	}

	public function test_property_initial_value_wins_over_later_regular_declaration() {
		$css = '@property --sf-color-x { initial-value: oklch(0.1 0 0); } --sf-color-x: red;';

		$result = Slashed_CSS_Parser::parse( $css );

		$this->assertSame( 'oklch(0.1 0 0)', $result['color_values']['--sf-color-x'] );
	}
}
