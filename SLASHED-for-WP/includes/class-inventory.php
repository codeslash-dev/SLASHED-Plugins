<?php
/**
 * Inventory provider: resolves the active SLASHED CSS bundle, parses it,
 * caches the result, and exposes categorized lookups for the Variables,
 * Classes, and Colors registration classes.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Inventory
 *
 * Single source of truth for "what tokens and classes does the framework
 * actually ship?" - so the Bricks UI registry can match the loaded CSS
 * exactly, regardless of which bundle (essential / optimal / full) or
 * release version is active.
 *
 * Resolution order:
 *   1. Local CSS file (repo symlink mode or copy-installed mode) -
 *      cheapest, parsed and cached by file mtime.
 *   2. Remote CSS URL (CDN) - fetched via wp_remote_get, cached for a day.
 *   3. Built-in hardcoded fallback - keeps the plugin functional offline
 *      and on hosts that block outbound HTTP.
 *
 * Public API:
 *   - get_variables()        sorted unique --sf-* names
 *   - get_variables_by_category() map<category-label, names[]>
 *   - get_sf_classes()       sorted unique .sf-* names
 *   - get_is_classes()       sorted unique .is-* names
 *   - get_color_variables()  every --sf-color-* token
 */
class Slashed_Inventory {

	/**
	 * Transient TTL for remote-fetched bundles.
	 */
	const TRANSIENT_TTL = DAY_IN_SECONDS;

	/**
	 * Per-request caches, keyed by concrete class name (static::class) so each
	 * subclass (the Bricks or Gutenberg inventory) keeps its resolved data
	 * separate from the shared base and from sibling subclasses.
	 *
	 * @var array<string, array>
	 */
	private static $cache = array();
	private static $hex_map_cache = array();
	private static $hex_map_dark_cache = array();

	// ---------------------------------------------------------------
	// Overridable per-integration configuration.
	//
	// The shared base resolves against the unified plugin's CSS loader and the
	// SLASHED_* constants. Integration subclasses override these to preserve
	// their own filter namespaces, version strings, and standalone paths.
	// ---------------------------------------------------------------

	/**
	 * Transient cache key prefix (unique per integration).
	 *
	 * @return string
	 */
	protected static function transient_prefix() {
		return 'slashed_inv_';
	}

	/**
	 * Version string mixed into transient keys / user-agent for cache-busting.
	 *
	 * @return string
	 */
	protected static function inv_version() {
		return defined( 'SLASHED_VERSION' ) ? SLASHED_VERSION : '0';
	}

	/**
	 * Filter namespace, e.g. "slashed" => the slashed/inventory filter.
	 *
	 * @return string
	 */
	protected static function filter_slug() {
		return 'slashed';
	}

	/**
	 * Resolve the active CSS bundle URL for this integration.
	 *
	 * @return string
	 */
	protected static function resolve_css_url() {
		return class_exists( 'Slashed_CSS_Loader' ) ? Slashed_CSS_Loader::get_url() : '';
	}

	/**
	 * URL => path base pairs used to map a plugin-served CSS URL back to disk.
	 *
	 * @return array<int, array{0:string,1:string}>
	 */
	protected static function url_path_pairs() {
		$pairs = array();
		if ( defined( 'SLASHED_URL' ) && defined( 'SLASHED_PATH' ) ) {
			$pairs[] = array( SLASHED_URL, SLASHED_PATH );
		}
		if ( defined( 'SLASHED_BRICKS_URL' ) && defined( 'SLASHED_BRICKS_PATH' ) ) {
			$pairs[] = array( SLASHED_BRICKS_URL, SLASHED_BRICKS_PATH );
		}
		if ( defined( 'SLASHED_GUTENBERG_URL' ) && defined( 'SLASHED_GUTENBERG_PATH' ) ) {
			$pairs[] = array( SLASHED_GUTENBERG_URL, SLASHED_GUTENBERG_PATH );
		}
		return $pairs;
	}

