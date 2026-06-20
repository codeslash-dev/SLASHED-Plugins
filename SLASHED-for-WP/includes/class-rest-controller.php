<?php
/**
 * REST endpoints powering the SLASHED token editor SPA.
 *
 * Routes (all under /wp-json/slashed/v1):
 *   POST   /tokens              — save a section (legacy section-based format)
 *   POST   /tokens/validate     — dry-run sanitizer
 *   POST   /tokens/reset        — delete a section (or all)
 *   GET    /tokens/export       — portable JSON export
 *   POST   /tokens/import       — import from export envelope
 *   GET    /tokens/overrides    — get flat override map { "--sf-name": "value" }
 *   POST   /tokens/overrides    — save flat override map
 *   DELETE /tokens/overrides    — clear all overrides
 *   GET    /settings            — read plugin behavioural settings
 *   POST   /settings            — update plugin behavioural settings
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_REST_Controller
 */
class Slashed_REST_Controller {

	const NAMESPACE = 'slashed/v1';

	public function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/tokens',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'save_section' ),
				'permission_callback' => array( $this, 'check_permissions' ),
				'args'                => array(
					'section' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_key',
					),
					'values'  => array(
						'type'                 => 'object',
						'required'             => true,
						'additionalProperties' => array(
							'type'      => 'string',
							'maxLength' => 512,
						),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/tokens/validate',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'validate_section' ),
				'permission_callback' => array( $this, 'check_permissions' ),
				'args'                => array(
					'section' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_key',
					),
					'values'  => array(
						'type'                 => 'object',
						'required'             => true,
						'additionalProperties' => array(
							'type'      => 'string',
							'maxLength' => 512,
						),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/tokens/reset',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'reset_section' ),
				'permission_callback' => array( $this, 'check_permissions' ),
				'args'                => array(
					'section' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/tokens/export',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'export_tokens' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/tokens/import',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'import_tokens' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);

		// Flat override map endpoint — used by the new configurator-based admin SPA.
		register_rest_route(
			self::NAMESPACE,
			'/tokens/overrides',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_overrides' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'save_overrides' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'args'                => array(
						'overrides' => array(
							'type'                 => 'object',
							'required'             => true,
							'additionalProperties' => array(
								'type'      => 'string',
								'maxLength' => 512,
							),
						),
					),
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( $this, 'clear_overrides' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/settings',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'check_permissions' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'save_settings' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'args'                => array(
						'html_font_size'         => array(
							'type'              => 'string',
							'required'          => false,
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => function ( $value ) {
								return in_array( (string) $value, array( '', '100', '62.5' ), true );
							},
						),
						'css_bundle'             => array(
							'type'              => 'string',
							'required'          => false,
							'sanitize_callback' => 'sanitize_key',
							'validate_callback' => function ( $value ) {
								return in_array( (string) $value, Slashed_Token_Store::ALLOWED_CSS_BUNDLES, true );
							},
						),
						'show_class_hints'       => array(
							'type'     => 'boolean',
							'required' => false,
						),
						'manual_css_mode'        => array(
							'type'     => 'boolean',
							'required' => false,
						),
						'configurator_url'       => array(
							'type'              => 'string',
							'required'          => false,
							'sanitize_callback' => 'esc_url_raw',
						),
						'rebemer_element_map'    => array(
							'type'     => 'object',
							'required' => false,
						),
						'rebemer_container_mode' => array(
							'type'              => 'string',
							'required'          => false,
							'sanitize_callback' => 'sanitize_key',
							'validate_callback' => function ( $value ) {
								return in_array( (string) $value, array( 'role', 'generic' ), true );
							},
						),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/framework/versions',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'list_framework_versions' ),
				'permission_callback' => array( $this, 'check_permissions' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/framework/version',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'switch_framework_version' ),
				'permission_callback' => array( $this, 'check_permissions' ),
				'args'                => array(
					'version' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => function ( $value ) {
							return (bool) preg_match( '/^v?\d+\.\d+\.\d+[a-zA-Z0-9.-]*$/', $value );
						},
					),
				),
			)
		);
	}

	public function check_permissions() {
		return current_user_can( 'manage_options' );
	}

	public function save_section( WP_REST_Request $request ) {
		$section = (string) $request->get_param( 'section' );
		$values  = $request->get_param( 'values' );

		if ( ! $this->is_known_section( $section ) ) {
			return new WP_Error(
				'slashed_unknown_section',
				/* translators: %s: section slug. */
				sprintf( __( 'Unknown section: %s', 'slashed' ), $section ),
				array( 'status' => 400 )
			);
		}

		if ( ! is_array( $values ) ) {
			$values = array();
		}

		$sanitized = Slashed_Token_Sanitizer::sanitize_section( $section, $values );
		Slashed_Token_Store::update_section( $section, $sanitized );

		return rest_ensure_response(
			array(
				'section' => $section,
				'values'  => $sanitized,
			)
		);
	}

