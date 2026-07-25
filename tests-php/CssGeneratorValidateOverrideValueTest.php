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
			'brand gradient formula' => array(
				'linear-gradient(in oklch 135deg, var(--sf-color-secondary), oklch(from var(--sf-color-secondary) calc(l - 0.08) c h))',
				'linear-gradient(in oklch 135deg, var(--sf-color-secondary), oklch(from var(--sf-color-secondary) calc(l - 0.08) c h))',
			),
			'gradient with hex stops' => array(
				'linear-gradient(in oklch 90deg, #ff00aa, #00ffaa)',
				'linear-gradient(in oklch 90deg, #ff00aa, #00ffaa)',
			),
			'directional fade gradient' => array(
				'linear-gradient(in oklch to right, transparent, var(--sf-color-bg))',
				'linear-gradient(in oklch to right, transparent, var(--sf-color-bg))',
			),
			'radial gradient'        => array( 'radial-gradient(circle, red, blue)', 'radial-gradient(circle, red, blue)' ),
			'conic gradient'         => array( 'conic-gradient(from 45deg, red, blue)', 'conic-gradient(from 45deg, red, blue)' ),
			'repeating gradient'     => array( 'repeating-linear-gradient(45deg, red 0 10px, blue 10px 20px)', 'repeating-linear-gradient(45deg, red 0 10px, blue 10px 20px)' ),
			'box shadow'             => array(
				'0 2px 4px 0 oklch(from var(--sf-shadow-color) l c h / clamp(0, calc(var(--sf-shadow-strength) * 2), 0.7))',
				'0 2px 4px 0 oklch(from var(--sf-shadow-color) l c h / clamp(0, calc(var(--sf-shadow-strength) * 2), 0.7))',
			),
			'inset box shadow'       => array( 'inset 0 2px 4px 0 rgb(0 0 0 / 0.1)', 'inset 0 2px 4px 0 rgb(0 0 0 / 0.1)' ),
			'text shadow'            => array( '0 1px 3px oklch(0 0 0 / 0.6)', '0 1px 3px oklch(0 0 0 / 0.6)' ),
			'drop-shadow filter'     => array( 'drop-shadow(0 4px 6px oklch(0 0 0 / 0.3))', 'drop-shadow(0 4px 6px oklch(0 0 0 / 0.3))' ),
			'filter chain'           => array( 'blur(4px) brightness(1.2)', 'blur(4px) brightness(1.2)' ),
			'transition shorthand'   => array(
				'color var(--sf-duration-normal) var(--sf-ease-out), background-color var(--sf-duration-normal) var(--sf-ease-out)',
				'color var(--sf-duration-normal) var(--sf-ease-out), background-color var(--sf-duration-normal) var(--sf-ease-out)',
			),
			'animation shorthand'    => array(
				'sf-blink calc(1s * var(--sf-motion-scale)) steps(1, end) infinite',
				'sf-blink calc(1s * var(--sf-motion-scale)) steps(1, end) infinite',
			),
			'two-value position'     => array( '50% 50%', '50% 50%' ),
			'env() inset'            => array( 'env(safe-area-inset-top, 0px)', 'env(safe-area-inset-top, 0px)' ),
			'relative colour math'   => array(
				'oklch(from var(--sf-color-action) max(l, calc(l + 0.1)) c h)',
				'oklch(from var(--sf-color-action) max(l, calc(l + 0.1)) c h)',
			),
			'quoted content marker'  => array( '" *"', '" *"' ),
			'quoted unicode escape'  => array( '" \2197"', '" \2197"' ),
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
			'gradient with url() stop'       => array( 'linear-gradient(red, url(https://evil.example/x.png))' ),
			'gradient with important'        => array( 'linear-gradient(red, blue) !important' ),
			'gradient with extra declaration' => array( 'linear-gradient(red, blue); color: red' ),
			'gradient with quoted content'   => array( 'linear-gradient(red, "blue")' ),
			'over-long gradient'             => array( 'linear-gradient(' . str_repeat( 'red, ', 250 ) . 'blue)' ),
			'not-a-gradient function'        => array( 'evil-gradient(red, blue)' ),
			'shadow with important'          => array( '0 2px 4px oklch(0 0 0 / 0.4) !important' ),
			'shadow with url() colour'       => array( '0 0 0 url(https://evil.example/x)' ),
			'filter with url()'              => array( 'drop-shadow(url(evil))' ),
			'position with extra declaration' => array( '50% 50%; background: red' ),
			'composite with stray angle bracket' => array( 'a < b' ),
			'quoted string with markup'      => array( '"</style><script>alert(1)</script>"' ),
			'unterminated double quote'      => array( '"Inter' ),
			'unterminated single quote'      => array( "'Inter" ),
			'composite over part cap'        => array( '1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1% 1%' ),
			'over-length bare keyword'       => array( str_repeat( 'a', 1100 ) ),
		);
	}
}
