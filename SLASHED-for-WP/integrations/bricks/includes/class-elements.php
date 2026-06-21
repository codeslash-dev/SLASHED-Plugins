<?php
/**
 * Enumerate every registered Bricks element (core, plugin, custom).
 *
 * reBEMer's built-in element→BEM map only covers the well-known Bricks
 * elements. To let the admin settings page edit a default name for *any*
 * element — including ones shipped by third-party plugins or registered by
 * custom code — we read Bricks' own element registry
 * (`\Bricks\Elements::$elements`), which every element lands in when it
 * registers through the standard Bricks API on `init`.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Slashed_Bricks_Elements {

	/**
	 * Transient prefix. The cache key embeds a hash of the registered
	 * element names so activating a plugin that adds elements busts it
	 * automatically.
	 */
	const CACHE_PREFIX = 'slashed_bricks_elements_';

	/**
	 * All registered Bricks elements as `name => human label`.
	 *
	 * Returns an empty array when Bricks isn't present so callers degrade
	 * to reBEMer's built-in map. Defensive throughout: a misbehaving
	 * third-party element can never fatal the admin page.
	 *
	 * @return array<string,string>
	 */
	public static function get_all() {
		if ( ! class_exists( '\Bricks\Elements' ) || ! isset( \Bricks\Elements::$elements ) ) {
			return array();
		}

		$registry = \Bricks\Elements::$elements;
		if ( ! is_array( $registry ) || empty( $registry ) ) {
			return array();
		}

		$names = array_keys( $registry );
		sort( $names );
		$cache_key = self::CACHE_PREFIX . md5( implode( ',', $names ) );

		$cached = get_transient( $cache_key );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$out = array();
		foreach ( $registry as $name => $data ) {
			if ( ! is_string( $name ) || '' === $name ) {
				continue;
			}
			$out[ $name ] = self::resolve_label( $name, $data );
		}
		ksort( $out );

		/**
		 * Filter the full Bricks element map (name => label) exposed to the
		 * reBEMer admin settings page.
		 *
		 * @param array $out      Map of element name => human label.
		 * @param array $registry Raw `\Bricks\Elements::$elements` registry.
		 */
		$out = apply_filters( 'slashed_bricks/all_elements', $out, $registry );

		// A misbehaving filter must not break the admin page's array_keys()
		// consumers; coerce anything non-array back to an empty map.
		if ( ! is_array( $out ) ) {
			$out = array();
		}

		set_transient( $cache_key, $out, DAY_IN_SECONDS );
		return $out;
	}

	/**
	 * Best-effort human label for one element.
	 *
	 * Prefers the label already stored in the registry; otherwise
	 * instantiates the element class (how Bricks itself reads labels) and
	 * falls back to a humanised name. Guarded so a broken element class
	 * degrades instead of fataling.
	 *
	 * @param string $name Element name (slug).
	 * @param mixed  $data Registry entry for the element.
	 * @return string
	 */
	private static function resolve_label( $name, $data ) {
		if ( is_array( $data ) && ! empty( $data['label'] ) && is_string( $data['label'] ) ) {
			return $data['label'];
		}

		$class = ( is_array( $data ) && ! empty( $data['class'] ) ) ? $data['class'] : '';
		if ( $class && class_exists( $class ) ) {
			try {
				$instance = new $class();
				if ( ! empty( $instance->label ) && is_string( $instance->label ) ) {
					return $instance->label;
				}
			} catch ( \Throwable $e ) {
				unset( $e ); // Best-effort: fall through to the humanised name below.
			}
		}

		return ucwords( str_replace( array( '-', '_' ), ' ', $name ) );
	}
}