	/**
	 * Absolute path to a bundled inventory.json fallback, or '' if none exists.
	 *
	 * @return string
	 */
	protected static function fallback_json_path() {
		$candidates = array();
		if ( defined( 'SLASHED_PATH' ) ) {
			$candidates[] = SLASHED_PATH . 'data/inventory.json';
		}
		if ( defined( 'SLASHED_BRICKS_PATH' ) ) {
			$candidates[] = SLASHED_BRICKS_PATH . 'data/inventory.json';
		}
		foreach ( $candidates as $candidate ) {
			if ( file_exists( $candidate ) ) {
				return $candidate;
			}
		}
		return '';
	}

	/**
	 * Get the full inventory, resolving and caching on first access.
	 *
	 * @return array{variables: string[], sf_classes: string[], is_classes: string[]}
	 */
	public static function get() {
		if ( isset( self::$cache[ static::class ] ) ) {
			return self::$cache[ static::class ];
		}

		// Prime the cache with the resolved inventory BEFORE applying the
		// filter. A filter callback is allowed to query inventory data via
		// the public Slashed_Inventory::get_*() helpers; without a
		// pre-primed cache that re-entry would call resolve() recursively
		// and never terminate. With the cache primed, recursive get() calls
		// short-circuit on the first line above.
		self::$cache[ static::class ] = self::sanitize_inventory( self::resolve() );

		/**
		 * Filter the resolved inventory before it's used to register
		 * variables, classes, and colors with Bricks.
		 *
		 * Filter callbacks may safely call Slashed_Inventory::get_*()
		 * - the cache is primed before this filter fires, so re-entrant
		 * calls are bounded by the per-request cache instead of re-running
		 * resolve().
		 *
		 * @param array $inventory ['variables', 'sf_classes', 'is_classes'].
		 */
		self::$cache[ static::class ] = self::sanitize_inventory(
			apply_filters( static::filter_slug() . '/inventory', self::$cache[ static::class ] )
		);

		return self::$cache[ static::class ];
	}

	/**
	 * Normalise an inventory array to the canonical shape.
	 *
	 * Defensive coercion for arbitrary inputs: filter callbacks may
	 * legitimately want to extend, prune, or replace inventory entries,
	 * but they could also return null, a partial array, or non-string
	 * entries. This normaliser guarantees the consumers downstream
	 * (Variables / Classes / Colors registration) always see the same
	 * shape: three keys, sorted unique string lists plus color_values map.
	 *
	 * @param mixed $inventory Possibly malformed inventory data.
	 * @return array{variables: string[], sf_classes: string[], is_classes: string[], color_values: array}
	 */
	private static function sanitize_inventory( $inventory ) {
		$base = Slashed_CSS_Parser::empty_inventory();
		if ( ! is_array( $inventory ) ) {
			return $base;
		}
		foreach ( array_keys( $base ) as $key ) {
			// color_values is an associative map, not a sortable list.
			if ( 'color_values' === $key ) {
				$raw_map = isset( $inventory[ $key ] ) && is_array( $inventory[ $key ] )
					? $inventory[ $key ]
					: array();
				$normalized = array();
				foreach ( $raw_map as $name => $value ) {
					if ( ! is_string( $name ) || ! is_scalar( $value ) ) {
						continue;
					}
					$normalized[ $name ] = trim( (string) $value );
				}
				$base[ $key ] = $normalized;
				continue;
			}
			$list = isset( $inventory[ $key ] ) && is_array( $inventory[ $key ] )
				? array_filter( $inventory[ $key ], 'is_string' )
				: array();
			$list = array_values( array_unique( $list ) );
			// Natural sort so numeric suffixes order as humans expect:
			// -50, -100, -200, ..., -500, ... rather than lexicographic.
			sort( $list, SORT_NATURAL | SORT_FLAG_CASE );
			$base[ $key ] = $list;
		}
		return $base;
	}

	/**
	 * Reset the per-request cache. Mostly useful for tests.
	 */
	public static function flush() {
		unset(
			self::$cache[ static::class ],
			self::$hex_map_cache[ static::class ],
			self::$hex_map_dark_cache[ static::class ]
		);
	}

