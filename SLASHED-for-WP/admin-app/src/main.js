/**
 * SLASHED admin SPA entry point.
 *
 * Mounts the Svelte app into #slashed-admin-app (printed by class-token-page.php).
 * All hydration data comes from window.slashedApp (wp_localize_script).
 */
import { mount } from 'svelte';
import App from './App.svelte';
import './styles/app.css';

const target = document.getElementById('slashed-admin-app');
if (target) {
  target.innerHTML = '';
  mount(App, { target });
}
