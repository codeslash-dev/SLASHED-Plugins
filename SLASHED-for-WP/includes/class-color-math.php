<?php
/**
 * Color math: generic OKLCH/OKLab/sRGB conversion and mixing primitives.
 *
 * Dependency-free color-space math with no knowledge of SLASHED's --sf-color-*
 * token vocabulary — split out of Slashed_Color_Resolver so the two concerns
 * (generic color math vs. SLASHED-specific semantic-token resolution) can be
 * read, tested, and changed independently.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Color_Math
 */
class Slashed_Color_Math {

	/**
	 * Parse an oklch() string into L, C, H components.
	 *
	 * Handles formats like:
	 *   oklch(0.45 0.20 264)
	 *   oklch(0.45 0.20 264deg)
	 *
	 * @param string $str The oklch() function string.
	 * @return array{0:float, 1:float, 2:float}|null [L, C, H] or null on failure.
	 */
	public static function parse_oklch( $str ) {
		$str = trim( $str );
		if ( ! preg_match( '/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:deg)?\s*\)/i', $str, $m ) ) {
			return null;
		}
		return array( (float) $m[1], (float) $m[2], (float) $m[3] );
	}

	/**
	 * Convert oklch values to a hex color string.
	 *
	 * Conversion path: oklch -> OKLab -> LMS -> linear sRGB -> sRGB -> hex.
	 *
	 * @param float $l Lightness (0-1).
	 * @param float $c Chroma (0-0.4+).
	 * @param float $h Hue in degrees (0-360).
	 * @return string Hex color string (#rrggbb).
	 */
	public static function oklch_to_hex( $l, $c, $h ) {
		// Convert to OKLab.
		$h_rad = $h * M_PI / 180.0;
		$ok_a  = $c * cos( $h_rad );
		$ok_b  = $c * sin( $h_rad );

		// OKLab -> LMS (cube roots).
		$l_ = $l + 0.3963377774 * $ok_a + 0.2158037573 * $ok_b;
		$m_ = $l - 0.1055613458 * $ok_a - 0.0638541728 * $ok_b;
		$s_ = $l - 0.0894841775 * $ok_a - 1.2914855480 * $ok_b;

		// Cube to get LMS.
		$lms_l = $l_ * $l_ * $l_;
		$lms_m = $m_ * $m_ * $m_;
		$lms_s = $s_ * $s_ * $s_;

		// LMS -> linear sRGB.
		$r_lin = +4.0767416621 * $lms_l - 3.3077115913 * $lms_m + 0.2309699292 * $lms_s;
		$g_lin = -1.2684380046 * $lms_l + 2.6097574011 * $lms_m - 0.3413193965 * $lms_s;
		$b_lin = -0.0041960863 * $lms_l - 0.7034186147 * $lms_m + 1.7076147010 * $lms_s;

		// Linear sRGB -> sRGB (gamma correction).
		$r = self::linear_to_srgb( $r_lin );
		$g = self::linear_to_srgb( $g_lin );
		$b = self::linear_to_srgb( $b_lin );

		// Clamp and convert to 0-255.
		$r = (int) round( max( 0.0, min( 1.0, $r ) ) * 255 );
		$g = (int) round( max( 0.0, min( 1.0, $g ) ) * 255 );
		$b = (int) round( max( 0.0, min( 1.0, $b ) ) * 255 );

		return sprintf( '#%02x%02x%02x', $r, $g, $b );
	}

	/**
	 * Apply sRGB gamma transfer function (linear to sRGB).
	 *
	 * @param float $c Linear channel value.
	 * @return float sRGB channel value (0-1 range, may exceed before clamping).
	 */
	public static function linear_to_srgb( $c ) {
		if ( $c <= 0.0031308 ) {
			return 12.92 * $c;
		}
		return 1.055 * pow( $c, 1.0 / 2.4 ) - 0.055;
	}

	/**
	 * Apply inverse sRGB gamma transfer function (sRGB to linear).
	 *
	 * @param float $c sRGB channel value (0-1).
	 * @return float Linear channel value.
	 */
	public static function srgb_to_linear( $c ) {
		if ( $c <= 0.04045 ) {
			return $c / 12.92;
		}
		return pow( ( $c + 0.055 ) / 1.055, 2.4 );
	}

	/**
	 * Cube root that handles negative values.
	 *
	 * The intermediate LMS space used in this OKLab formulation can produce
	 * negative values for saturated colors, so a sign-preserving cube root
	 * is required.
	 *
	 * @param float $x Value to take cube root of.
	 * @return float Cube root of x.
	 */
	public static function safe_cbrt( $x ) {
		if ( $x >= 0 ) {
			return pow( $x, 1.0 / 3.0 );
		}
		return -pow( -$x, 1.0 / 3.0 );
	}

