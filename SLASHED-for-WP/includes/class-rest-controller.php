<?php
/**
 * REST endpoints powering the SLASHED token editor SPA.
 *
 * Routes (all under /wp-json/slashed/v1):
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
		// Flat override map endpoint — used by the configurator-based admin SPA.
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
							'validate_callback' => array( __CLASS__, 'is_allowed_html_font_size' ),
						),
						'css_bundle'             => array(
							'type'              => 'string',
							'required'          => false,
							'sanitize_callback' => 'sanitize_key',
							'validate_callback' => array( __CLASS__, 'is_allowed_css_bundle' ),
						),
						'show_class_hints'       => array(
							'type'     => 'boolean',
							'required' => false,
						),
						'rebemer_enabled'        => array(
							'type'     => 'boolean',
							'required' => false,
						),
						'show_color_panel'       => array(
							'type'     => 'boolean',
							'required' => false,
						),
						'configurator_url'       => array(
							'type'              => 'string',
							'required'          => false,
							'sanitize_callback' => 'esc_url_raw',
							'validate_callback' => array( __CLASS__, 'is_valid_configurator_url' ),
						),
						'rebemer_element_map'    => array(
							'type'     => 'object',
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

	/**
	 * Validate the html_font_size setting: empty (unset), '100', or '62.5'.
	 *
	 * @param mixed $value Incoming value.
	 * @return bool
	 */
	public static function is_allowed_html_font_size( $value ) {
		return in_array( (string) $value, array( '', '100', '62.5' ), true );
	}

	/**
	 * Validate the css_bundle setting against the allowlist.
	 *
	 * @param mixed $value Incoming value.
	 * @return bool
	 */
	public static function is_allowed_css_bundle( $value ) {
		return in_array( (string) $value, Slashed_Token_Store::ALLOWED_CSS_BUNDLES, true );
	}

	/**
	 * Validate the configurator_url setting. Empty clears the setting; otherwise
	 * an http(s) URL is required so a `javascript:`/`data:` scheme (which would
	 * be echoed into the admin) can never be stored.
	 *
	 * @param mixed $value Incoming value.
	 * @return bool
	 */
	public static function is_valid_configurator_url( $value ) {
		return '' === $value || 1 === preg_match( '#^https?://#i', (string) $value );
	}

	public function get_settings( WP_REST_Request $request ) {
		return rest_ensure_response( Slashed_Token_Store::get_plugin_settings() );
	}

	public function save_settings( WP_REST_Request $request ) {
		$html_font_size         = $request->get_param( 'html_font_size' );
		$css_bundle             = $request->get_param( 'css_bundle' );
		$show_class_hints       = $request->get_param( 'show_class_hints' );
		$rebemer_enabled        = $request->get_param( 'rebemer_enabled' );
		$show_color_panel       = $request->get_param( 'show_color_panel' );
		$configurator_url       = $request->get_param( 'configurator_url' );
		$rebemer_element_map    = $request->get_param( 'rebemer_element_map' );

		if (
			null === $html_font_size &&
			null === $css_bundle &&
			null === $show_class_hints &&
			null === $rebemer_enabled &&
			null === $show_color_panel &&
			null === $configurator_url &&
			null === $rebemer_element_map
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
		if ( null !== $rebemer_enabled ) {
			$settings['rebemer_enabled'] = (bool) $rebemer_enabled;
		}
		if ( null !== $show_color_panel ) {
			$settings['show_color_panel'] = (bool) $show_color_panel;
		}
		if ( null !== $configurator_url ) {
			$settings['configurator_url'] = (string) $configurator_url;
		}
		if ( null !== $rebemer_element_map ) {
			$settings['rebemer_element_map'] = self::sanitize_rebemer_element_map( $rebemer_element_map );
		}

		Slashed_Token_Store::update_plugin_settings( $settings );
		return rest_ensure_response( $settings );
	}

	/**
	 * Maximum number of element-type → BEM-name overrides accepted in one
	 * save. Bricks ships ~80 element types and plugins/custom code add more;
	 * the cap is comfortably above that while bounding payload abuse.
	 */
	const REBEMER_MAP_CAP = 500;

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
	public static function sanitize_rebemer_element_map( $raw ) {
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
		return rest_ensure_response( (object) Slashed_Token_Store::get_overrides() );
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
		Slashed_Token_Store::update_overrides( $sanitized );
		return rest_ensure_response( (object) $sanitized );
	}

	/**
	 * DELETE /tokens/overrides — removes all stored overrides.
	 */
	public function clear_overrides( WP_REST_Request $request ) {
		Slashed_Token_Store::delete_overrides();
		return rest_ensure_response( (object) array() );
	}

	/**
	 * Sanitize a flat override map.
	 *
	 * Two gates, both mandatory:
	 *   1. The property name must be a custom-property identifier
	 *      (`--` followed by letters, digits and hyphens) — nothing else can
	 *      become a declaration property.
	 *   2. The value must pass Slashed_CSS_Generator::validate_override_value(),
	 *      the same allowlist (colour / dimension / font-family, each behind
	 *      is_css_safe()) the section-based token path is held to. A value that
	 *      fails is dropped, so this map can never carry a `}`, an @-rule, a
	 *      url(), or any other CSS breakout into storage.
	 *
	 * @param  array $overrides Raw input.
	 * @return array            Sanitized { "--name" => "value" }.
	 */
	private function sanitize_overrides( array $overrides ) {
		$out = array();
		foreach ( $overrides as $name => $value ) {
			if ( ! is_string( $name ) || ( ! is_string( $value ) && ! is_int( $value ) && ! is_float( $value ) ) ) {
				continue;
			}
			if ( ! preg_match( '/^--sf-[a-z0-9-]+$/', $name ) ) {
				continue;
			}
			$clean = Slashed_CSS_Generator::validate_override_value( $value );
			if ( false === $clean ) {
				continue;
			}
			$out[ $name ] = $clean;
		}
		return $out;
	}
}
