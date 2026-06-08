<?php
/**
 * Class registration for the Bricks Builder Global Class Manager.
 *
 * @package SLASHED_Bricks
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Slashed_Bricks_Classes
 *
 * Registers SLASHED utility, layout, and state classes with Bricks Builder
 * by injecting them into the Global Class Manager (the canonical home for
 * Bricks classes since 1.9.5).
 *
 * Strategy
 * --------
 * Bricks reads global classes from the wp_options row `bricks_global_classes`
 * (categories from `bricks_global_classes_categories`). Both options are read
 * via get_option() inside Bricks' Database::__construct() which runs during
 * theme functions.php load — before after_setup_theme fires. This class must
 * therefore be instantiated at plugins_loaded (handled in slashed-bricks.php)
 * so our option filters are registered before that first read.
 *
 * We treat SLASHED entries as managed/virtual — the same pattern the Colors
 * and Variables modules use for their respective options:
 *
 *   1. On every read of either option, inject our entries.
 *   2. On every write (save from the UI, import, etc.), strip our entries
 *      back out so the database never persists them - the integration
 *      remains the single source of truth and bumping the framework or
 *      switching the active CSS bundle automatically refreshes what shows
 *      up in the Class Manager.
 *
 * Each class is shipped as `settings: { locked: true }` so it lands in the
 * Manager's "Locked" filter group: users can apply `.sf-stack`, `.is-active`,
 * etc. on elements but cannot accidentally edit the framework selectors.
 * The actual CSS rules are still authored in the SLASHED bundle - Bricks
 * just stores a reference to the class name.
 *
 * Hooks Bricks 1.9.2-1.9.4 do not have class categories; the
 * `bricks_global_classes_categories` filters are still safe there because
 * Bricks simply never reads the option.
 */
class Slashed_Bricks_Classes {

    /**
     * Prefix used on every class id and category id this integration injects.
     * Used to identify our entries when stripping on save.
     */
    const ID_PREFIX = 'slashed-';

    /**
     * Stable category ids. These live in `bricks_global_classes_categories`
     * and each class entry references one via its `category` field.
     */
    const CATEGORY_LAYOUT = 'slashed-cat-layout';
    const CATEGORY_STATE  = 'slashed-cat-state';

    /**
     * Constructor. Register option filters.
     */
    public function __construct() {
        // Inject SLASHED classes when Bricks reads the option. Run late
        // so any other plugin's additions are preserved.
        add_filter( 'option_bricks_global_classes', array( $this, 'inject_classes' ), 20 );
        add_filter( 'default_option_bricks_global_classes', array( $this, 'inject_classes' ), 20 );

        // Strip SLASHED classes before they are persisted back to the DB.
        // pre_update_option_* hooks must never widen the stored type from
        // array to scalar - that would break Bricks' own loader, which
        // iterates over the option.
        add_filter( 'pre_update_option_bricks_global_classes', array( $this, 'strip_classes' ), 10, 1 );

        // Same managed/virtual pattern for class categories (Bricks 1.9.5+).
        add_filter( 'option_bricks_global_classes_categories', array( $this, 'inject_categories' ), 20 );
        add_filter( 'default_option_bricks_global_classes_categories', array( $this, 'inject_categories' ), 20 );
        add_filter( 'pre_update_option_bricks_global_classes_categories', array( $this, 'strip_categories' ), 10, 1 );
    }

    /**
     * Inject SLASHED classes into the Bricks global classes list.
     *
     * Idempotent: any existing SLASHED-prefixed entries are removed first
     * so multiple read passes don't create duplicates.
     *
     * @param mixed $classes Existing value of bricks_global_classes option.
     * @return array
     */
    public function inject_classes( $classes ) {
        if ( ! is_array( $classes ) ) {
            $classes = array();
        }

        $classes = $this->strip_classes( $classes );

        foreach ( $this->build_classes() as $entry ) {
            $classes[] = $entry;
        }

        return $classes;
    }

    /**
     * Remove SLASHED-prefixed entries from a global classes array.
     *
     * Always returns a clean array, even when the option is malformed.
     *
     * @param mixed $classes Value of bricks_global_classes option.
     * @return array
     */
    public function strip_classes( $classes ) {
        return $this->strip_prefixed( $classes );
    }

    /**
     * Inject SLASHED class category entries.
     *
     * @param mixed $categories Existing value of bricks_global_classes_categories option.
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
     * @param mixed $categories Value of bricks_global_classes_categories option.
     * @return array
     */
    public function strip_categories( $categories ) {
        return $this->strip_prefixed( $categories );
    }

    /**
     * Shared "strip every entry whose id starts with our prefix" helper.
     *
     * @param mixed $entries Possibly malformed list of `{id,...}` entries.
     * @return array
     */
    private function strip_prefixed( $entries ) {
        if ( ! is_array( $entries ) ) {
            return array();
        }

        $kept = array();
        foreach ( $entries as $entry ) {
            if ( is_array( $entry )
                && isset( $entry['id'] )
                && is_string( $entry['id'] )
                && 0 === strpos( $entry['id'], self::ID_PREFIX )
            ) {
                continue;
            }
            $kept[] = $entry;
        }

        return array_values( $kept );
    }

    /**
     * Build SLASHED class entries from the inventory.
     *
     * Each entry follows the Bricks-native shape:
     *   { id, name, settings: { locked: true }, category }
     *
     * - `id` is a stable slashed-* slug so strip_classes() can find it
     *   reliably across read passes; Bricks accepts any unique string.
     * - `name` is the actual class name users will apply (e.g. "sf-stack").
     * - `settings.locked` puts the entry in the Class Manager's Locked
     *   filter so framework classes aren't accidentally edited.
     * - `category` references one of our stable category ids.
     *
     * @return array<int, array<string,mixed>>
     */
    public function build_classes() {
        $entries = array();

        foreach ( Slashed_Bricks_Inventory::get_sf_classes() as $name ) {
            $entries[] = array(
                'id'       => self::ID_PREFIX . sanitize_key( $name ),
                'name'     => $name,
                'settings' => array( 'locked' => true ),
                'category' => self::CATEGORY_LAYOUT,
            );
        }

        foreach ( Slashed_Bricks_Inventory::get_is_classes() as $name ) {
            $entries[] = array(
                'id'       => self::ID_PREFIX . sanitize_key( $name ),
                'name'     => $name,
                'settings' => array( 'locked' => true ),
                'category' => self::CATEGORY_STATE,
            );
        }

        /**
         * Filter the SLASHED class entries before injection.
         *
         * @param array $entries Class entries.
         */
        return apply_filters( 'slashed_bricks/registered_classes', $entries );
    }

    /**
     * Build SLASHED class category entries.
     *
     * @return array<int, array<string,string>>
     */
    public function build_categories() {
        return array(
            array( 'id' => self::CATEGORY_LAYOUT, 'name' => __( 'SLASHED Layout', 'slashed-bricks' ) ),
            array( 'id' => self::CATEGORY_STATE,  'name' => __( 'SLASHED State', 'slashed-bricks' ) ),
        );
    }
}
