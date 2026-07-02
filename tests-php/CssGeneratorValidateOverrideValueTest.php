<?php
/**
 * Tests for Slashed_CSS_Generator::validate_override_value() — the single
 * gate the flat token-override map is emitted through. Covers each accepted
 * value type plus the is_css_safe()/balanced_parens() defence-in-depth
 * rejections that apply to all of them (see class doc comments).
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class CssGeneratorValidateOverrideValueTest extends TestCase {

	/**
	 * @dataProvider accepted_values
	 */
	public function test_accepts_valid_values( $value, $expected ) {
		$this->assertSame( $expected, Slashed_CSS_Generator::validate_override_value( $value ) );
	}

	public function accepted_values() {
		return array(
			'hex color'              => array( '#ff00aa', '#ff00aa' ),
			'hex color with alpha'   => array( '#ff00aa80', '#ff00aa80' ),
			'oklch function'         => array( 'oklch(0.6 0.15 250)', 'oklch(0.6 0.15 250)' ),
			'color-mix function'     => array( 'color-mix(in oklch, red, blue)', 'color-mix(in oklch, red, blue)' ),
			'named color keyword'    => array( 'rebeccapurple', 'rebeccapurple' ),
			'px dimension'           => array( '1.5px', '1.5px' ),
			'negative rem dimension' => array( '-0.5rem', '-0.5rem' ),
			'aspect ratio'           => array( '16 / 9', '16 / 9' ),
			'calc expression'        => array( 'calc(1rem + 2px)', 'calc(1rem + 2px)' ),
			'sizing keyword'         => array( 'min-content', 'min-content' ),
			'keyword easing'         => array( 'ease-in-out', 'ease-in-out' ),
			'cubic-bezier easing'    => array( 'cubic-bezier(0.25, 0, 0.15, 1)', 'cubic-bezier(0.25, 0, 0.15, 1)' ),
			'timeline range'         => array( 'entry 30%', 'entry 30%' ),
			'font family list'       => array( '"Inter", sans-serif', '"Inter", sans-serif' ),
			'var reference'          => array( 'var(--sf-color-brand)', 'var(--sf-color-brand)' ),
			'trims surrounding space' => array( '  1rem  ', '1rem' ),
		);
	}

	/**
	 * @dataProvider rejected_values
	 */
	public function test_rejects_unsafe_or_unrecognised_values( $value ) {
		$this->assertFalse( Slashed_CSS_Generator::validate_override_value( $value ) );
	}

	public function rejected_values() {
		return array(
			'empty string'                  => array( '' ),
			'brace injection'                => array( 'red; } html { color' ),
			'semicolon injection'            => array( 'red; background: url(evil)' ),
			'url() external fetch'           => array( 'url(https://evil.example/x.png)' ),
			'image-set() external fetch'     => array( 'image-set(url(x) 1x)' ),
			'at-rule injection'              => array( '@import url(evil.css)' ),
			'css comment injection'          => array( '1px/* } */' ),
			'html closing tag'               => array( '</style><script>' ),
			'backslash escape smuggling'     => array( '1px\\7d html{}' ),
			'control character'              => array( "1\x07px" ),
			'unbalanced closing paren'       => array( '1) ; } html{' ),
			'unbalanced opening paren'       => array( 'calc(1rem + 2px' ),
			'unrecognised keyword-like junk' => array( '!!!not-a-value!!!' ),
		);
	}
}