	/**
	 * Get the resolved hex color map for all --sf-color-* variables.
	 *
	 * @return array<string, string> Map of variable name to hex string.
	 */
	public static function get_color_hex_map() {
		if ( isset( self::$hex_map_cache[ static::class ] ) ) {
			return self::$hex_map_cache[ static::class ];
		}

		$inv = self::get();

		$color_values = $inv['color_values'] ?? array();

		// Merge admin-saved color overrides so palette swatches reflect
		// customized colors instead of always showing framework defaults.
		$admin_overrides = self::get_admin_color_overrides();
		if ( ! empty( $admin_overrides ) ) {
			$color_values = array_merge( $color_values, $admin_overrides );
		}

		self::$hex_map_cache[ static::class ] = Slashed_Color_Resolver::resolve( $color_values );

		return self::$hex_map_cache[ static::class ];
	}

	/**
	 * Get the resolved DARK-mode hex color map for all --sf-color-* variables.
	 *
	 * Companion to get_color_hex_map(); used by the editor Color System panel
	 * to preview every token's dark variant alongside its light value.
	 *
	 * @return array<string, string> Map of variable name to hex string.
	 */
	public static function get_color_hex_map_dark() {
		if ( isset( self::$hex_map_dark_cache[ static::class ] ) ) {
			return self::$hex_map_dark_cache[ static::class ];
		}

		$inv = self::get();

		$color_values = $inv['color_values'] ?? array();

		// Merge admin-saved color overrides so dark previews track the same
		// customized -light source tokens the light map uses.
		$admin_overrides = self::get_admin_color_overrides();
		if ( ! empty( $admin_overrides ) ) {
			$color_values = array_merge( $color_values, $admin_overrides );
		}

		self::$hex_map_dark_cache[ static::class ] = Slashed_Color_Resolver::resolve_dark( $color_values );

		return self::$hex_map_dark_cache[ static::class ];
	}

	/**
	 * Read admin-saved color overrides and map them to CSS variable names.
	 *
	 * Mirrors the mapping logic in Slashed_CSS_Generator::generate_color_declarations():
	 *   - brand_primary       -> --sf-color-primary-light
	 *   - status_success      -> --sf-color-success-light
	 *   - brand_dark_primary  -> --sf-color-primary-dark   (when dark overrides on)
	 *   - status_dark_success -> --sf-color-success-dark   (when dark overrides on)
	 *
	 * Both the `-light` source and any explicit `-dark` override are returned
	 * so the light AND dark hex maps stay in sync with what the generated CSS
	 * actually emits — the dark resolver honours `-dark` over auto-derivation.
	 *
	 * @return array<string, string> Map of CSS variable name to color value.
	 */
	private static function get_admin_color_overrides() {
		if ( ! class_exists( 'Slashed_Token_Store' ) ) {
			return array();
		}
		$tokens = Slashed_Token_Store::get_settings();

		if ( empty( $tokens['colors'] ) || ! is_array( $tokens['colors'] ) ) {
			return array();
		}

		$settings = $tokens['colors'];
		$overrides = array();

		// Brand families: 'base' is the source token (--sf-color-base-light);
		// 'surface' is a derived alias with no -light source, so it's excluded.
		// Must stay in sync with Slashed_CSS_Generator::generate_color_declarations().
		$brand_colors  = array( 'primary', 'secondary', 'tertiary', 'action', 'neutral', 'base' );
		$status_colors = array( 'success', 'warning', 'error', 'info', 'danger' );

		// Light source tokens: brand_primary -> --sf-color-primary-light.
		foreach ( $brand_colors as $color ) {
			$key = 'brand_' . $color;
			if ( ! empty( $settings[ $key ] ) && is_string( $settings[ $key ] ) ) {
				$overrides[ '--sf-color-' . $color . '-light' ] = $settings[ $key ];
			}
		}
		foreach ( $status_colors as $color ) {
			$key = 'status_' . $color;
			if ( ! empty( $settings[ $key ] ) && is_string( $settings[ $key ] ) ) {
				$overrides[ '--sf-color-' . $color . '-light' ] = $settings[ $key ];
			}
		}

		// Explicit dark overrides — gated by the same flag the CSS generator
		// uses, so the preview matches the emitted CSS. When the flag is off,
		// dark stays auto-derived from the light source (no -dark keys emitted).
		$dark_enabled = ! isset( $settings['dark_overrides_enabled'] )
			|| '0' !== $settings['dark_overrides_enabled'];

		if ( $dark_enabled ) {
			foreach ( $brand_colors as $color ) {
				$key = 'brand_dark_' . $color;
				if ( ! empty( $settings[ $key ] ) && is_string( $settings[ $key ] ) ) {
					$overrides[ '--sf-color-' . $color . '-dark' ] = $settings[ $key ];
				}
			}
			foreach ( $status_colors as $color ) {
				$key = 'status_dark_' . $color;
				if ( ! empty( $settings[ $key ] ) && is_string( $settings[ $key ] ) ) {
					$overrides[ '--sf-color-' . $color . '-dark' ] = $settings[ $key ];
				}
			}
		}

		return $overrides;
	}

