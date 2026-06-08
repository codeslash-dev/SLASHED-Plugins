<?php
/**
 * Variable registration for the Bricks Builder Variable Manager and
 * code editor autocomplete.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Slashed_Bricks_Variables
 *
 * Registers SLASHED CSS custom properties with both the Bricks Variable
 * Manager (picker) and the code editor autocomplete.
 *
 * Strategy
 * --------
 * Bricks reads global variables from the wp_options row
 * `bricks_global_variables` (categories from
 * `bricks_global_variables_categories`). Both options are read via
 * get_option() during theme initialization.
 *
 * We treat SLASHED entries as managed/virtual - the same inject-on-read,
 * strip-on-save pattern used by the Classes and Colors modules:
 *
 *   1. On every read of either option, inject our entries.
 *   2. On every write (save from the UI, import, etc.), strip our entries
 *      back out so the database never persists them. The integration
 *      remains the single source of truth.
 *
 * Each variable is registered under its native name WITHOUT the leading
 * `--` prefix (e.g. `sf-color-primary`). Bricks automatically prepends
 * `--` when inserting via the picker, so the user sees and gets
 * `var(--sf-color-primary)` - the framework's own custom property.
 *
 * The `value` field is set to an empty string for every entry. Bricks
 * skips empty-value variables in its `:root` CSS output, so the
 * framework's own definitions remain the single source of truth. No
 * aliases, no duplication, no extra CSS. The Variable Manager becomes a
 * picker-only integration: users can browse and insert framework tokens
 * without the plugin emitting any competing declarations.
 *
 * The code editor autocomplete (bricks/code/get_code_signatures) continues
 * to list the full `--sf-*` names so authors typing custom CSS see the
 * framework's native namespace directly.
 */
class Slashed_Bricks_Variables {

    /**
     * Prefix used on every variable id this integration injects.
     * Used to identify our entries when stripping on save.
     */
    const ID_PREFIX = 'slashed-';

    /**
     * Prefix used on every category id this integration injects.
     */
    const CAT_PREFIX = 'slashed-cat-';

    /**
     * Constructor. Register option filters and code editor hook.
     */
    public function __construct() {
        // Inject SLASHED variables when Bricks reads the option.
        add_filter( 'option_bricks_global_variables', array( $this, 'inject_variables' ), 20 );
        add_filter( 'default_option_bricks_global_variables', array( $this, 'inject_variables' ), 20 );

        // Strip SLASHED variables before they are persisted back to the DB.
        add_filter( 'pre_update_option_bricks_global_variables', array( $this, 'strip_variables' ), 10, 1 );

        // Same managed/virtual pattern for variable categories.
        add_filter( 'option_bricks_global_variables_categories', array( $this, 'inject_categories' ), 20 );
        add_filter( 'default_option_bricks_global_variables_categories', array( $this, 'inject_categories' ), 20 );
        add_filter( 'pre_update_option_bricks_global_variables_categories', array( $this, 'strip_categories' ), 10, 1 );

        // Code editor autocomplete (Bricks 1.9.2+): lists the original
        // --sf-* names so authors typing custom CSS see the framework's
        // native namespace directly.
        add_filter( 'bricks/code/get_code_signatures', array( $this, 'register_code_signatures' ) );
    }

    // ---------------------------------------------------------------
    // Variable Manager: inject / strip.
    // ---------------------------------------------------------------

    /**
     * Inject SLASHED variables into the Bricks global variables list.
     *
     * Idempotent: any existing SLASHED-prefixed entries are removed first
     * so multiple read passes don't create duplicates.
     *
     * @param mixed $variables Existing value of bricks_global_variables option.
     * @return array
     */
    public function inject_variables( $variables ) {
        if ( ! is_array( $variables ) ) {
            $variables = array();
        }

        $variables = $this->strip_variables( $variables );

        foreach ( $this->build_variables() as $entry ) {
            $variables[] = $entry;
        }

        return $variables;
    }

    /**
     * Remove SLASHED-prefixed entries from a global variables array.
     *
     * Always returns a clean array, even when the option is malformed.
     *
     * @param mixed $variables Value of bricks_global_variables option.
     * @return array
     */
    public function strip_variables( $variables ) {
        return $this->strip_prefixed( $variables, self::ID_PREFIX );
    }

    /**
     * Inject SLASHED variable category entries.
     *
     * @param mixed $categories Existing value of bricks_global_variables_categories option.
     * @return array
     */
    public function inject_categories( $categories ) {
        if ( ! is_array( $categories ) ) {
            $categories = array();
        }

        $categories = $this->strip_categories( $categories );

        foreach ( $this->build_categories() as $cat ) {
            $categories[] = $cat;
        }

        return $categories;
    }

