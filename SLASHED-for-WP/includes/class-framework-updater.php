<?php
/**
 * Framework CSS updater.
 *
 * @package SLASHED
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Slashed_Framework_Updater
 *
 * Checks jsDelivr (tag list) for a newer SLASHED release and downloads the
 * matching CSS bundles from the framework's GitHub Release assets into the
 * plugin's local dist/ directory. Exposed as two wp_ajax actions so
 * the settings page can trigger checks and downloads without a full page reload.
 */
class Slashed_Framework_Updater {

	const BUNDLES          = array( 'essential', 'optimal', 'full' );
	const TRANSIENT_KEY    = 'slashed_latest_framework_version';
	const LOCAL_VER_OPTION = 'slashed_local_framework_version';
	// Per-version CSS comes from the framework's GitHub Release assets (immutable
	// per tag). %1$s = version tag (e.g. v0.5.21), %2$s = bundle filename.
	const CDN_BASE         = 'https://github.com/codeslash-dev/SLASHED/releases/download/%s/%s';
	// jsDelivr package metadata lists the framework repo's git tags (works
	// independently of where the built CSS lives).
	const METADATA_URL     = 'https://data.jsdelivr.com/v1/packages/gh/codeslash-dev/SLASHED';

	public function __construct() {
		add_action( 'wp_ajax_slashed_check_framework_update', array( $this, 'ajax_check_update' ) );
		add_action( 'wp_ajax_slashed_do_framework_update',   array( $this, 'ajax_do_update' ) );
	}

	/**
	 * Version string for the locally bundled CSS files.
	 * Falls back to the compile-time SLASHED_CSS_REF constant if never updated.
	 *
	 * @return string e.g. "v0.5.0"
	 */
	public static function get_local_version() {
		return (string) get_option( self::LOCAL_VER_OPTION, SLASHED_CSS_REF );
	}