	/**
	 * Get the flat list of all declared --sf-* variables.
	 *
	 * @return string[]
	 */
	public static function get_variables() {
		$inv = self::get();
		return $inv['variables'];
	}

	/**
	 * Get only --sf-color-* variables.
	 *
	 * @return string[]
	 */
	public static function get_color_variables() {
		// Tokens excluded because they hold non-colour string values despite
		// carrying the --sf-color- namespace prefix.
		static $excluded = array( '--sf-color-scheme' );

		$vars = self::get_variables();
		return array_values(
			array_filter(
				$vars,
				static function ( $v ) use ( $excluded ) {
					return 0 === strpos( $v, '--sf-color-' ) && ! in_array( $v, $excluded, true );
				}
			)
		);
	}

	/**
	 * Get .sf-* class names declared in the bundle.
	 *
	 * @return string[]
	 */
	public static function get_sf_classes() {
		$inv = self::get();
		return $inv['sf_classes'];
	}

	/**
	 * Get .is-* class names declared in the bundle.
	 *
	 * @return string[]
	 */
	public static function get_is_classes() {
		$inv = self::get();
		return $inv['is_classes'];
	}

	/**
	 * Get variables grouped by category label.
	 *
	 * Categories appear in canonical display order. Empty categories are
	 * dropped. Names within each category are sorted.
	 *
	 * @return array<string, string[]>
	 */
	public static function get_variables_by_category() {
		$grouped = array();
		foreach ( self::get_variables() as $var ) {
			$cat = self::categorize_variable( $var );
			if ( ! isset( $grouped[ $cat ] ) ) {
				$grouped[ $cat ] = array();
			}
			$grouped[ $cat ][] = $var;
		}

		$ordered = array();
		foreach ( self::category_order() as $cat ) {
			if ( ! empty( $grouped[ $cat ] ) ) {
				sort( $grouped[ $cat ], SORT_NATURAL | SORT_FLAG_CASE );
				$ordered[ $cat ] = $grouped[ $cat ];
			}
		}

		// Append any uncategorized buckets at the end (defensive).
		foreach ( $grouped as $cat => $list ) {
			if ( ! isset( $ordered[ $cat ] ) ) {
				sort( $list, SORT_NATURAL | SORT_FLAG_CASE );
				$ordered[ $cat ] = $list;
			}
		}

		return $ordered;
	}

	/**
	 * Categorize a CSS variable based on its name.
	 *
	 * Matches against the first segment after "--sf-" (e.g. "color",
	 * "space", "duration"). Falls back to "Misc" for unknown families.
	 *
	 * @param string $name Full variable name including leading "--".
	 * @return string Category label (without the "SLASHED " prefix).
	 */
	public static function categorize_variable( $name ) {
		$key = $name;
		if ( 0 === strpos( $key, '--sf-' ) ) {
			$key = substr( $key, 5 );
		}

		$dash  = strpos( $key, '-' );
		$first = false === $dash ? $key : substr( $key, 0, $dash );

		$map = self::category_map();
		return isset( $map[ $first ] ) ? $map[ $first ] : 'Misc';
	}

