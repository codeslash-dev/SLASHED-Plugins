<?php
/**
 * Single source of truth for SLASHED admin tabs.
 *
 * Two flavours of tabs:
 *   - "Token tabs"  — sections whose values live in `slashed_tokens`
 *     (colors, contrast, typography, spacing, radius, shadows, motion, zindex).
 *   - "View tabs"   — read-only inventory / documentation panels that exist
 *     only in the Svelte SPA and never touch the option.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Tab_Registry
 *
 * Stateless. Returning fresh arrays each call avoids accidental mutation.
 */
class Slashed_Tab_Registry {

	/**
	 * Tabs whose values are persisted to the tokens option.
	 *
	 * @return array<string,string> Slug → display label.
	 */
	public static function get_token_tabs() {
		return array(
			'colors'     => 'Colors',
			'typography' => 'Typography',
			'spacing'    => 'Spacing',
			'layouts'    => 'Layouts',
			'misc'       => 'Miscellaneous',
		);
	}

	/**
	 * Slugs of the sections that live inside the Miscellaneous tab.
	 *
	 * @return string[]
	 */
	public static function get_misc_sections() {
		return array( 'contrast', 'radius', 'shadows', 'motion', 'zindex' );
	}

	/**
	 * Read-only view tabs available only in the Svelte SPA.
	 *
	 * @return array<string,string> Slug → display label.
	 */
	public static function get_view_tabs() {
		return array(
			'variables'  => 'Variables',
			'classes'    => 'Classes',
			'bundle'     => 'Bundle',
			'export'     => 'Export / Import',
			'hooks'      => 'Hooks',
			'cheatsheet' => 'Cheatsheet',
			'wcag'       => 'WCAG',
		);
	}

	/**
	 * All tabs (token + view) in display order.
	 *
	 * @return array<string,string>
	 */
	public static function get_all() {
		return array_merge( self::get_token_tabs(), self::get_view_tabs() );
	}

	/**
	 * Whether a slug names any registered tab (token or view).
	 *
	 * @param string $slug Slug to test.
	 * @return bool
	 */
	public static function has( $slug ) {
		$all = self::get_all();
		return is_string( $slug ) && isset( $all[ $slug ] );
	}

	/**
	 * Slugs of the sections that are actually persisted to `slashed_tokens`
	 * and consumed by the CSS generator.
	 *
	 * This is the top-level token tabs minus the `misc` *grouping* tab (which
	 * has no settings of its own — its real, saveable children are the misc
	 * sections), plus those misc sections (contrast, radius, shadows, …).
	 *
	 * @return string[]
	 */
	public static function get_saveable_sections() {
		$tabs = self::get_token_tabs();
		unset( $tabs['misc'] ); // UI grouping only — never persisted as a section.
		return array_merge( array_keys( $tabs ), self::get_misc_sections() );
	}

	/**
	 * Whether a slug names a token tab (i.e. one that may be saved to the option).
	 *
	 * Returns false for the `misc` grouping tab itself — only its concrete
	 * child sections (and the other top-level sections) are saveable, so a
	 * `section=misc` write can never land as orphaned, never-emitted data.
	 *
	 * @param string $slug Slug to test.
	 * @return bool
	 */
	public static function is_token_tab( $slug ) {
		return is_string( $slug ) && in_array( $slug, self::get_saveable_sections(), true );
	}
}
