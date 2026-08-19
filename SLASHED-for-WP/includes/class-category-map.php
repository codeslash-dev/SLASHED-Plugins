<?php
/**
 * Category map: display-order and first-segment-to-label data for grouping
 * --sf-* variables in the Bricks/Gutenberg admin UI.
 *
 * Pure display data with no resolution/caching logic of its own — split out
 * of Slashed_Inventory so that class stays focused on bundle resolution and
 * this one is just "how do we label and order variable categories?".
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Category_Map
 */
class Slashed_Category_Map {

	/**
	 * Display order for variable categories. Categories not in this list
	 * are appended after the canonical ones.
	 *
	 * @return string[]
	 */
	public static function order() {
		return array(
			'Colors',
			'Typography',
			'Spacing',
			'Sizing',
			'Layout',
			'Borders',
			'Radius',
			'Shadows',
			'Effects',
			'Motion',
			'Icons',
			'Z-Index',
			'States',
			'Focus',
			'Scroll',
			'Print',
			'Fallback/Legacy',
			'Misc',
		);
	}

	/**
	 * First-segment -> category-label mapping.
	 *
	 * @return array<string, string>
	 */
	private static function map() {
		return array(
			// Colors.
			'color'       => 'Colors',
			// Typography.
			'text'        => 'Typography',
			'font'        => 'Typography',
			'leading'     => 'Typography',
			'tracking'    => 'Typography',
			'body'        => 'Typography',
			'heading'     => 'Typography',
			'h1'          => 'Typography',
			'h2'          => 'Typography',
			'h3'          => 'Typography',
			'h4'          => 'Typography',
			'h5'          => 'Typography',
			'h6'          => 'Typography',
			'prose'       => 'Typography',
			'code'        => 'Typography',
			'optical'     => 'Typography',
			'line'        => 'Typography',
			// Spacing.
			'space'       => 'Spacing',
			'gap'         => 'Spacing',
			'gutter'      => 'Spacing',
			'component'   => 'Spacing',
			'section'     => 'Spacing',
			'flow'        => 'Spacing',
			'safe'        => 'Spacing',
			'header'      => 'Spacing',
			'sticky'      => 'Spacing',
			// Sizing.
			'size'        => 'Sizing',
			'aspect'      => 'Sizing',
			'ratio'       => 'Sizing',
			'touch'       => 'Sizing',
			// Layout.
			'container'   => 'Layout',
			'stack'       => 'Layout',
			'cluster'     => 'Layout',
			'sidebar'     => 'Layout',
			'switcher'    => 'Layout',
			'grid'        => 'Layout',
			'cover'       => 'Layout',
			'frame'       => 'Layout',
			'reel'        => 'Layout',
			'imposter'    => 'Layout',
			'bento'       => 'Layout',
			'box'         => 'Layout',
			'center'      => 'Layout',
			'content'     => 'Layout',
			'breakout'    => 'Layout',
			'divider'     => 'Layout',
			'field'       => 'Layout',
			'alternate'   => 'Layout',
			'equal'       => 'Layout',
			'col'         => 'Layout',
			// Sizing (media).
			'object'      => 'Sizing',
			// Borders.
			'border'      => 'Borders',
			'stroke'      => 'Borders',
			// Radius.
			'radius'      => 'Radius',
			// Shadows.
			'shadow'      => 'Shadows',
			// Effects.
			'blur'        => 'Effects',
			'opacity'     => 'Effects',
			'gradient'    => 'Effects',
			'mask'        => 'Effects',
			'perspective' => 'Effects',
			'drop'        => 'Effects',
			'contrast'    => 'Effects',
			// Motion.
			'duration'    => 'Motion',
			'ease'        => 'Motion',
			'transition'  => 'Motion',
			'motion'      => 'Motion',
			'animation'   => 'Motion',
			// Icons.
			'icon'        => 'Icons',
			// Z-Index.
			'z'           => 'Z-Index',
			// States.
			'is'          => 'States',
			'current'     => 'States',
			'state'       => 'States',
			// Focus.
			'focus'       => 'Focus',
			'caret'       => 'Focus',
			// Scroll.
			'scroll'      => 'Scroll',
			'scrollbar'   => 'Scroll',
			// Print.
			'print'       => 'Print',
			// Fallback/Legacy: HSL channel triplets (--sf-{name}-h/-s/-l)
			// backing core/tokens.color-fallbacks.css — only consumed by the
			// legacy hsl() fallback chain for browsers without light-dark() /
			// oklch(from …) support.
			'primary'     => 'Fallback/Legacy',
			'secondary'   => 'Fallback/Legacy',
			'tertiary'    => 'Fallback/Legacy',
			'action'      => 'Fallback/Legacy',
			'neutral'     => 'Fallback/Legacy',
			'base'        => 'Fallback/Legacy',
			'success'     => 'Fallback/Legacy',
			'warning'     => 'Fallback/Legacy',
			'error'       => 'Fallback/Legacy',
			'info'        => 'Fallback/Legacy',
			'danger'      => 'Fallback/Legacy',
			// Misc explicit assignments.
			'truncate'    => 'Misc',
		);
	}