    /**
     * Remove SLASHED-prefixed categories from a categories array.
     *
     * @param mixed $categories Value of bricks_global_variables_categories option.
     * @return array
     */
    public function strip_categories( $categories ) {
        return $this->strip_prefixed( $categories, self::CAT_PREFIX );
    }

    /**
     * Shared "strip every entry whose id starts with the given prefix" helper.
     *
     * @param mixed  $entries Possibly malformed list of `{id,...}` entries.
     * @param string $prefix  Prefix to match against.
     * @return array
     */
    private function strip_prefixed( $entries, $prefix ) {
        if ( ! is_array( $entries ) ) {
            return array();
        }

        $kept = array();
        foreach ( $entries as $entry ) {
            if ( is_array( $entry )
                && isset( $entry['id'] )
                && is_string( $entry['id'] )
                && 0 === strpos( $entry['id'], $prefix )
            ) {
                continue;
            }
            $kept[] = $entry;
        }

        return array_values( $kept );
    }

    // ---------------------------------------------------------------
    // Variable Manager: build entries.
    // ---------------------------------------------------------------

    /**
     * Build SLASHED variable entries from the inventory.
     *
     * Each entry follows the Bricks-native variable shape:
     *   { id, name, value, category }
     *
     * - `id` is a stable slashed-* slug so strip_variables() can find it.
     * - `name` is the native property name WITHOUT the `--` prefix (Bricks
     *   adds `--` automatically), e.g. `sf-color-primary`.
     * - `value` is empty string - Bricks skips empty values in :root output,
     *   so the framework remains the single source of truth.
     * - `category` references one of our stable category ids.
     *
     * @return array<int, array<string,string>>
     */
    public function build_variables() {
        $entries = array();

        foreach ( $this->get_variables() as $category => $vars ) {
            $cat_id = self::CAT_PREFIX . sanitize_key( $category );

            foreach ( $vars as $var ) {
                // Strip leading '--' to get the native name Bricks expects.
                $native_name = ltrim( $var, '-' );

                $entries[] = array(
                    'id'       => self::ID_PREFIX . $native_name,
                    'name'     => $native_name,
                    'value'    => '',
                    'category' => $cat_id,
                );
            }
        }

        /**
         * Filter the SLASHED variable entries before injection.
         *
         * @param array $entries Variable entries.
         */
        return apply_filters( 'slashed_bricks/registered_variables', $entries );
    }

    /**
     * Build SLASHED variable category entries.
     *
     * @return array<int, array<string,string>>
     */
    public function build_categories() {
        $categories = array();

        foreach ( $this->get_variables() as $category => $vars ) {
            if ( empty( $vars ) ) {
                continue;
            }

            $categories[] = array(
                'id'   => self::CAT_PREFIX . sanitize_key( $category ),
                'name' => 'SLASHED ' . $category,
            );
        }

        return $categories;
    }

    // ---------------------------------------------------------------
    // Shared variable source.
    // ---------------------------------------------------------------

    /**
     * Get all SLASHED CSS variables grouped by category.
     *
     * @return array<string, string[]> Map of category => variable names.
     */
    public function get_variables() {
        $variables = Slashed_Bricks_Inventory::get_variables_by_category();

        /**
         * Filter the registered CSS variables.
         *
         * @param array $variables Map of category => variable names.
         */
        return apply_filters( 'slashed_bricks/variables', $variables );
    }

    // ---------------------------------------------------------------
    // Code editor autocomplete.
    // ---------------------------------------------------------------

    /**
     * Register variables for the Bricks code editor autocomplete.
     *
     * Uses the original --sf-* names so authors writing CSS see the
     * framework's native namespace directly.
     *
     * @param array $signatures Existing code signatures.
     * @return array Modified code signatures.
     */
    public function register_code_signatures( $signatures ) {
        if ( ! is_array( $signatures ) ) {
            $signatures = array();
        }

        $css_vars = array();
        foreach ( $this->get_variables() as $category => $vars ) {
            foreach ( $vars as $var ) {
                $css_vars[] = array(
                    'label'  => $var,
                    'detail' => 'SLASHED ' . $category,
                    'type'   => 'variable',
                );
            }
        }

        if ( ! isset( $signatures['css'] ) || ! is_array( $signatures['css'] ) ) {
            $signatures['css'] = array();
        }

        $signatures['css']['slashed_variables'] = $css_vars;

        return $signatures;
    }
}
