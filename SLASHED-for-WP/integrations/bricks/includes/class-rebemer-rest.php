<?php
/**
 * REST endpoints owned by reBEMer.
 *
 * v1 ships one endpoint:
 *
 *   GET /wp-json/slashed/v1/rebemer/unused
 *     Returns the list of global classes not referenced by any element
 *     across the post types Bricks edits. Read-only. Never mutates the
 *     `bricks_global_classes` option — deletion stays the user's job in
 *     Bricks' Global Class Manager (Goal #6 in docs/rebemer.md stands).
 *
 * Later v1 PRs will add `/rebemer/preflight` here for the destructive-
 * rename safety check; the count_class_references() helper below is
 * shaped to be reused by that endpoint.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Bricks_ReBEMer_REST
 *
 * Implementation notes
 * --------------------
 * - Capability gate accepts both `bricks_full_access` (the canonical
 *   capability for "can edit Bricks pages") and `manage_options` (a
 *   strict superset on default WP installs). Mirrors the gate used in
 *   `class-rebemer-enqueue.php` so the user who can open the editor can
 *   also use its endpoints.
 * - Reference counting walks `wp_postmeta` rows for the meta keys
 *   Bricks uses to store page content. `_bricks_page_content_2` is the
 *   primary key in current Bricks versions; we also include the legacy
 *   `_bricks_page_content` so older sites work.
 * - The post-meta scan is capped at REFERENCE_SCAN_CAP rows to bound
 *   memory and time on huge sites. The cap is far above what a typical
 *   site touches; if a site exceeds it the response includes a
 *   `truncated: true` flag so the UI can warn the user that the result
 *   may include "unused" classes that are actually used past the cap.
 */
class Slashed_Bricks_ReBEMer_REST {

	const NAMESPACE = 'slashed/v1';

	/**
	 * Maximum number of postmeta rows to scan for references in one
	 * pass. Each row is a serialized Bricks element tree, often dozens
	 * of KB. 5000 keeps the worst case bounded while covering every
	 * production site we've seen.
	 */
	const REFERENCE_SCAN_CAP = 5000;

	/**
	 * Postmeta keys Bricks uses for page/template content.
	 *
	 * @var string[]
	 */
	const BRICKS_CONTENT_META_KEYS = array(
		'_bricks_page_content_2',
		'_bricks_page_header_2',
		'_bricks_page_footer_2',
		'_bricks_page_content',
	);