	public function validate_section( WP_REST_Request $request ) {
		$section = (string) $request->get_param( 'section' );
		$values  = $request->get_param( 'values' );

		if ( ! $this->is_known_section( $section ) ) {
			return new WP_Error(
				'slashed_unknown_section',
				/* translators: %s: section slug. */
				sprintf( __( 'Unknown section: %s', 'slashed' ), $section ),
				array( 'status' => 400 )
			);
		}

		if ( ! is_array( $values ) ) {
			$values = array();
		}

		$sanitized = Slashed_Token_Sanitizer::sanitize_section( $section, $values );

		$changed = array();
		foreach ( $values as $key => $raw_value ) {
			$raw = (string) $raw_value;
			if ( ! array_key_exists( $key, $sanitized ) ) {
				$changed[ $key ] = array(
					'original'  => $raw,
					'sanitized' => '',
				);
				continue;
			}
			$clean = (string) $sanitized[ $key ];
			if ( $raw !== $clean ) {
				$changed[ $key ] = array(
					'original'  => $raw,
					'sanitized' => $clean,
				);
			}
		}

		return rest_ensure_response(
			array(
				'section'   => $section,
				'sanitized' => $sanitized,
				'changed'   => $changed,
			)
		);
	}

	public function reset_section( WP_REST_Request $request ) {
		$section = (string) $request->get_param( 'section' );

		if ( '' === $section ) {
			Slashed_Token_Store::delete_settings();
			return rest_ensure_response(
				array(
					'section'  => '',
					'settings' => array(),
				)
			);
		}

		if ( ! $this->is_known_section( $section ) ) {
			return new WP_Error(
				'slashed_unknown_section',
				/* translators: %s: section slug. */
				sprintf( __( 'Unknown section: %s', 'slashed' ), $section ),
				array( 'status' => 400 )
			);
		}

		$all = Slashed_Token_Store::delete_section( $section );
		return rest_ensure_response(
			array(
				'section'  => $section,
				'settings' => $all,
			)
		);
	}

	public function get_settings( WP_REST_Request $request ) {
		return rest_ensure_response( Slashed_Token_Store::get_plugin_settings() );
	}

	public function save_settings( WP_REST_Request $request ) {
		$html_font_size         = $request->get_param( 'html_font_size' );
		$css_bundle             = $request->get_param( 'css_bundle' );
		$show_class_hints       = $request->get_param( 'show_class_hints' );
		$manual_css_mode        = $request->get_param( 'manual_css_mode' );
		$configurator_url       = $request->get_param( 'configurator_url' );
		$rebemer_element_map    = $request->get_param( 'rebemer_element_map' );
		$rebemer_container_mode = $request->get_param( 'rebemer_container_mode' );

		if (
			null === $html_font_size &&
			null === $css_bundle &&
			null === $show_class_hints &&
			null === $manual_css_mode &&
			null === $configurator_url &&
			null === $rebemer_element_map &&
			null === $rebemer_container_mode
		) {
			return rest_ensure_response( Slashed_Token_Store::get_plugin_settings() );
		}

		$settings = Slashed_Token_Store::get_plugin_settings();

		if ( null !== $html_font_size ) {
			$settings['html_font_size'] = (string) $html_font_size;
		}
		if ( null !== $css_bundle ) {
			$settings['css_bundle'] = (string) $css_bundle;
		}
		if ( null !== $show_class_hints ) {
			$settings['show_class_hints'] = (bool) $show_class_hints;
		}
		if ( null !== $manual_css_mode ) {
			$settings['manual_css_mode'] = (bool) $manual_css_mode;
		}
		if ( null !== $configurator_url ) {
			$settings['configurator_url'] = (string) $configurator_url;
		}
		if ( null !== $rebemer_element_map ) {
			$settings['rebemer_element_map'] = self::sanitize_rebemer_element_map( $rebemer_element_map );
		}
		if ( null !== $rebemer_container_mode ) {
			$settings['rebemer_container_mode'] = in_array( (string) $rebemer_container_mode, array( 'role', 'generic' ), true )
				? (string) $rebemer_container_mode
				: 'role';
		}

		Slashed_Token_Store::update_plugin_settings( $settings );
		return rest_ensure_response( $settings );
	}

	/**
	 * Maximum number of element-type → BEM-name overrides accepted in one
	 * save. Bricks ships ~80 element types; the cap is comfortably above
	 * that while bounding payload abuse.
	 */
	const REBEMER_MAP_CAP = 200;

