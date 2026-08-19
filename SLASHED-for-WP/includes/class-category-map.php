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
	 * Semantic ordering rank for a t-shirt scale keyword.
	 *
	 * Design tokens size their variants on a t-shirt scale (4xs → 7xl, plus
	 * px). A plain alphabetical / natural sort renders these in the wrong
	 * visual order — e.g. Spacing comes out as 2xl, 2xs, 3xl, l, m, s, xl, xs —
	 * because "2xl" sorts before "2xs" and the single letters land wherever the
	 * alphabet puts them. This map assigns each size a rank so {@see compare()}
	 * can restore the intended small→large progression (2xs, xs, s, m, l, xl,
	 * 2xl, 3xl …).
	 *
	 * Only unambiguous *size* keywords live here. Words that a family or value
	 * can legitimately be named after — e.g. "base" (--sf-color-base) or "none"
	 * (--sf-duration-none) — are deliberately excluded so they keep their
	 * natural position beside the rest of their family rather than being
	 * misread as a size. Lower rank sorts earlier.
	 *
	 * @return array<string, int>
	 */
	public static function scale_order() {
		return array(
			'px'  => 1,
			'4xs' => 10,
			'3xs' => 11,
			'2xs' => 12,
			'xs'  => 13,
			'sm'  => 14,
			's'   => 15,
			'md'  => 16,
			'm'   => 17,
			'lg'  => 18,
			'l'   => 19,
			'xl'  => 20,
			'2xl' => 21,
			'3xl' => 22,
			'4xl' => 23,
			'5xl' => 24,
			'6xl' => 25,
			'7xl' => 26,
		);
	}

	/**
	 * Compare two --sf-* variable names for semantic (scale-aware) ordering.
	 *
	 * Names are compared segment by segment (splitting on "-"). At the first
	 * segment that differs, each side is classed as a scale size, a numeric
	 * step, or a plain word, and ordered so that sizes come first (by scale
	 * rank), then numeric steps (numerically), then plain words (natural,
	 * case-insensitive). When one name is a prefix of the other, the shorter
	 * one sorts first — this keeps a bare family token (--sf-color-base) right
	 * before its own steps (--sf-color-base-50 …).
	 *
	 * The result: scale families read small→large (--sf-space-2xs, -xs, -s, -m,
	 * -l, -xl, -2xl …) and colour steps stay numeric (--sf-color-primary-50,
	 * -100, …, -950), while every other token — including families whose name
	 * merely contains a size-like word — keeps the natural, contiguous order it
	 * had before. Comparing per-segment (rather than stripping a trailing
	 * "suffix") is what guarantees a consistent, transitive ordering suitable
	 * for usort().
	 *
	 * @param string $a First variable name (including leading "--").
	 * @param string $b Second variable name.
	 * @return int Negative, zero, or positive per the usort() contract.
	 */
	public static function compare( $a, $b ) {
		$sa  = explode( '-', (string) $a );
		$sb  = explode( '-', (string) $b );
		$len = min( count( $sa ), count( $sb ) );

		for ( $i = 0; $i < $len; $i++ ) {
			$cmp = self::compare_segment( $sa[ $i ], $sb[ $i ] );
			if ( 0 !== $cmp ) {
				return $cmp;
			}
		}

		// Every shared segment matched: the shorter name is a prefix of the
		// longer one (bare family token vs its numbered steps) and sorts first.
		return count( $sa ) <=> count( $sb );
	}

	/**
	 * Compare a single "-"-delimited segment of two variable names.
	 *
	 * Segments are classed as scale size (0), numeric step (1) or plain word
	 * (2); a lower class sorts first so a family's sized/numbered members stay
	 * ahead of its alpha variants. Within the same class, sizes and numbers
	 * compare by value and plain words by natural, case-insensitive order.
	 *
	 * @param string $a First segment.
	 * @param string $b Second segment.
	 * @return int Negative, zero, or positive.
	 */
	private static function compare_segment( $a, $b ) {
		$ka = self::segment_key( $a );
		$kb = self::segment_key( $b );

		if ( $ka[0] !== $kb[0] ) {
			return $ka[0] <=> $kb[0];
		}

		// Plain words: natural, case-insensitive. Sizes / numbers: by value.
		if ( 2 === $ka[0] ) {
			return strnatcasecmp( (string) $ka[1], (string) $kb[1] );
		}
		return $ka[1] <=> $kb[1];
	}

	/**
	 * Classify a segment for ordering: [ class, value ].
	 *
	 * Class 0 = scale size (value is its {@see scale_order()} rank), class 1 =
	 * numeric step (value is the integer), class 2 = plain word (value is the
	 * original string, compared naturally).
	 *
	 * @param string $segment A single "-"-delimited segment.
	 * @return array{0: int, 1: int|string}
	 */
	private static function segment_key( $segment ) {
		$scale = self::scale_order();
		$key   = strtolower( $segment );
		if ( isset( $scale[ $key ] ) ) {
			return array( 0, $scale[ $key ] );
		}
		if ( '' !== $segment && ctype_digit( $segment ) ) {
			return array( 1, (int) $segment );
		}
		return array( 2, $segment );
	}
}
