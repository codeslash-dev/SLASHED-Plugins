<?php
/**
 * Pure sanitization helpers for SLASHED token submissions.
 *
 * Stateless: every public method takes inputs and returns outputs.
 * No DB access, no option reads — pure data transforms.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Token_Sanitizer
 */
class Slashed_Token_Sanitizer {

	/**
	 * Sanitize a single section's raw input map.
	 *
	 * Dispatches to sanitize_color_section() for the colors tab and falls
	 * back to a generic flat-map sanitizer for everything else.
	 *
	 * @param string $section Section slug (e.g. "colors", "typography").
	 * @param array  $data    Raw input.
	 * @return array Sanitized values keyed by token key.
	 */
	public static function sanitize_section( $section, $data ) {
		if ( ! is_array( $data ) ) {
			$data = array();
		}

		if ( 'colors' === $section ) {
			return self::sanitize_color_section( $data );
		}

		$sanitized = array();
		foreach ( $data as $key => $value ) {
			$key = sanitize_key( $key );
			if ( '' === $key ) {
				continue;
			}
			if ( is_array( $value ) ) {
				$sanitized[ $key ] = array_map(
					static function ( $v ) {
						return self::sanitize_css_value( sanitize_text_field( (string) $v ) );
					},
					$value
				);
			} else {
				$sanitized[ $key ] = self::sanitize_css_value( sanitize_text_field( (string) $value ) );
			}
		}
		return $sanitized;
	}

	/**
	 * Strip characters that could break out of a CSS declaration context.
	 *
	 * @param string $value Already text-sanitised value.
	 * @return string
	 */
	public static function sanitize_css_value( $value ) {
		return str_replace( array( '{', '}', '<', '>', '@', ';' ), '', (string) $value );
	}

	/**
	 * Detect 3/4/6/8-digit HEX color literals.
	 *
	 * @param mixed $value Stored color value.
	 * @return bool
	 */
	public static function is_hex_color( $value ) {
		return is_string( $value )
			&& 1 === preg_match( '/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', trim( $value ) );
	}

	/**
	 * Merge paired HEX/raw color inputs into a single stored value.
	 *
	 * @param array $data Raw form data for the colors section.
	 * @return array Sanitized colors keyed by base token name.
	 */
	private static function sanitize_color_section( array $data ) {
		$grouped = array();

		foreach ( $data as $key => $value ) {
			$key = (string) $key;
			if ( '' === $key || ! is_string( $value ) ) {
				continue;
			}

			$clean = trim( self::sanitize_css_value( sanitize_text_field( $value ) ) );

			if ( self::ends_with( $key, '_hex' ) ) {
				$base = sanitize_key( substr( $key, 0, -4 ) );
				if ( '' !== $base ) {
					$grouped[ $base ]['hex'] = $clean;
				}
			} elseif ( self::ends_with( $key, '_raw' ) ) {
				$base = sanitize_key( substr( $key, 0, -4 ) );
				if ( '' !== $base ) {
					$grouped[ $base ]['raw'] = $clean;
				}
			} else {
				$base = sanitize_key( $key );
				if ( '' !== $base ) {
					$grouped[ $base ]['direct'] = $clean;
				}
			}
		}

		$sanitized = array();
		foreach ( $grouped as $base => $parts ) {
			if ( ! empty( $parts['raw'] ) ) {
				$sanitized[ $base ] = $parts['raw'];
			} elseif ( ! empty( $parts['hex'] ) ) {
				$sanitized[ $base ] = $parts['hex'];
			} elseif ( isset( $parts['direct'] ) && '' !== $parts['direct'] ) {
				$sanitized[ $base ] = $parts['direct'];
			}
		}
		return $sanitized;
	}

	/**
	 * Polyfill for str_ends_with() — the plugin still supports PHP 7.4.
	 *
	 * @param string $haystack Subject string.
	 * @param string $needle   Suffix to test for.
	 * @return bool
	 */
	private static function ends_with( $haystack, $needle ) {
		$nl = strlen( $needle );
		if ( 0 === $nl ) {
			return true;
		}
		$hl = strlen( $haystack );
		if ( $hl < $nl ) {
			return false;
		}
		return substr( $haystack, -$nl ) === $needle;
	}
}
