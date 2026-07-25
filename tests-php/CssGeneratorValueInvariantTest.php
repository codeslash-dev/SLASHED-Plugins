<?php
/**
 * Property test for Slashed_CSS_Generator::validate_override_value().
 *
 * The example-based suite in CssGeneratorValidateOverrideValueTest pins the
 * values we thought of. This one pins the invariant instead: whatever the
 * validator accepts is emitted verbatim into
 * `@layer slashed.overrides { :root { --name: VALUE; } }` inside an inline
 * <style>, so no accepted value may be able to terminate the declaration, the
 * rule, or the style element.
 *
 * Inputs are assembled from an adversarial alphabet (CSS delimiters, comment
 * markers, quotes, backslashes, angle brackets, `url(`, `!important`) with a
 * fixed seed, so a failure is reproducible rather than flaky.
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class CssGeneratorValueInvariantTest extends TestCase {

	/** Deterministic seed — a failure here reproduces exactly. */
	const SEED = 1337;

	/** Iterations. Kept small enough to stay a unit test (~10ms). */
	const ITERATIONS = 2000;

	private function alphabet() {
		return array_merge(
			str_split( "abc019 .,%()/#*+-\";{}@\\<>!:\t\n" ),
			array( "'", 'url(', '/*', '*/', '</', 'oklch(', 'var(--x)', '!important', 'linear-gradient(', 'drop-shadow(', 'inset', '0px' )
		);
	}

	/**
	 * A fully quoted value is a single CSS string token: the tokenizer consumes
	 * it to the matching quote and does not re-tokenize the contents, so `/*`,
	 * `(`, `!` and `url(` inside it are ordinary characters with no syntactic
	 * force. Only what could end the string, the declaration, the rule or the
	 * <style> element is forbidden there.
	 *
	 * @param string $value Accepted value, including its surrounding quotes.
	 * @return string Violation reason, or '' when the value is safe.
	 */
	private function quoted_violation( $value ) {
		$body = substr( $value, 1, -1 );
		if ( preg_match( '/[;{}@<>]/', $body ) ) {
			return 'delimiter or markup inside string';
		}
		if ( preg_match( '/["\']/', $body ) ) {
			return 'inner quote would terminate the string';
		}
		if ( preg_match( '/[\x00-\x1F\x7F]/', $value ) ) {
			return 'control character';
		}
		if ( preg_match( '/\\\\(?![0-9a-fA-F]{1,6}\s?)/', $body ) ) {
			return 'backslash that is not a unicode escape';
		}
		return '';
	}

	/**
	 * Everything else is emitted as unquoted CSS, where comment markers,
	 * parentheses, `!important` and url() all carry syntactic force.
	 *
	 * @param string $value Accepted value.
	 * @return string Violation reason, or '' when the value is safe.
	 */
	private function unquoted_violation( $value ) {
		if ( preg_match( '/[;{}@]/', $value ) ) {
			return 'declaration or rule delimiter';
		}
		if ( preg_match( '#url\s*\(|image-set\s*\(#i', $value ) ) {
			return 'external fetch function';
		}
		if ( false !== strpos( $value, '/*' ) || false !== strpos( $value, '*/' ) ) {
			return 'comment marker';
		}
		if ( false !== strpos( $value, '<' ) || false !== strpos( $value, '>' ) ) {
			return 'angle bracket could close the style element';
		}
		if ( false !== strpos( $value, '!' ) ) {
			return 'bang could smuggle !important';
		}
		if ( preg_match( '/[\x00-\x1F\x7F]/', $value ) ) {
			return 'control character';
		}
		if ( false !== strpos( $value, '\\' ) ) {
			return 'backslash escape outside a string';
		}
		if ( 0 !== substr_count( $value, '"' ) % 2 || 0 !== substr_count( $value, "'" ) % 2 ) {
			return 'unbalanced quote would swallow later declarations';
		}
		$depth = 0;
		$len   = strlen( $value );
		for ( $i = 0; $i < $len; $i++ ) {
			if ( '(' === $value[ $i ] ) {
				++$depth;
			} elseif ( ')' === $value[ $i ] ) {
				--$depth;
				if ( $depth < 0 ) {
					return 'parenthesis closes below zero';
				}
			}
		}
		if ( 0 !== $depth ) {
			return 'unbalanced parentheses';
		}
		return '';
	}

	public function test_no_accepted_value_can_break_out_of_its_declaration() {
		mt_srand( self::SEED );
		$alphabet = $this->alphabet();
		$max      = count( $alphabet ) - 1;
		$accepted = 0;

		for ( $i = 0; $i < self::ITERATIONS; $i++ ) {
			$input = '';
			$len   = mt_rand( 1, 12 );
			for ( $j = 0; $j < $len; $j++ ) {
				$input .= $alphabet[ mt_rand( 0, $max ) ];
			}

			$value = Slashed_CSS_Generator::validate_override_value( $input );
			if ( false === $value ) {
				continue;
			}
			++$accepted;

			$is_quoted = strlen( $value ) >= 2
				&& ( ( '"' === $value[0] && '"' === substr( $value, -1 ) )
					|| ( "'" === $value[0] && "'" === substr( $value, -1 ) ) );

			$violation = $is_quoted ? $this->quoted_violation( $value ) : $this->unquoted_violation( $value );

			$this->assertSame(
				'',
				$violation,
				sprintf( 'validate_override_value(%s) returned %s — %s', var_export( $input, true ), var_export( $value, true ), $violation )
			);
		}

		// Guard against the property passing vacuously: if a future change made
		// the validator reject everything, the loop above would assert nothing.
		$this->assertGreaterThan( 20, $accepted, 'Fuzz accepted too few values to be a meaningful check.' );
	}
}