	/**
	 * Register all reBEMer REST routes.
	 *
	 * Called from `slashed_bricks_rest_routes_init()`, which registers
	 * only Bricks-specific endpoints. The token CRUD controller
	 * (Slashed_REST_Controller) is registered globally by slashed.php.
	 */
	public function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/rebemer/unused',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_unused_classes' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);
	}

	/**
	 * Capability gate. Mirrors the editor enqueue gate so the same
	 * users who see the panel can call its endpoints.
	 *
	 * @return bool
	 */
	public function check_permissions() {
		return current_user_can( 'bricks_full_access' ) || current_user_can( 'manage_options' );
	}

	/**
	 * GET /rebemer/unused.
	 *
	 * Response shape:
	 *   {
	 *     unused: [{ id: string, name: string, hasSettings: bool }, ...],
	 *     totalGlobalClasses: int,
	 *     totalUnused:        int,
	 *     scanned:            int,    // count of post rows inspected
	 *     truncated:          bool,   // true when scan hit REFERENCE_SCAN_CAP
	 *   }
	 *
	 * Names sorted naturally so the UI doesn't need to re-sort
	 * (matches the sort policy in class-inventory.php).
	 *
	 * @return WP_REST_Response
	 */
	public function get_unused_classes() {
		$classes = get_option( 'bricks_global_classes', array() );
		if ( ! is_array( $classes ) ) {
			$classes = array();
		}

		$reference_counts = $this->count_class_references( $classes );

		$unused            = array();
		$processed_classes = 0;
		foreach ( $classes as $cls ) {
			if ( ! is_array( $cls ) || empty( $cls['id'] ) ) {
				continue;
			}
			$processed_classes++;
			$id    = (string) $cls['id'];
			$count = isset( $reference_counts['counts'][ $id ] )
				? (int) $reference_counts['counts'][ $id ]
				: 0;

			if ( 0 === $count ) {
				$unused[] = array(
					'id'          => $id,
					'name'        => isset( $cls['name'] ) ? (string) $cls['name'] : '',
					'hasSettings' => ! empty( $cls['settings'] ) && is_array( $cls['settings'] ),
				);
			}
		}

		// Natural-sort by name so 'card' lands before 'card-50' and
		// 'card-100' lands after both — same convention used elsewhere
		// in the plugin.
		usort(
			$unused,
			static function ( $a, $b ) {
				return strnatcasecmp( (string) $a['name'], (string) $b['name'] );
			}
		);

		return rest_ensure_response(
			array(
				'unused'             => $unused,
				'totalGlobalClasses' => $processed_classes,
				'totalUnused'        => count( $unused ),
				'scanned'            => $reference_counts['scanned'],
				'truncated'          => $reference_counts['truncated'],
			)
		);
	}

	/**
	 * Count reference occurrences of each class id across Bricks page
	 * content stored in post meta.
	 *
	 * Returns:
	 *   array(
	 *     'counts'    => array<class_id, int>,
	 *     'scanned'   => int,
	 *     'truncated' => bool,
	 *   )
	 *
	 * Performance notes
	 * -----------------
	 * - One SQL query, capped at REFERENCE_SCAN_CAP rows.
	 * - Per-row cost is a maybe_unserialize() + a recursive walk of
	 *   the resulting array. The walk is bounded by the size of the
	 *   element tree, which Bricks itself caps in practice.
	 * - We deliberately don't paginate or chunk — at the cap we accept
	 *   the loss and return `truncated: true`. A future iteration can
	 *   add cursor-based pagination if real users hit the cap.
	 *
	 * @param array $classes Global classes list (used to seed the
	 *                       counts map with every known id at zero).
	 * @return array{counts: array<string,int>, scanned: int, truncated: bool}
	 */
	private function count_class_references( $classes ) {
		global $wpdb;

		// Seed every known class id with zero so the caller can detect
		// "exists in registry, never referenced" cleanly.
		$counts = array();
		foreach ( $classes as $cls ) {
			if ( is_array( $cls ) && ! empty( $cls['id'] ) ) {
				$counts[ (string) $cls['id'] ] = 0;
			}
		}

		if ( empty( $counts ) ) {
			return array(
				'counts'    => $counts,
				'scanned'   => 0,
				'truncated' => false,
			);
		}

		$placeholders = implode( ',', array_fill( 0, count( self::BRICKS_CONTENT_META_KEYS ), '%s' ) );
		$cap          = (int) self::REFERENCE_SCAN_CAP;

		// One row over the cap is enough to detect truncation without
		// fetching extra payload.
		//
		// ORDER BY meta_id ASC keeps the scan deterministic: across two
		// truncated runs on the same site the first `cap` rows scanned
		// are always the same, so the `truncated: true` flag is paired
		// with reproducible content rather than whatever order MySQL
		// happened to return rows in.
		$rows = $wpdb->get_col(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT meta_value FROM {$wpdb->postmeta}
				 WHERE meta_key IN ($placeholders)
				   AND meta_value != ''
				 ORDER BY meta_id ASC
				 LIMIT %d",
				array_merge( self::BRICKS_CONTENT_META_KEYS, array( $cap + 1 ) )
			)
		);

		if ( ! is_array( $rows ) ) {
			$rows = array();
		}

		$truncated = count( $rows ) > $cap;
		if ( $truncated ) {
			$rows = array_slice( $rows, 0, $cap );
		}

		foreach ( $rows as $serialized ) {
			$data = maybe_unserialize( $serialized );
			if ( ! is_array( $data ) ) {
				continue;
			}
			$this->collect_class_ids_recursive( $data, $counts );
		}

		return array(
			'counts'    => $counts,
			'scanned'   => count( $rows ),
			'truncated' => $truncated,
		);
	}

	/**
	 * Walk a Bricks element tree (or any nested array) and increment
	 * `$counts` for every class id encountered in `_cssGlobalClasses`.
	 *
	 * Iterative-with-stack to avoid deep recursion on pathological
	 * trees. Modifies `$counts` in place.
	 *
	 * @param array $tree   Decoded Bricks page content.
	 * @param array &$counts Mutable map<class_id, int>.
	 */
	private function collect_class_ids_recursive( $tree, &$counts ) {
		$stack = array( $tree );
		while ( ! empty( $stack ) ) {
			$node = array_pop( $stack );
			if ( ! is_array( $node ) ) {
				continue;
			}

			// Direct hit: a Bricks element has settings._cssGlobalClasses.
			if ( isset( $node['settings'] ) && is_array( $node['settings'] ) ) {
				$ids = isset( $node['settings']['_cssGlobalClasses'] )
					? $node['settings']['_cssGlobalClasses']
					: null;
				if ( is_array( $ids ) ) {
					foreach ( $ids as $cid ) {
						if ( is_string( $cid ) && isset( $counts[ $cid ] ) ) {
							$counts[ $cid ]++;
						}
					}
				}
			}

			// Recurse into every nested array — covers both element
			// trees (numerically indexed) and settings sub-blobs that
			// might themselves contain element references in future
			// Bricks versions.
			foreach ( $node as $value ) {
				if ( is_array( $value ) ) {
					$stack[] = $value;
				}
			}
		}
	}
}
