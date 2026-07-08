<?php
/**
 * Tests for the POST /settings validate_callback predicates.
 *
 * These were inline closures on the route definition (untestable in isolation);
 * they are now public static methods so the allowlists — especially the
 * configurator_url http(s) gate that keeps a `javascript:`/`data:` scheme out
 * of the admin — are covered directly.
 *
 * @package SLASHED
 */

use PHPUnit\Framework\TestCase;

final class RestControllerSettingsValidatorsTest extends TestCase {

	/**
	 * @dataProvider font_sizes
	 */
	public function test_html_font_size_allowlist( $value, $expected ) {
		$this->assertSame( $expected, Slashed_REST_Controller::is_allowed_html_font_size( $value ) );
	}

	public function font_sizes() {
		return array(
			'empty (unset)' => array( '', true ),
			'100%'          => array( '100', true ),
			'62.5%'         => array( '62.5', true ),
			'arbitrary'     => array( '75', false ),
			'injection'     => array( '100; }', false ),
		);
	}

	/**
	 * @dataProvider bundles
	 */
	public function test_css_bundle_allowlist( $value, $expected ) {
		$this->assertSame( $expected, Slashed_REST_Controller::is_allowed_css_bundle( $value ) );
	}

	public function bundles() {
		return array(
			'optimal'            => array( 'optimal', true ),
			'optimal-components' => array( 'optimal-components', true ),
			'full'               => array( 'full', true ),
			'unknown'            => array( 'kitchen-sink', false ),
			'empty'              => array( '', false ),
		);
	}

	/**
	 * @dataProvider urls
	 */
	public function test_configurator_url_requires_http_scheme_or_empty( $value, $expected ) {
		$this->assertSame( $expected, Slashed_REST_Controller::is_valid_configurator_url( $value ) );
	}

	public function urls() {
		return array(
			'empty clears'        => array( '', true ),
			'https'               => array( 'https://example.com/app', true ),
			'http'                => array( 'http://example.com', true ),
			'uppercase scheme'    => array( 'HTTPS://example.com', true ),
			'javascript breakout' => array( 'javascript:alert(1)', false ),
			'data uri'            => array( 'data:text/html,<script>', false ),
			'scheme-relative'     => array( '//example.com', false ),
			'bare host'           => array( 'example.com', false ),
		);
	}
}