	/**
	 * Convert a hex color string to oklch values.
	 *
	 * Conversion path: hex -> RGB -> linear sRGB -> LMS -> OKLab -> OKLch.
	 * Uses the standard OKLab M1/M2 matrices for accurate round-trip conversion.
	 *
	 * @param string $str The value to parse (expected hex like #rrggbb or #rgb).
	 * @return array{0:float, 1:float, 2:float}|null [L, C, H] or null on failure.
	 */
	public static function hex_to_oklch( $str ) {
		$str = trim( $str );
		if ( ! preg_match( '/^#([0-9a-fA-F]{3,8})$/', $str ) ) {
			return null;
		}

		$hex = ltrim( $str, '#' );
		$len = strlen( $hex );

		// Expand shorthand (#rgb -> #rrggbb, #rgba -> #rrggbbaa).
		if ( 3 === $len || 4 === $len ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		} elseif ( 6 !== $len && 8 !== $len ) {
			return null;
		}

		// Extract RGB (ignore alpha channel if present).
		$r = (int) hexdec( substr( $hex, 0, 2 ) );
		$g = (int) hexdec( substr( $hex, 2, 2 ) );
		$b = (int) hexdec( substr( $hex, 4, 2 ) );

		// RGB 0-255 -> sRGB 0-1.
		$sr = $r / 255.0;
		$sg = $g / 255.0;
		$sb = $b / 255.0;

		// sRGB -> linear RGB.
		$lr = self::srgb_to_linear( $sr );
		$lg = self::srgb_to_linear( $sg );
		$lb = self::srgb_to_linear( $sb );

		// Linear sRGB -> LMS (standard OKLab M1 matrix).
		$lms_l = 0.4122214708 * $lr + 0.5363325363 * $lg + 0.0514459929 * $lb;
		$lms_m = 0.2119034982 * $lr + 0.6806995451 * $lg + 0.1073969566 * $lb;
		$lms_s = 0.0883024619 * $lr + 0.2817188376 * $lg + 0.6299787005 * $lb;

		// LMS -> cube root (LMS_). Sign-preserving for negative intermediate values.
		$l_ = self::safe_cbrt( $lms_l );
		$m_ = self::safe_cbrt( $lms_m );
		$s_ = self::safe_cbrt( $lms_s );

		// LMS_ -> OKLab (standard OKLab M2 matrix).
		$ok_l = 0.2104542553 * $l_ + 0.7936177850 * $m_ - 0.0040720468 * $s_;
		$ok_a = 1.9779984951 * $l_ - 2.4285922050 * $m_ + 0.4505937099 * $s_;
		$ok_b = 0.0259040371 * $l_ + 0.7827717662 * $m_ - 0.8086757660 * $s_;

		// OKLab -> OKLch.
		$c = sqrt( $ok_a * $ok_a + $ok_b * $ok_b );
		$h = atan2( $ok_b, $ok_a ) * 180.0 / M_PI;

		// Normalize hue to 0-360.
		if ( $h < 0 ) {
			$h += 360.0;
		}

		return array( $ok_l, $c, $h );
	}

	/**
	 * Mix two RGB colors at a given ratio via linear interpolation in sRGB gamma space.
	 *
	 * This is a simplified approximation of CSS color-mix(in oklab, ...) behaviour,
	 * suitable for generating swatch preview hex values. The percentage represents
	 * how much of colorA is in the result.
	 *
	 * @param array $rgb_a First color [r, g, b] (0-255).
	 * @param array $rgb_b Second color [r, g, b] (0-255).
	 * @param float $pct   Percentage of first color (0.0 to 1.0).
	 * @return array [r, g, b] (0-255).
	 */
	public static function mix_rgb( $rgb_a, $rgb_b, $pct ) {
		$r = (int) round( $rgb_a[0] * $pct + $rgb_b[0] * ( 1.0 - $pct ) );
		$g = (int) round( $rgb_a[1] * $pct + $rgb_b[1] * ( 1.0 - $pct ) );
		$b = (int) round( $rgb_a[2] * $pct + $rgb_b[2] * ( 1.0 - $pct ) );

		return array(
			max( 0, min( 255, $r ) ),
			max( 0, min( 255, $g ) ),
			max( 0, min( 255, $b ) ),
		);
	}

	/**
	 * Convert a hex color string to RGB array.
	 *
	 * @param string $hex Hex color (#rrggbb).
	 * @return array [r, g, b] (0-255).
	 */
	public static function hex_to_rgb( $hex ) {
		$hex = ltrim( $hex, '#' );
		return array(
			(int) hexdec( substr( $hex, 0, 2 ) ),
			(int) hexdec( substr( $hex, 2, 2 ) ),
			(int) hexdec( substr( $hex, 4, 2 ) ),
		);
	}

	/**
	 * Convert an RGB array to hex string.
	 *
	 * @param array $rgb [r, g, b] (0-255).
	 * @return string Hex color (#rrggbb).
	 */
	public static function rgb_to_hex( $rgb ) {
		return sprintf( '#%02x%02x%02x', $rgb[0], $rgb[1], $rgb[2] );
	}
}