	/**
	 * Fetch the latest published release tag from jsDelivr (cached 24h).
	 *
	 * @return string|null Version tag, or null on failure.
	 */
	public static function get_latest_version() {
		$cached = get_transient( self::TRANSIENT_KEY );
		if ( $cached ) {
			return $cached;
		}

		$response = wp_remote_get(
			self::METADATA_URL,
			array(
				'timeout'    => 10,
				'user-agent' => 'SLASHED/' . SLASHED_VERSION . '; WordPress/' . get_bloginfo( 'version' ),
			)
		);

		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return null;
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $body ) || empty( $body['versions'] ) ) {
			return null;
		}

		foreach ( $body['versions'] as $entry ) {
			$ver = isset( $entry['version'] ) ? ltrim( (string) $entry['version'], 'v' ) : '';
			// Match a plain stable semver only (X.Y.Z), anchored — pre-release
			// tags (-rc/-beta) are intentionally skipped for update prompts.
			// Kept identical to slashed_bricks_run_version_check() in slashed-bricks.php.
			if ( preg_match( '/^\d+\.\d+\.\d+$/', $ver ) ) {
				$latest = 'v' . $ver;
				set_transient( self::TRANSIENT_KEY, $latest, DAY_IN_SECONDS );
				return $latest;
			}
		}

		return null;
	}

	/**
	 * Download all CSS bundles for a given version and save them to dist/.
	 *
	 * @param string $version Release tag, e.g. "v0.5.0".
	 * @return true|WP_Error
	 */
	public static function download_files( $version ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		WP_Filesystem();
		global $wp_filesystem;

		if ( ! $wp_filesystem ) {
			return new WP_Error( 'fs_unavailable', __( 'WordPress filesystem is unavailable.', 'slashed' ) );
		}

		$dist_dir = SLASHED_PATH . 'dist/';
		if ( ! $wp_filesystem->is_dir( $dist_dir ) ) {
			$wp_filesystem->mkdir( $dist_dir, FS_CHMOD_DIR );
		}

		// Download all bundles to .tmp files first; only rename to final paths once
		// every download succeeds so a mid-run failure never leaves mixed versions.
		$staged = array();

		foreach ( self::BUNDLES as $bundle ) {
			$filename = 'slashed.' . $bundle . '.css';
			$tmp_path = $dist_dir . $filename . '.tmp';
			$url      = sprintf( self::CDN_BASE, rawurlencode( $version ), $filename );

			$response = wp_remote_get(
				$url,
				array(
					'timeout'    => 30,
					'user-agent' => 'SLASHED/' . SLASHED_VERSION . '; WordPress/' . get_bloginfo( 'version' ),
				)
			);

			if ( is_wp_error( $response ) ) {
				foreach ( $staged as $f ) { $wp_filesystem->delete( $f ); }
				return $response;
			}
			if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
				foreach ( $staged as $f ) { $wp_filesystem->delete( $f ); }
				return new WP_Error(
					'download_failed',
					/* translators: %1$s: filename, %2$d: HTTP status code */
					sprintf( __( 'Could not download %1$s (HTTP %2$d).', 'slashed' ), $filename, wp_remote_retrieve_response_code( $response ) )
				);
			}

			$content = wp_remote_retrieve_body( $response );
			if ( ! $wp_filesystem->put_contents( $tmp_path, $content, FS_CHMOD_FILE ) ) {
				foreach ( $staged as $f ) { $wp_filesystem->delete( $f ); }
				return new WP_Error(
					'write_failed',
					/* translators: %s: filename */
					sprintf( __( 'Could not write %s. Check file permissions.', 'slashed' ), $filename )
				);
			}

			$staged[] = $tmp_path;
		}

		// All downloads staged — atomically move each to its final path.
		foreach ( self::BUNDLES as $bundle ) {
			$filename   = 'slashed.' . $bundle . '.css';
			$tmp_path   = $dist_dir . $filename . '.tmp';
			$final_path = $dist_dir . $filename;

			if ( ! $wp_filesystem->move( $tmp_path, $final_path, true ) ) {
				foreach ( $staged as $f ) { $wp_filesystem->delete( $f ); }
				return new WP_Error(
					'rename_failed',
					/* translators: %s: filename */
					sprintf( __( 'Could not install %s. Check file permissions.', 'slashed' ), $filename )
				);
			}
		}

		update_option( self::LOCAL_VER_OPTION, $version );
		delete_transient( self::TRANSIENT_KEY );

		return true;
	}

	/**
	 * AJAX: return the latest available version tag.
	 */
	public function ajax_check_update() {
		check_ajax_referer( 'slashed_framework_update', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die();
		}

		$latest = self::get_latest_version();
		if ( $latest ) {
			wp_send_json_success( array( 'latest' => $latest ) );
		} else {
			wp_send_json_error( array( 'message' => __( 'Could not reach update server. Try again later.', 'slashed' ) ) );
		}
	}

	/**
	 * AJAX: download CSS bundles for a version (defaults to latest).
	 *
	 * Accepts an optional `version` POST parameter; if absent or invalid,
	 * resolves to the latest published tag.
	 */
	public function ajax_do_update() {
		check_ajax_referer( 'slashed_framework_update', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die();
		}

		$version = isset( $_POST['version'] ) ? sanitize_text_field( wp_unslash( $_POST['version'] ) ) : '';
		if ( $version && preg_match( '/^v?\d+\.\d+\.\d+[a-zA-Z0-9.-]*$/', $version ) ) {
			// Normalize to vX.Y.Z[...] form.
			$version = 'v' . ltrim( $version, 'v' );
		} else {
			$version = self::get_latest_version();
		}
		if ( ! $version ) {
			wp_send_json_error( array( 'message' => __( 'Could not determine version to download.', 'slashed' ) ) );
			return;
		}

		$result = self::download_files( $version );
		if ( is_wp_error( $result ) ) {
			wp_send_json_error( array( 'message' => $result->get_error_message() ) );
			return;
		}

		wp_send_json_success(
			array(
				'version' => $version,
				/* translators: %s: version tag */
				'message' => sprintf( __( 'Updated to %s.', 'slashed' ), $version ),
			)
		);
	}
}
