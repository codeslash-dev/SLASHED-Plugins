<?php
/**
 * End-to-end emission tests for Slashed_CSS_Generator — the store → validate →
 * emit path that turns saved overrides into the @layer slashed.overrides CSS
 * served on the front end.
 *
 * Previously uncoverable without WordPress (reads the option store, calls
 * apply_filters); the in-memory stubs in bootstrap.php make it testable. These
 * complement the pure validate_override_value() unit tests by proving the
 * re-validation the emitter performs at emission time actually drops unsafe or
 * badly-named stored values before they reach the page.
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class CssGeneratorEmissionTest extends TestCase {

	protected function setUp(): void {
		slashed_test_reset_state();
	}

	public function test_no_overrides_emit_nothing() {
		$this->assertFalse( Slashed_CSS_Generator::has_overrides() );
		$this->assertSame( '', Slashed_CSS_Generator::get_override_css() );
	}

	public function test_a_valid_override_is_wrapped_in_the_overrides_layer() {
		Slashed_Token_Store::update_overrides( array( '--sf-color-primary' => '#ff0000' ) );

		$this->assertTrue( Slashed_CSS_Generator::has_overrides() );
		$this->assertSame(
			"@layer slashed.overrides {\n\t:root {\n\t\t--sf-color-primary: #ff0000;\n\t}\n}",
			Slashed_CSS_Generator::get_override_css()
		);
	}

	public function test_emitter_re_validates_and_drops_unsafe_or_misnamed_stored_values() {
		// Simulates data written before value/name hardening (or by any other
		// writer of the option): only the safe, correctly-named entry survives.
		Slashed_Token_Store::update_overrides(
			array(
				'--sf-color-primary' => '#ff0000', // kept
				'--sf-bad'           => '}evil',   // dropped: unsafe value
				'not-a-var'          => '#00ff00', // dropped: fails the --sf- name gate
			)
		);

		$css = Slashed_CSS_Generator::get_override_css();
		$this->assertStringContainsString( '--sf-color-primary: #ff0000;', $css );
		$this->assertStringNotContainsString( 'evil', $css );
		$this->assertStringNotContainsString( '00ff00', $css );
	}

	public function test_has_overrides_is_false_when_every_stored_value_is_unsafe() {
		// has_overrides() must agree with the emitter: a stored value the emitter
		// would drop cannot make has_overrides() report true.
		Slashed_Token_Store::update_overrides( array( '--sf-bad' => '}evil' ) );

		$this->assertFalse( Slashed_CSS_Generator::has_overrides() );
		$this->assertSame( '', Slashed_CSS_Generator::get_override_css() );
	}

	public function test_scale_knob_expands_to_derived_tokens_in_the_emitted_css() {
		Slashed_Token_Store::update_overrides( array( '--sf-radius-scale' => '2' ) );

		$css = Slashed_CSS_Generator::get_override_css();
		$this->assertStringContainsString( '--sf-radius-m: 16px;', $css );   // 8 * 2, derived
		$this->assertStringContainsString( '--sf-radius-full: 9999px;', $css );
	}

	public function test_explicit_token_wins_over_the_derived_scale_value() {
		// A fine-tuned concrete token must override what the scale knob derives.
		Slashed_Token_Store::update_overrides(
			array(
				'--sf-radius-scale' => '2',      // would derive --sf-radius-m: 16px
				'--sf-radius-m'     => '5px',    // explicit override wins
			)
		);

		$css = Slashed_CSS_Generator::get_override_css();
		$this->assertStringContainsString( '--sf-radius-m: 5px;', $css );
		$this->assertStringNotContainsString( '--sf-radius-m: 16px;', $css );
	}
}