	/**
	 * Matches the BEM grammar enforced editor-side in
	 * `editor-app/src/lib/validate.js`: lowercase, starts with a letter,
	 * kebab-case segments of letters/digits.
	 */
	const REBEMER_NAME_RE = '/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/';

	/**
	 * CSS keywords reBEMer refuses as class names (mirrors validate.js).
	 *
	 * @var string[]
	 */
	const REBEMER_RESERVED_NAMES = array( 'auto', 'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'none' );

	/**
	 * Sanitize the reBEMer element-type → BEM-name override map.
	 *
	 * Drops anything that isn't a string→string pair, normalizes keys to
	 * Bricks-type slugs, validates each value against the same BEM grammar
	 * the editor enforces (so a bad value can never round-trip into the
	 * builder), and caps the entry count. Returns a clean associative
	 * array (possibly empty).
	 *
	 * @param mixed $raw Untrusted input.
	 * @return array<string,string>
	 */
	private static function sanitize_rebemer_element_map( $raw ) {
		if ( ! is_array( $raw ) ) {
			return array();
		}

		$clean = array();
		foreach ( $raw as $type => $name ) {
			if ( count( $clean ) >= self::REBEMER_MAP_CAP ) {
				break;
			}
			if ( ! is_string( $type ) || ! is_string( $name ) ) {
				continue;
			}
			// Bricks element names are lowercase kebab slugs; reuse sanitize_key
			// then allow internal hyphens (sanitize_key already lowercases and
			// strips to [a-z0-9_-]).
			$type_slug = sanitize_key( $type );
			$value     = strtolower( trim( $name ) );
			if ( '' === $type_slug || '' === $value ) {
				continue;
			}
			if ( in_array( $value, self::REBEMER_RESERVED_NAMES, true ) ) {
				continue;
			}
			if ( ! preg_match( self::REBEMER_NAME_RE, $value ) ) {
				continue;
			}
			$clean[ $type_slug ] = $value;
		}

		return $clean;
	}

	/**
	 * GET /tokens/overrides — returns the flat override map.
	 */
	public function get_overrides( WP_REST_Request $request ) {
		return rest_ensure_response( (object) get_option( 'slashed_overrides', array() ) );
	}

	/**
	 * POST /tokens/overrides — replaces the flat override map.
	 *
	 * Accepts { overrides: { "--sf-color-brand": "oklch(...)" } }.
	 * Only keys starting with "--" are accepted; values are sanitized.
	 */
	public function save_overrides( WP_REST_Request $request ) {
		$raw = $request->get_param( 'overrides' );
		if ( ! is_array( $raw ) ) {
			$raw = array();
		}
		$sanitized = $this->sanitize_overrides( $raw );
		update_option( 'slashed_overrides', $sanitized );
		return rest_ensure_response( (object) $sanitized );
	}

	/**
	 * DELETE /tokens/overrides — removes all stored overrides.
	 */
	public function clear_overrides( WP_REST_Request $request ) {
		delete_option( 'slashed_overrides' );
		return rest_ensure_response( (object) array() );
	}

	/**
	 * Sanitize a flat override map: only allow -- prefixed property names.
	 *
	 * @param  array $overrides Raw input.
	 * @return array            Sanitized { string => string }.
	 */
	private function sanitize_overrides( array $overrides ) {
		$out = array();
		foreach ( $overrides as $name => $value ) {
			if ( ! is_string( $name ) || 0 !== strpos( $name, '--' ) ) {
				continue;
			}
			$out[ sanitize_text_field( $name ) ] = sanitize_text_field( (string) $value );
		}
		return $out;
	}

	public function export_tokens() {
		return rest_ensure_response(
			array(
				'schema_version'  => '1',
				'plugin_version'  => SLASHED_VERSION,
				'exported_at'     => gmdate( 'c' ),
				'tokens'          => Slashed_Token_Store::get_settings(),
				'plugin_settings' => Slashed_Token_Store::get_plugin_settings(),
			)
		);
	}

	public function import_tokens( WP_REST_Request $request ) {
		$body = $request->get_json_params();

		if ( ! is_array( $body ) || ! isset( $body['tokens'] ) || ! is_array( $body['tokens'] ) ) {
			return new WP_Error(
				'slashed_invalid_import',
				__( 'Invalid import payload. Expected a SLASHED token export file.', 'slashed' ),
				array( 'status' => 400 )
			);
		}

		$all      = Slashed_Token_Store::get_settings();
		$imported = 0;

		foreach ( $body['tokens'] as $section => $values ) {
			if ( ! Slashed_Tab_Registry::is_token_tab( $section ) || ! is_array( $values ) ) {
				continue;
			}
			$sanitized = Slashed_Token_Sanitizer::sanitize_section( $section, $values );
			if ( ! empty( $sanitized ) ) {
				$all[ $section ] = $sanitized;
				++$imported;
			} else {
				unset( $all[ $section ] );
			}
		}

		Slashed_Token_Store::update_settings( $all );

		$settings_imported = false;
		if ( isset( $body['plugin_settings'] ) && is_array( $body['plugin_settings'] ) ) {
			$raw      = $body['plugin_settings'];
			$existing = Slashed_Token_Store::get_plugin_settings();

			if ( isset( $raw['css_bundle'] )
				&& in_array( (string) $raw['css_bundle'], Slashed_Token_Store::ALLOWED_CSS_BUNDLES, true )
			) {
				$existing['css_bundle'] = (string) $raw['css_bundle'];
				$settings_imported      = true;
			}
			if ( isset( $raw['html_font_size'] )
				&& in_array( (string) $raw['html_font_size'], array( '', '100', '62.5' ), true )
			) {
				$existing['html_font_size'] = (string) $raw['html_font_size'];
				$settings_imported          = true;
			}
			if ( array_key_exists( 'show_class_hints', $raw ) ) {
				$existing['show_class_hints'] = (bool) $raw['show_class_hints'];
				$settings_imported            = true;
			}
			if ( isset( $raw['rebemer_element_map'] ) && is_array( $raw['rebemer_element_map'] ) ) {
				$existing['rebemer_element_map'] = self::sanitize_rebemer_element_map( $raw['rebemer_element_map'] );
				$settings_imported               = true;
			}
			if ( isset( $raw['rebemer_container_mode'] )
				&& in_array( (string) $raw['rebemer_container_mode'], array( 'role', 'generic' ), true )
			) {
				$existing['rebemer_container_mode'] = (string) $raw['rebemer_container_mode'];
				$settings_imported                  = true;
			}

			if ( $settings_imported ) {
				Slashed_Token_Store::update_plugin_settings( $existing );
			}
		}

		return rest_ensure_response(
			array(
				'imported'          => $imported,
				'settings_imported' => $settings_imported,
				'tokens'            => Slashed_Token_Store::get_settings(),
				'plugin_settings'   => Slashed_Token_Store::get_plugin_settings(),
			)
		);
	}

	private function is_known_section( $section ) {
		return Slashed_Tab_Registry::is_token_tab( $section );
	}

	/**
	 * GET /framework/versions — list available release tags from jsDelivr.
	 *
	 * Returns an array of { tag, date } objects (up to 20 stable releases).
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function list_framework_versions() {
		$response = wp_remote_get(
			Slashed_Framework_Updater::METADATA_URL,
			array(
				'timeout'    => 10,
				'user-agent' => 'SLASHED/' . SLASHED_VERSION . '; WordPress/' . get_bloginfo( 'version' ),
			)
		);

		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return new WP_Error(
				'fetch_failed',
				__( 'Could not fetch version list. Try again later.', 'slashed' ),
				array( 'status' => 502 )
			);
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $body ) || empty( $body['versions'] ) ) {
			return new WP_Error(
				'no_versions',
				__( 'No versions found.', 'slashed' ),
				array( 'status' => 502 )
			);
		}

		$versions = array();
		foreach ( $body['versions'] as $entry ) {
			$ver = isset( $entry['version'] ) ? (string) $entry['version'] : '';
			if ( $ver && preg_match( '/^v?\d+\.\d+\.\d/', $ver ) ) {
				$versions[] = array(
					'tag'  => 'v' . ltrim( $ver, 'v' ),
					'date' => isset( $entry['date'] ) ? (string) $entry['date'] : '',
				);
			}
		}

		return rest_ensure_response( array_slice( $versions, 0, 20 ) );
	}

	/**
	 * POST /framework/version — download CSS bundles for a given version and activate it.
	 *
	 * @param WP_REST_Request $request { version: string }.
	 * @return WP_REST_Response|WP_Error
	 */
	public function switch_framework_version( WP_REST_Request $request ) {
		$version = 'v' . ltrim( (string) $request->get_param( 'version' ), 'v' );
		$result  = Slashed_Framework_Updater::download_files( $version );

		if ( is_wp_error( $result ) ) {
			return new WP_Error(
				'download_failed',
				$result->get_error_message(),
				array( 'status' => 500 )
			);
		}

		return rest_ensure_response(
			array(
				'version' => $version,
				/* translators: %s: framework version tag e.g. "v0.5.23" */
				'message' => sprintf( __( 'Switched to %s.', 'slashed' ), $version ),
			)
		);
	}
}
