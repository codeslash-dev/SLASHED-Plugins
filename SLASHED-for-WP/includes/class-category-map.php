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
}
