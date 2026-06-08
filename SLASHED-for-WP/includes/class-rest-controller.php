<?php
/**
 * REST endpoints powering the SLASHED token editor SPA.
 *
 * Routes (all under /wp-json/slashed/v1):
 *   POST   /tokens            — save a section
 *   POST   /tokens/validate   — dry-run sanitizer
 *   POST   /tokens/reset      — delete a section (or all)
 *   GET    /tokens/export     — portable JSON export
 *   POST   /tokens/import     — import from export envelope
 *   GET    /settings          — read plugin behavioural settings
 *   POST   /settings          — update plugin behavioural settings
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
						'html_font_size'   => array(
							'type'              => 'string',
							'required'          => false,
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => function( $value ) {
								return in_array( (string) $value, array( '', '100', '62.5' ), true );
							},
						),
						'css_bundle'       => array(
							'type'              => 'string',
							'required'          => false,
							'sanitize_callback' => 'sanitize_key',
							'validate_callback' => function( $value ) {
								return in_array( (string) $value, Slashed_Token_Store::ALLOWED_CSS_BUNDLES, true );
							},
						),
						'show_class_hints' => array(
							'type'     => 'boolean',
							'required' => false,
						),
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

		return rest_ensure_response( array(
			'section' => $section,
			'values'  => $sanitized,
		) );
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
				$changed[ $key ] = array( 'original' => $raw, 'sanitized' => '' );
				continue;
			}
			$clean = (string) $sanitized[ $key ];
			if ( $raw !== $clean ) {
				$changed[ $key ] = array( 'original' => $raw, 'sanitized' => $clean );
			}
		}

		return rest_ensure_response( array(
			'section'   => $section,
			'sanitized' => $sanitized,
			'changed'   => $changed,
		) );
	}

	public function reset_section( WP_REST_Request $request ) {
		$section = (string) $request->get_param( 'section' );

		if ( '' === $section ) {
			Slashed_Token_Store::delete_settings();
			return rest_ensure_response( array( 'section' => '', 'settings' => array() ) );
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
		return rest_ensure_response( array( 'section' => $section, 'settings' => $all ) );
	}

	public function get_settings( WP_REST_Request $request ) {
		return rest_ensure_response( Slashed_Token_Store::get_plugin_settings() );
	}

	public function save_settings( WP_REST_Request $request ) {
		$html_font_size   = $request->get_param( 'html_font_size' );
		$css_bundle       = $request->get_param( 'css_bundle' );
		$show_class_hints = $request->get_param( 'show_class_hints' );

		if ( null === $html_font_size && null === $css_bundle && null === $show_class_hints ) {
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

		Slashed_Token_Store::update_plugin_settings( $settings );
		return rest_ensure_response( $settings );
	}

	public function export_tokens() {
		return rest_ensure_response( array(
			'schema_version'  => '1',
			'plugin_version'  => SLASHED_VERSION,
			'exported_at'     => gmdate( 'c' ),
			'tokens'          => Slashed_Token_Store::get_settings(),
			'plugin_settings' => Slashed_Token_Store::get_plugin_settings(),
		) );
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
				$existing['css_bundle']  = (string) $raw['css_bundle'];
				$settings_imported       = true;
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

			if ( $settings_imported ) {
				Slashed_Token_Store::update_plugin_settings( $existing );
			}
		}

		return rest_ensure_response( array(
			'imported'          => $imported,
			'settings_imported' => $settings_imported,
			'tokens'            => Slashed_Token_Store::get_settings(),
			'plugin_settings'   => Slashed_Token_Store::get_plugin_settings(),
		) );
	}

	private function is_known_section( $section ) {
		return Slashed_Tab_Registry::is_token_tab( $section );
	}
}