	/**
	 * Display order for variable categories. Categories not in this list
	 * are appended after the canonical ones.
	 *
	 * @return string[]
	 */
	public static function category_order() {
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
	 * First-segment -> category-label mapping. Drives categorize_variable().
	 *
	 * @return array<string, string>
	 */
	private static function category_map() {
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

	// ---------------------------------------------------------------
	// Resolution.
	// ---------------------------------------------------------------

	/**
	 * Resolve the active CSS bundle into a parsed inventory.
	 *
	 * @return array{variables: string[], sf_classes: string[], is_classes: string[]}
	 */
	private static function resolve() {
		// 1. Local file - cheapest, also handles offline development.
		$local_path = self::find_local_bundle_path();
		if ( '' !== $local_path ) {
			$inventory = self::parse_path_with_cache( $local_path );
			if ( ! empty( $inventory['variables'] ) ) {
				return $inventory;
			}
		}

		// 2. Remote URL (CDN). Cached as a transient.
		$url = static::resolve_css_url();

		if ( '' !== $url && self::is_remote_url( $url ) ) {
			$inventory = self::parse_url_with_cache( $url );
			if ( ! empty( $inventory['variables'] ) ) {
				return $inventory;
			}
		}

		// 3. Built-in fallback - keeps the plugin functional even when
		//    no CSS is reachable (hosts blocking outbound HTTP, etc).
		return self::fallback_inventory();
	}

	/**
	 * Find a local path to the configured CSS bundle, if any.
	 *
	 * Aligns the inventory source with whichever CSS bundle is actually
	 * enqueued: the active URL from the integration CSS URL resolver drives
	 * the choice, so a slashed_bricks/css_bundle_url filter that swaps
	 * 'optimal' for 'essential' or 'full' is reflected in what tokens
	 * the Bricks UI shows.
	 *
	 * The '{slug}/inventory_local_path' filter is authoritative:
	 *   - return a string -> use that path (or empty if it doesn't exist)
	 *   - return false    -> skip local resolution entirely
	 *   - return null     -> derive the path from the active CSS URL
	 *
	 * @return string Absolute path, or '' when no local copy is available.
	 */
	private static function find_local_bundle_path() {
		$override = apply_filters( static::filter_slug() . '/inventory_local_path', null );

		if ( false === $override ) {
			return '';
		}

		if ( is_string( $override ) ) {
			return ( '' !== $override && file_exists( $override ) ) ? $override : '';
		}

		// Derive the local path from the active CSS URL. This keeps the
		// parsed inventory aligned with whichever bundle the
		// per-integration css_bundle_url filter has selected, so we never
		// register tokens from 'optimal' while the site loads 'full'.
		$derived = self::derive_local_path_from_url( static::resolve_css_url() );
		if ( '' !== $derived && file_exists( $derived ) ) {
			return $derived;
		}

		return '';
	}

	/**
	 * Map a plugin-served CSS URL back to its filesystem path.
	 *
	 * Returns a path only when the URL clearly maps to a file inside the
	 * plugin's URL space (covers both copy-install mode where dist/ lives
	 * under the plugin and symlink-in-repo mode where dist/ lives at
	 * SLASHED_BRICKS_PATH . '../../dist/'). For any other URL (CDN,
	 * third-party host) returns '' so the caller can fall through to
	 * remote fetching.
	 *
	 * @param string $url Active CSS bundle URL.
	 * @return string Absolute filesystem path candidate, or '' when not a local URL.
	 */
	private static function derive_local_path_from_url( $url ) {
		if ( ! is_string( $url ) || '' === $url ) {
			return '';
		}
		foreach ( static::url_path_pairs() as $pair ) {
			list( $url_base, $path_base ) = $pair;
			if ( '' !== $url_base && 0 === strpos( $url, $url_base ) ) {
				return $path_base . substr( $url, strlen( $url_base ) );
			}
		}
		return '';
	}

	/**
	 * Parse a CSS file from disk, with a transient cache keyed by mtime.
	 *
	 * @param string $path Absolute path to a CSS file.
	 * @return array Inventory shape (may be empty on read failure).
	 */
	private static function parse_path_with_cache( $path ) {
		$mtime = @filemtime( $path );
		if ( false === $mtime ) {
			return Slashed_CSS_Parser::empty_inventory();
		}

		$key    = static::transient_prefix() . md5( 'path:' . $path . ':' . $mtime . ':' . static::inv_version() );
		$cached = get_transient( $key );
		if ( is_array( $cached ) && isset( $cached['variables'] ) ) {
			return $cached;
		}

		$css = @file_get_contents( $path );
		if ( false === $css || '' === $css ) {
			return Slashed_CSS_Parser::empty_inventory();
		}

		$inventory = Slashed_CSS_Parser::parse( $css );
		set_transient( $key, $inventory, self::TRANSIENT_TTL );
		return $inventory;
	}

	/**
	 * Parse a CSS file fetched from a URL, with a transient cache keyed by URL.
	 *
	 * @param string $url HTTPS URL to a CSS file.
	 * @return array Inventory shape (may be empty on network failure).
	 */
	private static function parse_url_with_cache( $url ) {
		$key    = static::transient_prefix() . md5( 'url:' . $url . ':' . static::inv_version() );
		$cached = get_transient( $key );
		if ( is_array( $cached ) && isset( $cached['variables'] ) ) {
			return $cached;
		}

		if ( ! function_exists( 'wp_remote_get' ) ) {
			return Slashed_CSS_Parser::empty_inventory();
		}

		$response = wp_remote_get(
			$url,
			array(
				'timeout'    => 10,
				'user-agent' => 'SLASHED/' . static::inv_version(),
			)
		);

		if ( is_wp_error( $response ) ) {
			return Slashed_CSS_Parser::empty_inventory();
		}

		if ( 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return Slashed_CSS_Parser::empty_inventory();
		}

		$css = wp_remote_retrieve_body( $response );
		if ( ! is_string( $css ) || '' === $css ) {
			return Slashed_CSS_Parser::empty_inventory();
		}

		$inventory = Slashed_CSS_Parser::parse( $css );
		set_transient( $key, $inventory, self::TRANSIENT_TTL );
		return $inventory;
	}

	/**
	 * Whether a URL points to a remote (http/https) resource.
	 *
	 * @param string $url URL to check.
	 * @return bool
	 */
	private static function is_remote_url( $url ) {
		return 0 === strpos( $url, 'http://' ) || 0 === strpos( $url, 'https://' );
	}

	/**
	 * Hardcoded fallback inventory used when neither a local file nor a
	 * remote fetch succeed. Pulled from the shipped optimal bundle of the
	 * release that this plugin version targets, so coverage is still
	 * complete even with no network or filesystem access.
	 *
	 * The list is generated from dist/slashed.optimal.css and bumped
	 * alongside the release tag.
	 *
	 * @return array{variables: string[], sf_classes: string[], is_classes: string[]}
	 */
	private static function fallback_inventory() {
		$path = static::fallback_json_path();
		if ( '' !== $path && file_exists( $path ) ) {
			$decoded = wp_json_file_decode( $path, array( 'associative' => true ) );
			if ( is_array( $decoded )
				&& isset( $decoded['variables'], $decoded['sf_classes'], $decoded['is_classes'] )
			) {
				return array(
					'variables'    => array_values( $decoded['variables'] ),
					'sf_classes'   => array_values( $decoded['sf_classes'] ),
					'is_classes'   => array_values( $decoded['is_classes'] ),
					'color_values' => isset( $decoded['color_values'] ) ? (array) $decoded['color_values'] : array(),
				);
			}
		}

		return Slashed_CSS_Parser::empty_inventory();
	}
}