	/**
	 * Look up the category label for a variable's first name segment.
	 *
	 * @param string $first_segment The first "--sf-{segment}-..." segment.
	 * @return string|null Category label, or null if unmapped.
	 */
	public static function label_for( $first_segment ) {
		$map = self::map();
		return isset( $map[ $first_segment ] ) ? $map[ $first_segment ] : null;
	}

	/**
	 * Semantic ordering rank for a token's trailing scale keyword.
	 *
	 * Design tokens use a t-shirt scale (2xs → 7xl) plus a handful of edge
	 * keywords (none, px, base, full, max). A plain alphabetical / natural
	 * sort renders these in the wrong visual order — e.g. Spacing comes out as
	 * 2xl, 2xs, 3xl, l, m, s, xl, xs — because "2xl" sorts before "2xs" and the
	 * single letters land wherever the alphabet puts them. This map assigns
	 * each keyword a rank so a comparator can restore the intended small→large
	 * progression (2xs, xs, s, m, l, xl, 2xl, 3xl …).
	 *
	 * Lower rank sorts earlier. Keywords absent from this map are treated as
	 * non-scale tokens by {@see compare()}.
	 *
	 * @return array<string, int>
	 */
	public static function scale_order() {
		return array(
			'none' => 0,
			'px'   => 1,
			'4xs'  => 10,
			'3xs'  => 11,
			'2xs'  => 12,
			'xs'   => 13,
			'sm'   => 14,
			's'    => 15,
			'base' => 16,
			'md'   => 17,
			'm'    => 18,
			'lg'   => 19,
			'l'    => 20,
			'xl'   => 21,
			'2xl'  => 22,
			'3xl'  => 23,
			'4xl'  => 24,
			'5xl'  => 25,
			'6xl'  => 26,
			'7xl'  => 27,
			'full' => 40,
			'max'  => 41,
		);
	}

	/**
	 * Compare two --sf-* variable names for semantic (scale-aware) ordering.
	 *
	 * Names are first grouped by their "base" (the name with any trailing
	 * scale keyword or numeric step removed), then, within a base, ordered by
	 * scale rank (see {@see scale_order()}) or numeric step. This keeps a
	 * family such as Spacing in small→large order (--sf-space-2xs, -xs, -s, -m,
	 * -l, -xl, -2xl …) and colour steps in numeric order (--sf-color-primary-50,
	 * -100, …, -950) instead of the lexicographic jumble a plain sort()
	 * produces. Non-scale tokens keep their natural, case-insensitive order.
	 *
	 * Suitable as the callback for usort().
	 *
	 * @param string $a First variable name (including leading "--").
	 * @param string $b Second variable name.
	 * @return int Negative, zero, or positive per the usort() contract.
	 */
	public static function compare( $a, $b ) {
		$pa = self::split_scale( (string) $a );
		$pb = self::split_scale( (string) $b );

		// Different families/bases: fall back to natural, case-insensitive
		// order so category members stay grouped the way they always were.
		$base_cmp = strnatcasecmp( $pa['base'], $pb['base'] );
		if ( 0 !== $base_cmp ) {
			return $base_cmp;
		}

		// Same base: order by semantic rank (scale keyword or numeric step).
		if ( $pa['rank'] !== $pb['rank'] ) {
			return ( $pa['rank'] < $pb['rank'] ) ? -1 : 1;
		}

		// Identical rank (e.g. two unrelated non-scale tokens): stable,
		// natural, case-insensitive tie-break on the full names.
		return strnatcasecmp( (string) $a, (string) $b );
	}

	/**
	 * Split a variable name into its scale "base" and a numeric ordering rank.
	 *
	 * The trailing "-{segment}" is inspected: a known scale keyword yields its
	 * {@see scale_order()} rank; a purely numeric segment yields that integer
	 * offset past the keyword band (so 50 < 100 < 950 and a bare base token
	 * still sorts before its numbered steps); anything else is treated as a
	 * non-scale token whose base is the full name and whose rank is 0.
	 *
	 * @param string $name Full variable name.
	 * @return array{base: string, rank: int}
	 */
	private static function split_scale( $name ) {
		$dash = strrpos( $name, '-' );
		if ( false === $dash || strlen( $name ) - 1 === $dash ) {
			return array(
				'base' => $name,
				'rank' => 0,
			);
		}

		$suffix = substr( $name, $dash + 1 );
		$base   = substr( $name, 0, $dash );

		$scale = self::scale_order();
		$key   = strtolower( $suffix );
		if ( isset( $scale[ $key ] ) ) {
			return array(
				'base' => $base,
				'rank' => $scale[ $key ],
			);
		}

		// Numeric step (colour scales: -50, -100, … -950). Offset past the
		// keyword-rank band so a bare base token still sorts before its steps.
		if ( '' !== $suffix && ctype_digit( $suffix ) ) {
			return array(
				'base' => $base,
				'rank' => 100 + (int) $suffix,
			);
		}

		// Non-scale token: keep the full name as its own base so unrelated
		// tokens simply fall back to natural ordering against each other.
		return array(
			'base' => $name,
			'rank' => 0,
		);
	}
}
