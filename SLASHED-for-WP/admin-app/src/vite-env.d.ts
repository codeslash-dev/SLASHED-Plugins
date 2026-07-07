/// <reference types="vite/client" />

declare const __SLASHED_VERSION__: string;

/**
 * Present only when the configurator is embedded in the SLASHED WordPress
 * plugin (printed via wp_localize_script). Absent in standalone builds.
 */
interface Window {
  slashedApp?: {
    rest?: { url?: string; nonce?: string };
    overrides?: Record<string, string>;
    versions?: { plugin?: string; framework?: string; css_source?: string };
    pluginSettings?: { configurator_url?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
}
