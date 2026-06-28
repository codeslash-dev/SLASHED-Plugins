<script lang="ts">
  import { Sun, Moon, Smartphone, Tablet, Monitor, RefreshCw, ExternalLink, Columns2 } from 'lucide-svelte';
  import type { PreviewTemplate } from '../../types';
  import { fa } from '../../lib/codec';
  import { registerPreviewDoc, bumpPreviewVersion } from '../../lib/previewResolver.svelte';
  import { lumlockerPreview } from '../../lib/lumlockerPreview.svelte';
  // Import the built framework CSS at Vite compile time — always in sync with badges/.
  // The @framework-css alias is remapped by the WP plugin to its vendored bundle.
  import frameworkCSSStatic from '@framework-css/badges/slashed.full.css?raw';

  let { overrides, previewTheme, previewWidth, previewMotion, previewTemplate,
    onThemeChange, onWidthChange, onMotionChange, onTemplateChange }: {
    overrides: Record<string, string>;
    previewTheme: "light" | "dark";
    previewWidth: "fluid" | "mobile" | "tablet" | "desktop";
    previewMotion: "normal" | "slow" | "none";
    previewTemplate: PreviewTemplate;
    onThemeChange: (t: "light" | "dark") => void;
    onWidthChange: (w: "fluid" | "mobile" | "tablet" | "desktop") => void;
    onMotionChange: (m: "normal" | "slow" | "none") => void;
    onTemplateChange: (t: PreviewTemplate) => void;
  } = $props();

  const TEMPLATES: { id: PreviewTemplate; label: string }[] = [
    { id: "marketing", label: "Marketing" },
    { id: "docs", label: "Docs" },
    { id: "dashboard", label: "Dashboard" },
    { id: "components", label: "Components" },
    { id: "stylescape", label: "Stylescape" },
  ];

  // --- Google Fonts helpers ---

  const SYSTEM_FONT_NAMES = new Set([
    "system-ui", "-apple-system", "BlinkMacSystemFont",
    "ui-monospace", "ui-serif", "ui-sans-serif",
    "sans-serif", "serif", "monospace", "cursive", "fantasy",
    "Georgia", "Times New Roman", "Times", "Impact",
    "Arial Narrow", "Arial", "Helvetica", "Helvetica Neue",
    "Courier New", "Courier", "Fira Code", "Verdana",
  ]);

  function extractFontName(familyValue: string): string | null {
    if (!familyValue?.trim()) return null;
    const quotedMatch = familyValue.trim().match(/^['"]([^'"]+)['"]/);
    const name = quotedMatch ? quotedMatch[1] : familyValue.split(",")[0];
    const trimmed = name.trim();
    return trimmed && !SYSTEM_FONT_NAMES.has(trimmed) ? trimmed : null;
  }

  function getGoogleFonts(ov: Record<string, string>): { name: string; url: string }[] {
    const seen = new Set<string>();
    const result: { name: string; url: string }[] = [];
    for (const token of ["--sf-font-body", "--sf-font-heading", "--sf-font-mono"]) {
      const name = extractFontName(ov[token] ?? "");
      if (!name || seen.has(name)) continue;
      seen.add(name);
      result.push({
        name,
        url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap`,
      });
    }
    return result;
  }

  function injectFontsIntoDoc(doc: Document, ov: Record<string, string>) {
    for (const { name, url } of getGoogleFonts(ov)) {
      const id = `gf-${name.replace(/\s+/g, "-").toLowerCase()}`;
      if (!doc.getElementById(id)) {
        const link = doc.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = url;
        doc.head.appendChild(link);
      }
    }
  }

  const MARKETING_BODY = `
<header class="sf-site-header" style="position:sticky;top:0;z-index:50;background:var(--sf-color-base);border-bottom:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);padding:var(--sf-space-s) var(--sf-space-l);">
  <div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;">
    <div style="font-weight:700;font-size:var(--sf-text-l);color:var(--sf-color-primary-600);">SlashedUI</div>
    <nav style="display:flex;gap:var(--sf-space-m);font-size:var(--sf-text-s);">
      <a href="#" style="color:var(--sf-color-text--secondary);text-decoration:none;">Docs</a>
      <a href="#" style="color:var(--sf-color-text--secondary);text-decoration:none;">Components</a>
      <a href="#" style="color:var(--sf-color-text--secondary);text-decoration:none;">Themes</a>
    </nav>
    <button class="sf-btn sf-btn-primary" style="font-size:var(--sf-text-s);">Get Started</button>
  </div>
</header>
<main style="max-width:1200px;margin:0 auto;padding:var(--sf-space-2xl) var(--sf-space-l);">
  <section style="text-align:center;margin-bottom:var(--sf-space-2xl);">
    <div style="display:inline-flex;align-items:center;gap:var(--sf-space-xs);background:var(--sf-color-primary-50);color:var(--sf-color-primary-700);border:var(--sf-border-width-1) solid var(--sf-color-primary-200);border-radius:var(--sf-radius-full);padding:var(--sf-space-2xs) var(--sf-space-s);font-size:var(--sf-text-xs);font-weight:600;margin-bottom:var(--sf-space-l);">
      ✨ Now in v2 — OKLCH color engine
    </div>
    <h1 style="font-size:var(--sf-text-display-l);font-weight:800;color:var(--sf-color-text);margin-bottom:var(--sf-space-l);line-height:1.1;">
      Design systems,<br/><span style="color:var(--sf-color-primary-600);">perfected.</span>
    </h1>
    <p style="font-size:var(--sf-text-l);color:var(--sf-color-text--secondary);max-width:540px;margin:0 auto var(--sf-space-xl);">
      A CSS framework built on 840 design tokens. One line to install, infinitely customisable.
    </p>
    <div style="display:flex;gap:var(--sf-space-s);justify-content:center;flex-wrap:wrap;">
      <button class="sf-btn sf-btn-primary" style="font-size:var(--sf-text-m);">Start for free</button>
      <button class="sf-btn sf-btn-ghost" style="font-size:var(--sf-text-m);">View docs →</button>
    </div>
  </section>
  <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sf-space-l);margin-bottom:var(--sf-space-2xl);">
    <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-l);padding:var(--sf-space-l);">
      <div style="font-size:2rem;margin-bottom:var(--sf-space-s);">🎨</div>
      <h3 style="font-size:var(--sf-text-l);font-weight:700;color:var(--sf-color-text);margin-bottom:var(--sf-space-xs);">OKLCH Colors</h3>
      <p style="font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);line-height:1.6;">Perceptually uniform color ramps with auto dark-mode derivation.</p>
    </div>
    <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-l);padding:var(--sf-space-l);">
      <div style="font-size:2rem;margin-bottom:var(--sf-space-s);">📐</div>
      <h3 style="font-size:var(--sf-text-l);font-weight:700;color:var(--sf-color-text);margin-bottom:var(--sf-space-xs);">Fluid Scales</h3>
      <p style="font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);line-height:1.6;">Type and space that scales smoothly from mobile to 4K.</p>
    </div>
    <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-l);padding:var(--sf-space-l);">
      <div style="font-size:2rem;margin-bottom:var(--sf-space-s);">⚡</div>
      <h3 style="font-size:var(--sf-text-l);font-weight:700;color:var(--sf-color-text);margin-bottom:var(--sf-space-xs);">Zero JS</h3>
      <p style="font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);line-height:1.6;">Pure CSS custom properties — works with any framework.</p>
    </div>
  </section>
  <section style="background:linear-gradient(135deg,var(--sf-color-primary-600),var(--sf-color-action-600,var(--sf-color-primary-700)));border-radius:var(--sf-radius-xl);padding:var(--sf-space-xl) var(--sf-space-xl);text-align:center;color:#fff;">
    <h2 style="font-size:var(--sf-text-display-s);font-weight:800;margin-bottom:var(--sf-space-s);">Ready to ship faster?</h2>
    <p style="font-size:var(--sf-text-m);opacity:0.85;margin-bottom:var(--sf-space-l);">Join 12,000+ developers using SLASHED in production.</p>
    <button style="background:#fff;color:var(--sf-color-primary-700);border:none;border-radius:var(--sf-radius-m);padding:var(--sf-space-s) var(--sf-space-l);font-size:var(--sf-text-m);font-weight:700;cursor:pointer;">Install now — it's free</button>
  </section>
</main>`;

  const DOCS_BODY = `
<div style="display:grid;grid-template-columns:240px 1fr;height:100%;gap:0;">
  <aside style="background:var(--sf-color-base);border-right:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);padding:var(--sf-space-l);overflow-y:auto;">
    <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--sf-space-s);">Getting started</div>
    <ul style="list-style:none;padding:0;margin:0 0 var(--sf-space-l);">
      <li style="padding:var(--sf-space-xs) var(--sf-space-xs);border-radius:var(--sf-radius-s);background:var(--sf-color-primary-100);color:var(--sf-color-primary-700);font-size:var(--sf-text-s);font-weight:600;margin-bottom:2px;">Introduction</li>
      <li style="padding:var(--sf-space-xs) var(--sf-space-xs);font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);margin-bottom:2px;cursor:pointer;">Installation</li>
      <li style="padding:var(--sf-space-xs) var(--sf-space-xs);font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);margin-bottom:2px;cursor:pointer;">Quick start</li>
    </ul>
  </aside>
  <main style="padding:var(--sf-space-xl) var(--sf-space-xl);overflow-y:auto;max-width:800px;">
    <h1 style="font-size:var(--sf-text-display-s);font-weight:800;color:var(--sf-color-text);margin-bottom:var(--sf-space-m);">Introduction</h1>
    <p style="font-size:var(--sf-text-m);color:var(--sf-color-text--secondary);line-height:1.7;margin-bottom:var(--sf-space-l);">SLASHED is a CSS design-token framework built around ~840 custom properties.</p>
    <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-m);padding:var(--sf-space-m) var(--sf-space-l);font-family:var(--sf-font-mono);font-size:var(--sf-text-s);color:var(--sf-color-text);margin-bottom:var(--sf-space-l);">npm install slashed</div>
  </main>
</div>`;

  const DASHBOARD_BODY = `
<div style="display:grid;grid-template-columns:200px 1fr;height:100%;background:var(--sf-color-base);">
  <aside style="background:var(--sf-color-base);border-right:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);padding:var(--sf-space-m);">
    <div style="font-size:var(--sf-text-s);font-weight:700;color:var(--sf-color-text);margin-bottom:var(--sf-space-l);padding:var(--sf-space-xs);">⚡ Dashboard</div>
    <ul style="list-style:none;padding:0;margin:0;">
      <li style="padding:var(--sf-space-xs) var(--sf-space-s);border-radius:var(--sf-radius-s);background:var(--sf-color-primary-100);color:var(--sf-color-primary-700);font-size:var(--sf-text-s);font-weight:600;margin-bottom:2px;">Overview</li>
      <li style="padding:var(--sf-space-xs) var(--sf-space-s);font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);margin-bottom:2px;cursor:pointer;">Analytics</li>
      <li style="padding:var(--sf-space-xs) var(--sf-space-s);font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);margin-bottom:2px;cursor:pointer;">Users</li>
    </ul>
  </aside>
  <main style="padding:var(--sf-space-l);overflow-y:auto;">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sf-space-m);margin-bottom:var(--sf-space-l);">
      <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-l);padding:var(--sf-space-l);">
        <div style="font-size:var(--sf-text-xs);font-weight:600;color:var(--sf-color-text--muted);text-transform:uppercase;margin-bottom:var(--sf-space-xs);">Revenue</div>
        <div style="font-size:var(--sf-text-2xl);font-weight:800;color:var(--sf-color-text);">$48.2k</div>
        <div style="font-size:var(--sf-text-xs);color:var(--sf-color-success);">↑ 12% vs last month</div>
      </div>
      <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-l);padding:var(--sf-space-l);">
        <div style="font-size:var(--sf-text-xs);font-weight:600;color:var(--sf-color-text--muted);text-transform:uppercase;margin-bottom:var(--sf-space-xs);">Users</div>
        <div style="font-size:var(--sf-text-2xl);font-weight:800;color:var(--sf-color-text);">12,431</div>
        <div style="font-size:var(--sf-text-xs);color:var(--sf-color-success);">↑ 8% vs last month</div>
      </div>
      <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-l);padding:var(--sf-space-l);">
        <div style="font-size:var(--sf-text-xs);font-weight:600;color:var(--sf-color-text--muted);text-transform:uppercase;margin-bottom:var(--sf-space-xs);">Conversions</div>
        <div style="font-size:var(--sf-text-2xl);font-weight:800;color:var(--sf-color-text);">3.6%</div>
        <div style="font-size:var(--sf-text-xs);color:var(--sf-color-warning);">→ Flat</div>
      </div>
      <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-l);padding:var(--sf-space-l);">
        <div style="font-size:var(--sf-text-xs);font-weight:600;color:var(--sf-color-text--muted);text-transform:uppercase;margin-bottom:var(--sf-space-xs);">Tickets open</div>
        <div style="font-size:var(--sf-text-2xl);font-weight:800;color:var(--sf-color-text);">24</div>
        <div style="font-size:var(--sf-text-xs);color:var(--sf-color-danger);">↑ 3 since yesterday</div>
      </div>
    </div>
  </main>
</div>`;

  const COMPONENTS_BODY = `
<div style="padding:var(--sf-space-l);background:var(--sf-color-base);min-height:100%;">
  <h2 style="font-size:var(--sf-text-xl);font-weight:700;color:var(--sf-color-text);margin-bottom:var(--sf-space-l);">Component showcase</h2>
  <div style="margin-bottom:var(--sf-space-xl);">
    <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--sf-space-s);">Buttons</div>
    <div style="display:flex;gap:var(--sf-space-s);flex-wrap:wrap;align-items:center;">
      <button class="sf-btn sf-btn-primary">Primary</button>
      <button class="sf-btn sf-btn-secondary">Secondary</button>
      <button class="sf-btn sf-btn-ghost">Ghost</button>
      <button class="sf-btn sf-btn-danger">Danger</button>
      <button class="sf-btn sf-btn-primary" disabled>Disabled</button>
    </div>
  </div>
  <div style="margin-bottom:var(--sf-space-xl);">
    <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--sf-space-s);">Form &amp; links</div>
    <div style="display:flex;flex-direction:column;gap:var(--sf-space-s);max-width:360px;">
      <input class="sf-input" type="text" placeholder="Type here — see caret &amp; focus ring" style="width:100%;padding:var(--sf-field-padding-block,0.375rem) var(--sf-field-padding-inline,0.75rem);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-field-radius,var(--sf-radius-m));background:var(--sf-color-base);color:var(--sf-color-text);caret-color:var(--sf-caret-color,var(--sf-color-action));font-size:var(--sf-text-s);" />
      <p style="font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);">
        Read the <a href="#" style="color:var(--sf-color-link,var(--sf-color-action));text-decoration:underline;text-underline-offset:var(--sf-link-underline-offset,0.15em);text-decoration-thickness:var(--sf-link-underline-thickness,auto);">documentation link</a> to learn more.
      </p>
    </div>
    <!-- Divider -->
    <hr style="border:none;border-top:var(--sf-divider-width,var(--sf-border-width-1)) var(--sf-divider-style,var(--sf-border-style)) var(--sf-divider-color,var(--sf-color-border));margin:var(--sf-divider-gap,var(--sf-space-m)) 0;" />
  </div>
  <div style="margin-bottom:var(--sf-space-xl);">
    <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--sf-space-s);">Typography ramp</div>
    <div style="display:flex;flex-direction:column;gap:var(--sf-space-xs);">
      <div style="font-size:var(--sf-text-display-m);font-weight:800;color:var(--sf-color-text);line-height:1.1;">Display M</div>
      <div style="font-size:var(--sf-text-2xl);font-weight:700;color:var(--sf-color-text);">Heading 2XL</div>
      <div style="font-size:var(--sf-text-xl);font-weight:600;color:var(--sf-color-text);">Heading XL</div>
      <div style="font-size:var(--sf-text-m);color:var(--sf-color-text--secondary);line-height:1.6;">Body text. The quick brown fox jumps over the lazy dog.</div>
      <div style="font-size:var(--sf-text-s);color:var(--sf-color-text--muted);line-height:1.5;">Small caption text for metadata and secondary info.</div>
    </div>
  </div>
</div>`;

  const STYLESCAPE_BODY = `
<div style="padding:var(--sf-space-l) var(--sf-space-xl);background:var(--sf-color-bg,var(--sf-color-base));min-height:100%;font-family:var(--sf-font-body,sans-serif);color:var(--sf-color-text);">

  <!-- Header -->
  <div style="display:flex;align-items:baseline;gap:var(--sf-space-m);margin-bottom:var(--sf-space-2xl);padding-bottom:var(--sf-space-l);border-bottom:var(--sf-border-width-1,1px) var(--sf-border-style,solid) var(--sf-color-border);">
    <span style="font-size:var(--sf-text-display-s);font-weight:800;font-family:var(--sf-font-heading,inherit);line-height:1;color:var(--sf-color-text);">Design System</span>
    <span style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-primary-500);text-transform:uppercase;letter-spacing:0.12em;align-self:flex-end;padding:2px 8px;background:var(--sf-color-primary-50);border:1px solid var(--sf-color-primary-200);border-radius:var(--sf-radius-full);">Stylescape</span>
  </div>

  <!-- COLORS -->
  <section style="margin-bottom:var(--sf-space-2xl);">
    <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--sf-space-m);">Color palette</div>

    <div style="display:grid;grid-template-columns:40px 1fr;gap:4px var(--sf-space-s);align-items:center;margin-bottom:var(--sf-space-m);">
      <span style="font-size:9px;color:var(--sf-color-text--muted);font-family:monospace;">Primary</span>
      <div style="display:flex;gap:2px;height:36px;border-radius:var(--sf-radius-m);overflow:hidden;">
        <div style="flex:1;background:var(--sf-color-primary-50);" title="50"></div>
        <div style="flex:1;background:var(--sf-color-primary-100);" title="100"></div>
        <div style="flex:1;background:var(--sf-color-primary-200);" title="200"></div>
        <div style="flex:1;background:var(--sf-color-primary-300);" title="300"></div>
        <div style="flex:1;background:var(--sf-color-primary-400);" title="400"></div>
        <div style="flex:1;background:var(--sf-color-primary-500);" title="500"></div>
        <div style="flex:1;background:var(--sf-color-primary-600);" title="600"></div>
        <div style="flex:1;background:var(--sf-color-primary-700);" title="700"></div>
        <div style="flex:1;background:var(--sf-color-primary-800);" title="800"></div>
        <div style="flex:1;background:var(--sf-color-primary-900);" title="900"></div>
        <div style="flex:1;background:var(--sf-color-primary-950);" title="950"></div>
      </div>
      <span style="font-size:9px;color:var(--sf-color-text--muted);font-family:monospace;">Action</span>
      <div style="display:flex;gap:2px;height:36px;border-radius:var(--sf-radius-m);overflow:hidden;">
        <div style="flex:1;background:var(--sf-color-action-50,var(--sf-color-primary-50));"></div>
        <div style="flex:1;background:var(--sf-color-action-100,var(--sf-color-primary-100));"></div>
        <div style="flex:1;background:var(--sf-color-action-200,var(--sf-color-primary-200));"></div>
        <div style="flex:1;background:var(--sf-color-action-300,var(--sf-color-primary-300));"></div>
        <div style="flex:1;background:var(--sf-color-action-400,var(--sf-color-primary-400));"></div>
        <div style="flex:1;background:var(--sf-color-action-500,var(--sf-color-primary-500));"></div>
        <div style="flex:1;background:var(--sf-color-action-600,var(--sf-color-primary-600));"></div>
        <div style="flex:1;background:var(--sf-color-action-700,var(--sf-color-primary-700));"></div>
        <div style="flex:1;background:var(--sf-color-action-800,var(--sf-color-primary-800));"></div>
        <div style="flex:1;background:var(--sf-color-action-900,var(--sf-color-primary-900));"></div>
        <div style="flex:1;background:var(--sf-color-action-950,var(--sf-color-primary-950));"></div>
      </div>
      <span style="font-size:9px;color:var(--sf-color-text--muted);font-family:monospace;">Neutral</span>
      <div style="display:flex;gap:2px;height:36px;border-radius:var(--sf-radius-m);overflow:hidden;">
        <div style="flex:1;background:var(--sf-color-base-50);"></div>
        <div style="flex:1;background:var(--sf-color-base-100);"></div>
        <div style="flex:1;background:var(--sf-color-base-200);"></div>
        <div style="flex:1;background:var(--sf-color-base-300);"></div>
        <div style="flex:1;background:var(--sf-color-base-400);"></div>
        <div style="flex:1;background:var(--sf-color-base-500);"></div>
        <div style="flex:1;background:var(--sf-color-base-600);"></div>
        <div style="flex:1;background:var(--sf-color-base-700);"></div>
        <div style="flex:1;background:var(--sf-color-base-800);"></div>
        <div style="flex:1;background:var(--sf-color-base-900);"></div>
        <div style="flex:1;background:var(--sf-color-base-950);"></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sf-space-s);">
      <div style="background:var(--sf-color-success-50,oklch(96% 0.06 145));border:1px solid var(--sf-color-success-200,oklch(85% 0.1 145));border-radius:var(--sf-radius-m);padding:var(--sf-space-s);">
        <div style="width:28px;height:28px;background:var(--sf-color-success);border-radius:var(--sf-radius-s);margin-bottom:6px;"></div>
        <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-success-700,var(--sf-color-success));">Success</div>
      </div>
      <div style="background:var(--sf-color-warning-50,oklch(96% 0.06 85));border:1px solid var(--sf-color-warning-200,oklch(85% 0.1 85));border-radius:var(--sf-radius-m);padding:var(--sf-space-s);">
        <div style="width:28px;height:28px;background:var(--sf-color-warning);border-radius:var(--sf-radius-s);margin-bottom:6px;"></div>
        <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-warning-700,var(--sf-color-warning));">Warning</div>
      </div>
      <div style="background:var(--sf-color-danger-50,oklch(96% 0.06 25));border:1px solid var(--sf-color-danger-200,oklch(85% 0.1 25));border-radius:var(--sf-radius-m);padding:var(--sf-space-s);">
        <div style="width:28px;height:28px;background:var(--sf-color-danger);border-radius:var(--sf-radius-s);margin-bottom:6px;"></div>
        <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-danger-700,var(--sf-color-danger));">Danger</div>
      </div>
      <div style="background:var(--sf-color-info-50,var(--sf-color-primary-50));border:1px solid var(--sf-color-info-200,var(--sf-color-primary-200));border-radius:var(--sf-radius-m);padding:var(--sf-space-s);">
        <div style="width:28px;height:28px;background:var(--sf-color-info,var(--sf-color-primary-500));border-radius:var(--sf-radius-s);margin-bottom:6px;"></div>
        <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-info-700,var(--sf-color-primary-700));">Info</div>
      </div>
    </div>

    <!-- Gradients -->
    <div style="font-size:9px;color:var(--sf-color-text--muted);font-family:monospace;margin:var(--sf-space-m) 0 var(--sf-space-xs);">Gradients</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sf-space-s);">
      <div><div style="height:44px;border-radius:var(--sf-radius-m);background:var(--sf-gradient-primary);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);"></div><div style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;margin-top:3px;">primary</div></div>
      <div><div style="height:44px;border-radius:var(--sf-radius-m);background:var(--sf-gradient-brand);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);"></div><div style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;margin-top:3px;">brand</div></div>
      <div><div style="height:44px;border-radius:var(--sf-radius-m);background:var(--sf-gradient-tertiary);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);"></div><div style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;margin-top:3px;">tertiary</div></div>
      <div><div style="height:44px;border-radius:var(--sf-radius-m);background:var(--sf-gradient-surface);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);"></div><div style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;margin-top:3px;">surface</div></div>
    </div>
  </section>

  <!-- TYPOGRAPHY -->
  <section style="margin-bottom:var(--sf-space-2xl);">
    <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--sf-space-m);">Typography</div>

    <div style="margin-bottom:var(--sf-space-l);padding:var(--sf-space-l);background:var(--sf-color-base-50);border:var(--sf-border-width-1,1px) var(--sf-border-style,solid) var(--sf-color-border);border-radius:var(--sf-radius-l);">
      <div style="font-size:var(--sf-text-display-l);font-weight:800;font-family:var(--sf-font-heading,inherit);line-height:1.0;color:var(--sf-color-text);margin-bottom:2px;">The quick brown fox</div>
      <div style="font-size:var(--sf-text-display-m);font-weight:700;font-family:var(--sf-font-heading,inherit);line-height:1.05;color:var(--sf-color-text);margin-bottom:2px;">jumps over the lazy dog</div>
      <div style="font-size:var(--sf-text-display-s);font-weight:600;font-family:var(--sf-font-heading,inherit);line-height:1.1;color:var(--sf-color-text--secondary);">Display S — heading family</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sf-space-l);">
      <div>
        <div style="font-size:var(--sf-text-2xl);font-weight:700;color:var(--sf-color-text);margin-bottom:5px;line-height:1.2;">Heading 2XL / 700</div>
        <div style="font-size:var(--sf-text-xl);font-weight:600;color:var(--sf-color-text);margin-bottom:5px;line-height:1.25;">Heading XL / 600</div>
        <div style="font-size:var(--sf-text-l);font-weight:600;color:var(--sf-color-text);margin-bottom:5px;line-height:1.3;">Heading L / 600</div>
        <div style="font-size:var(--sf-text-m);font-weight:600;color:var(--sf-color-text);margin-bottom:5px;">Heading M / 600</div>
        <div style="font-size:var(--sf-text-s);font-weight:600;color:var(--sf-color-text--secondary);margin-bottom:5px;">Heading S / 600</div>
        <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.08em;">LABEL / OVERLINE</div>
      </div>
      <div>
        <p style="font-size:var(--sf-text-m);color:var(--sf-color-text);line-height:1.65;margin:0 0 var(--sf-space-m);">Body — The quick brown fox jumps over the lazy dog. Good typography establishes hierarchy and builds trust with readers.</p>
        <p style="font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);line-height:1.6;margin:0 0 var(--sf-space-s);">Secondary — supporting text, descriptions, and metadata that help without competing with the primary content.</p>
        <p style="font-size:var(--sf-text-xs);color:var(--sf-color-text--muted);margin:0 0 var(--sf-space-s);">Micro / caption text for timestamps, tags, and helper copy.</p>
        <code style="font-family:var(--sf-font-mono);font-size:var(--sf-code-font-size,0.875em);background:var(--sf-color-base-100);padding:3px 7px;border-radius:var(--sf-radius-xs);color:var(--sf-color-text);">const tokens = design()</code>
        <div style="margin-top:var(--sf-space-s);font-size:var(--sf-text-s);"><strong>Bold</strong> — <em>italic</em> — <u style="text-underline-offset:3px;">underline</u> — <s>strikethrough</s></div>
      </div>
    </div>
  </section>

  <!-- BORDERS + SHADOWS -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sf-space-xl);margin-bottom:var(--sf-space-2xl);">
    <section>
      <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--sf-space-m);">Border radius</div>
      <div style="display:flex;gap:var(--sf-space-m);align-items:flex-end;flex-wrap:wrap;">
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-primary-100);border:2px solid var(--sf-color-primary-300);border-radius:var(--sf-radius-xs);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:4px;font-family:monospace;">xs</div></div>
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-primary-100);border:2px solid var(--sf-color-primary-300);border-radius:var(--sf-radius-s);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:4px;font-family:monospace;">s</div></div>
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-primary-100);border:2px solid var(--sf-color-primary-300);border-radius:var(--sf-radius-m);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:4px;font-family:monospace;">m</div></div>
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-primary-100);border:2px solid var(--sf-color-primary-300);border-radius:var(--sf-radius-l);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:4px;font-family:monospace;">l</div></div>
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-primary-100);border:2px solid var(--sf-color-primary-300);border-radius:var(--sf-radius-xl);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:4px;font-family:monospace;">xl</div></div>
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-primary-100);border:2px solid var(--sf-color-primary-300);border-radius:var(--sf-radius-2xl);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:4px;font-family:monospace;">2xl</div></div>
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-primary-100);border:2px solid var(--sf-color-primary-300);border-radius:var(--sf-radius-full);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:4px;font-family:monospace;">full</div></div>
      </div>
    </section>

    <section>
      <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--sf-space-m);">Shadows</div>
      <div style="display:flex;gap:var(--sf-space-m);align-items:flex-end;flex-wrap:wrap;">
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-base);box-shadow:var(--sf-shadow-xs);border-radius:var(--sf-radius-m);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:8px;font-family:monospace;">xs</div></div>
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-base);box-shadow:var(--sf-shadow-s);border-radius:var(--sf-radius-m);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:8px;font-family:monospace;">s</div></div>
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-base);box-shadow:var(--sf-shadow-m);border-radius:var(--sf-radius-m);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:8px;font-family:monospace;">m</div></div>
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-base);box-shadow:var(--sf-shadow-l);border-radius:var(--sf-radius-m);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:8px;font-family:monospace;">l</div></div>
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-base);box-shadow:var(--sf-shadow-xl);border-radius:var(--sf-radius-m);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:8px;font-family:monospace;">xl</div></div>
        <div style="text-align:center;"><div style="width:52px;height:52px;background:var(--sf-color-base);box-shadow:var(--sf-shadow-2xl);border-radius:var(--sf-radius-m);"></div><div style="font-size:9px;color:var(--sf-color-text--muted);margin-top:8px;font-family:monospace;">2xl</div></div>
      </div>
    </section>
  </div>

  <!-- COMPONENTS -->
  <section style="margin-bottom:var(--sf-space-2xl);">
    <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--sf-space-m);">Components</div>

    <div style="display:flex;gap:var(--sf-space-s);flex-wrap:wrap;align-items:center;margin-bottom:var(--sf-space-l);">
      <button class="sf-btn sf-btn-primary">Primary</button>
      <button class="sf-btn sf-btn-secondary">Secondary</button>
      <button class="sf-btn sf-btn-ghost">Ghost</button>
      <button class="sf-btn sf-btn-danger">Danger</button>
      <button class="sf-btn sf-btn-primary" disabled>Disabled</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sf-space-m);">
      <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1,1px) var(--sf-border-style,solid) var(--sf-color-border);border-radius:var(--sf-radius-l);padding:var(--sf-space-l);box-shadow:var(--sf-shadow-s);">
        <div style="width:40px;height:40px;background:var(--sf-color-primary-100);border-radius:var(--sf-radius-m);display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin-bottom:var(--sf-space-s);">🎨</div>
        <div style="font-size:var(--sf-text-m);font-weight:700;color:var(--sf-color-text);margin-bottom:var(--sf-space-xs);">Feature card</div>
        <div style="font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);line-height:1.5;">Design tokens that adapt to your brand and context automatically.</div>
      </div>
      <div style="background:var(--sf-color-primary-600);border-radius:var(--sf-radius-l);padding:var(--sf-space-l);box-shadow:var(--sf-shadow-m);color:#fff;">
        <div style="font-size:var(--sf-text-xs);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;margin-bottom:var(--sf-space-s);">Active users</div>
        <div style="font-size:var(--sf-text-display-s);font-weight:800;line-height:1;margin-bottom:var(--sf-space-s);">12,431</div>
        <div style="font-size:var(--sf-text-xs);opacity:0.75;margin-bottom:var(--sf-space-m);">↑ 8.4% this week</div>
        <button style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:var(--sf-radius-m);padding:var(--sf-space-xs) var(--sf-space-s);font-size:var(--sf-text-xs);font-weight:600;cursor:pointer;font-family:inherit;">View report →</button>
      </div>
      <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1,1px) var(--sf-border-style,solid) var(--sf-color-border);border-radius:var(--sf-radius-l);padding:var(--sf-space-l);box-shadow:var(--sf-shadow-s);">
        <label style="display:block;font-size:var(--sf-text-xs);font-weight:600;color:var(--sf-color-text--secondary);margin-bottom:var(--sf-space-xs);">Email address</label>
        <input type="email" placeholder="you@example.com" style="width:100%;box-sizing:border-box;background:var(--sf-color-base);border:var(--sf-border-width-1,1px) var(--sf-border-style,solid) var(--sf-color-border);border-radius:var(--sf-radius-m);padding:var(--sf-space-xs) var(--sf-space-s);font-size:var(--sf-text-s);color:var(--sf-color-text);font-family:inherit;outline:none;margin-bottom:var(--sf-space-s);" />
        <button class="sf-btn sf-btn-primary" style="width:100%;justify-content:center;">Subscribe</button>
      </div>
    </div>
  </section>

  <!-- LAYOUTS & MACROS -->
  <section style="margin-bottom:var(--sf-space-2xl);">
    <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--sf-space-m);">Layouts &amp; macros</div>

    <!-- Text gradient + gradient divider -->
    <h3 class="sf-text-gradient" style="font-size:var(--sf-text-2xl);font-weight:800;font-family:var(--sf-font-heading,inherit);margin:0 0 var(--sf-space-s);">.sf-text-gradient heading</h3>
    <div class="sf-divider sf-divider--gradient" style="margin-bottom:var(--sf-space-l);"></div>

    <!-- Cluster -->
    <div style="font-size:9px;color:var(--sf-color-text--muted);font-family:monospace;margin-bottom:4px;">.sf-cluster</div>
    <div class="sf-cluster" style="margin-bottom:var(--sf-space-l);">
      <span class="sf-btn sf-btn-primary">Tag</span>
      <span class="sf-btn sf-btn-secondary">Another</span>
      <span class="sf-btn sf-btn-ghost">Ghost</span>
      <span class="sf-btn sf-btn-secondary">Wraps nicely</span>
    </div>

    <!-- Grid -->
    <div style="font-size:9px;color:var(--sf-color-text--muted);font-family:monospace;margin-bottom:4px;">.sf-grid</div>
    <div class="sf-grid sf-grid--m" style="margin-bottom:var(--sf-space-l);">
      <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-m);padding:var(--sf-space-m);font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);">Grid item 1</div>
      <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-m);padding:var(--sf-space-m);font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);">Grid item 2</div>
      <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-m);padding:var(--sf-space-m);font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);">Grid item 3</div>
    </div>

    <!-- Sidebar + Stack -->
    <div style="font-size:9px;color:var(--sf-color-text--muted);font-family:monospace;margin-bottom:4px;">.sf-sidebar + .sf-stack</div>
    <div class="sf-sidebar sf-sidebar--narrow">
      <div style="background:var(--sf-color-primary-100);border-radius:var(--sf-radius-m);padding:var(--sf-space-m);">
        <div class="sf-stack sf-stack--s">
          <span style="font-size:var(--sf-text-s);font-weight:700;color:var(--sf-color-primary-700);">Sidebar</span>
          <span style="font-size:var(--sf-text-xs);color:var(--sf-color-primary-700);">Stacked</span>
          <span style="font-size:var(--sf-text-xs);color:var(--sf-color-primary-700);">items</span>
        </div>
      </div>
      <div style="background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-m);padding:var(--sf-space-m);font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);">
        Main content area — the sidebar holds its width while this region fills the rest, collapsing to a single column when space runs out.
      </div>
    </div>
  </section>

  <!-- SPACING -->
  <section style="margin-bottom:var(--sf-space-xl);">
    <div style="font-size:var(--sf-text-xs);font-weight:700;color:var(--sf-color-text--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--sf-space-m);">Spacing scale</div>
    <div style="display:flex;align-items:flex-end;gap:4px;padding:var(--sf-space-m);background:var(--sf-color-base-50);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-l);">
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:var(--sf-space-3xs,2px);min-width:3px;height:var(--sf-space-3xs,2px);min-height:3px;background:var(--sf-color-primary-400);border-radius:2px;"></div><span style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;white-space:nowrap;">3xs</span></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:var(--sf-space-2xs,4px);min-width:4px;height:var(--sf-space-2xs,4px);min-height:4px;background:var(--sf-color-primary-400);border-radius:2px;"></div><span style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;white-space:nowrap;">2xs</span></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:var(--sf-space-xs,6px);min-width:6px;height:var(--sf-space-xs,6px);min-height:6px;background:var(--sf-color-primary-400);border-radius:2px;"></div><span style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;white-space:nowrap;">xs</span></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:var(--sf-space-s,8px);min-width:8px;height:var(--sf-space-s,8px);min-height:8px;background:var(--sf-color-primary-400);border-radius:2px;"></div><span style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;white-space:nowrap;">s</span></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:var(--sf-space-m,12px);min-width:12px;height:var(--sf-space-m,12px);min-height:12px;background:var(--sf-color-primary-400);border-radius:2px;"></div><span style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;white-space:nowrap;">m</span></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:var(--sf-space-l,16px);min-width:16px;height:var(--sf-space-l,16px);min-height:16px;background:var(--sf-color-primary-400);border-radius:2px;"></div><span style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;white-space:nowrap;">l</span></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:var(--sf-space-xl,24px);min-width:24px;height:var(--sf-space-xl,24px);min-height:24px;background:var(--sf-color-primary-400);border-radius:2px;"></div><span style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;white-space:nowrap;">xl</span></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:var(--sf-space-2xl,32px);min-width:32px;height:var(--sf-space-2xl,32px);min-height:32px;background:var(--sf-color-primary-400);border-radius:2px;"></div><span style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;white-space:nowrap;">2xl</span></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:var(--sf-space-3xl,48px);min-width:48px;height:var(--sf-space-3xl,48px);min-height:48px;background:var(--sf-color-primary-400);border-radius:2px;"></div><span style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;white-space:nowrap;">3xl</span></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:var(--sf-space-4xl,64px);min-width:64px;height:var(--sf-space-4xl,64px);min-height:64px;background:var(--sf-color-primary-400);border-radius:2px;"></div><span style="font-size:8px;color:var(--sf-color-text--muted);font-family:monospace;white-space:nowrap;">4xl</span></div>
    </div>
  </section>

</div>`;

  const BODIES: Record<PreviewTemplate, string> = {
    marketing: MARKETING_BODY,
    docs: DOCS_BODY,
    dashboard: DASHBOARD_BODY,
    components: COMPONENTS_BODY,
    stylescape: STYLESCAPE_BODY,
  };

  function buildIframeHTML(
    ov: Record<string, string>,
    theme: "light" | "dark",
    motion: "normal" | "slow" | "none",
    template: PreviewTemplate,
    frameworkCSS: string,
  ): string {
    const css = fa(ov, { mode: "root", banner: false });
    const motionCSS =
      motion === "slow"
        ? "*, *::before, *::after { transition-duration: 200% !important; animation-duration: 200% !important; }"
        : motion === "none"
        ? "*, *::before, *::after { transition: none !important; animation: none !important; }"
        : "";

    const fontLinks = getGoogleFonts(ov)
      .map(({ url }) => `  <link rel="stylesheet" href="${url}">`)
      .join("\n");

    return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}" style="height:100%;margin:0;padding:0;">
<head>
  <meta charset="UTF-8">
  <title>SLASHED Preview</title>
${fontLinks ? fontLinks + "\n" : ""}  <style id="slashed-framework">${frameworkCSS}</style>
  <style id="slashed-overrides">${css}</style>
  <style>
    html, body { height: 100%; margin: 0; padding: 0; }
    body {
      font-family: var(--sf-font-body, "Inter", sans-serif);
      background: var(--sf-color-bg, var(--sf-color-base, #fff));
      color: var(--sf-color-text, #111);
      box-sizing: border-box;
    }
    .sf-btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: var(--sf-space-xs) var(--sf-space-m);
      border-radius: var(--sf-radius-m);
      font-size: var(--sf-text-s); font-weight: 600;
      border: var(--sf-border-width-1) solid transparent;
      cursor: pointer; transition: all 0.15s ease;
    }
    .sf-btn-primary { background: var(--sf-color-primary-600); color: #fff; border-color: var(--sf-color-primary-600); }
    .sf-btn-primary:hover { background: var(--sf-color-primary-700); }
    .sf-btn-secondary { background: var(--sf-color-base-50); color: var(--sf-color-text); border-color: var(--sf-color-border); }
    .sf-btn-ghost { background: transparent; color: var(--sf-color-text--secondary); border-color: transparent; }
    .sf-btn-ghost:hover { background: var(--sf-color-base-50); }
    .sf-btn-danger { background: var(--sf-color-danger); color: #fff; }
    .sf-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    ${motionCSS}
  </style>
</head>
<body>
${BODIES[template]}
</body>
</html>`;
  }

  let splitMode = $state(false);

  let iframeEl = $state<HTMLIFrameElement | null>(null);
  let splitLightEl = $state<HTMLIFrameElement | null>(null);
  let splitDarkEl = $state<HTMLIFrameElement | null>(null);
  // Counters increment on every load event so effects re-run after iframe reloads.
  let loadCount = $state(0);
  let splitLightLoadCount = $state(0);
  let splitDarkLoadCount = $state(0);
  let refresh = $state(0);

  // srcdoc only encodes layout/motion/template — overrides and theme are applied
  // by the effects below, avoiding a full iframe reload on every token change.
  let html = $derived(buildIframeHTML({}, previewTheme, previewMotion, previewTemplate, frameworkCSSStatic));
  let htmlLight = $derived(buildIframeHTML({}, "light", previewMotion, previewTemplate, frameworkCSSStatic));
  let htmlDark = $derived(buildIframeHTML({}, "dark", previewMotion, previewTemplate, frameworkCSSStatic));

  $effect(() => {
    const _ov = overrides;
    const _theme = previewTheme;
    const _count = loadCount;
    const _lock = lumlockerPreview.value;

    const iframe = iframeEl;
    if (_count === 0 || !iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const styleEl = doc.getElementById("slashed-overrides");
    if (styleEl) {
      styleEl.textContent = fa(_ov, { mode: "root", banner: false });
    }

    injectFontsIntoDoc(doc, _ov);

    // Framework activates dark mode via [data-theme="dark"] (color-scheme +
    // light-dark()), NOT a class — keep this in sync with buildIframeHTML.
    doc.documentElement.setAttribute("data-theme", _theme);

    // Luminance lock preview — mirrors :root[data-lumlocker] in core/themes.css.
    if (_lock) doc.documentElement.setAttribute("data-lumlocker", "");
    else doc.documentElement.removeAttribute("data-lumlocker");

    // This single-mode iframe is the canonical resolver source.
    registerPreviewDoc(doc);
    bumpPreviewVersion();
  });

  $effect(() => {
    const _ov = overrides;
    const _lightCount = splitLightLoadCount;
    const _darkCount = splitDarkLoadCount;
    const _lock = lumlockerPreview.value;
    const css = fa(_ov, { mode: "root", banner: false });

    const applyLock = (doc: Document) => {
      if (_lock) doc.documentElement.setAttribute("data-lumlocker", "");
      else doc.documentElement.removeAttribute("data-lumlocker");
    };

    if (splitLightEl && _lightCount > 0) {
      const doc = splitLightEl.contentDocument;
      if (doc) {
        const styleEl = doc.getElementById("slashed-overrides");
        if (styleEl) styleEl.textContent = css;
        injectFontsIntoDoc(doc, _ov);
        applyLock(doc);
        // In split mode the light pane is the canonical resolver source.
        registerPreviewDoc(doc);
      }
    }
    if (splitDarkEl && _darkCount > 0) {
      const doc = splitDarkEl.contentDocument;
      if (doc) {
        const styleEl = doc.getElementById("slashed-overrides");
        if (styleEl) styleEl.textContent = css;
        injectFontsIntoDoc(doc, _ov);
        applyLock(doc);
      }
    }
    bumpPreviewVersion();
  });

  let isConstrained = $derived(previewWidth !== "fluid");

  function getWidthStyle(): string {
    if (previewWidth === "fluid") return "width:100%;height:100%";
    if (previewWidth === "mobile") return "width:390px;height:750px;border:1px solid rgba(255,255,255,0.12);border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 32px 80px rgba(0,0,0,0.5)";
    if (previewWidth === "tablet") return "width:768px;height:900px;border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden;background:#fff;box-shadow:0 32px 80px rgba(0,0,0,0.5)";
    return "width:1024px;height:720px;border:1px solid rgba(255,255,255,0.12);border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 32px 80px rgba(0,0,0,0.5)";
  }
</script>

<div class="flex flex-col flex-1 min-h-0 bg-[#09090e]">
  <!-- Preview toolbar -->
  <div class="h-10 bg-[#0d0d14] border-b border-white/8 flex items-center px-3 gap-2 shrink-0">
    <!-- Template tabs -->
    <div class="flex bg-white/5 border border-white/8 rounded-lg p-0.5 gap-0.5">
      {#each TEMPLATES as t (t.id)}
        <button
          onclick={() => onTemplateChange(t.id)}
          class={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
            previewTemplate === t.id ? "bg-white/12 text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {t.label}
        </button>
      {/each}
    </div>

    <div class="w-px h-4 bg-white/10 mx-1"></div>

    <!-- Width controls -->
    <div class="flex bg-white/5 border border-white/8 rounded-lg p-0.5 gap-0.5">
      {#each (["fluid", "desktop", "tablet", "mobile"] as const) as w (w)}
        <button
          onclick={() => onWidthChange(w)}
          title={w === "fluid" ? "Full width" : w === "desktop" ? "Desktop (1024px)" : w === "tablet" ? "Tablet (768px)" : "Mobile (390px)"}
          class={`p-1 rounded-md transition-all cursor-pointer ${previewWidth === w ? "bg-white/12 text-white" : "text-slate-500 hover:text-slate-300"}`}
        >
          {#if w === "mobile"}
            <Smartphone class="w-3 h-3" />
          {:else if w === "tablet"}
            <Tablet class="w-3 h-3" />
          {:else}
            <Monitor class="w-3 h-3" />
          {/if}
        </button>
      {/each}
    </div>

    <!-- Light/dark/split -->
    <div class="flex bg-white/5 border border-white/8 rounded-lg p-0.5 gap-0.5">
      <button
        onclick={() => { splitMode = false; onThemeChange("light"); }}
        title="Light mode"
        class={`p-1 rounded-md transition-all cursor-pointer ${!splitMode && previewTheme === "light" ? "bg-white/12 text-white" : "text-slate-500 hover:text-slate-300"}`}
      >
        <Sun class="w-3 h-3" />
      </button>
      <button
        onclick={() => { splitMode = false; onThemeChange("dark"); }}
        title="Dark mode"
        class={`p-1 rounded-md transition-all cursor-pointer ${!splitMode && previewTheme === "dark" ? "bg-white/12 text-white" : "text-slate-500 hover:text-slate-300"}`}
      >
        <Moon class="w-3 h-3" />
      </button>
      <button
        onclick={() => { splitMode = !splitMode; }}
        title="Split: light + dark side by side"
        class={`p-1 rounded-md transition-all cursor-pointer ${splitMode ? "bg-white/12 text-white" : "text-slate-500 hover:text-slate-300"}`}
      >
        <Columns2 class="w-3 h-3" />
      </button>
    </div>

    <div class="flex-1"></div>

    <!-- Motion -->
    <select
      value={previewMotion}
      onchange={(e) => onMotionChange((e.target as HTMLSelectElement).value as "normal" | "slow" | "none")}
      class="bg-white/5 border border-white/8 text-slate-400 rounded-lg px-2 py-0.5 text-[10px] font-bold focus:outline-none cursor-pointer"
    >
      <option value="normal">Normal motion</option>
      <option value="slow">Slow motion</option>
      <option value="none">No motion</option>
    </select>

    <!-- Refresh -->
    <button
      onclick={() => { loadCount = 0; splitLightLoadCount = 0; splitDarkLoadCount = 0; refresh += 1; }}
      title="Reload preview"
      class="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-all cursor-pointer"
    >
      <RefreshCw class="w-3 h-3" />
    </button>

    <!-- Open in new tab -->
    <button
      onclick={() => {
        const blob = new Blob([buildIframeHTML(overrides, previewTheme, previewMotion, previewTemplate, frameworkCSSStatic)], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }}
      title="Open in new tab"
      class="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-all cursor-pointer"
    >
      <ExternalLink class="w-3 h-3" />
    </button>
  </div>

  <!-- Preview area -->
  <div class={`flex-1 min-h-0 flex overflow-auto ${isConstrained && !splitMode ? "items-center justify-center bg-[#06060a]" : ""}`}>
    {#if splitMode}
      <!-- Split view: light left, dark right -->
      <div class="flex-1 flex min-w-0 h-full">
        <div class="flex-1 flex flex-col min-w-0 border-r border-white/8">
          <div class="h-6 flex items-center justify-center bg-[#0d0d14] border-b border-white/6 shrink-0">
            <span class="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
              <Sun class="w-2.5 h-2.5" /> Light
            </span>
          </div>
          {#key refresh}
            <iframe
              bind:this={splitLightEl}
              srcdoc={htmlLight}
              sandbox="allow-scripts allow-same-origin allow-forms"
              onload={() => { splitLightLoadCount += 1; }}
              class="flex-1 w-full border-0"
              title="SLASHED light preview"
            ></iframe>
          {/key}
        </div>
        <div class="flex-1 flex flex-col min-w-0">
          <div class="h-6 flex items-center justify-center bg-[#0d0d14] border-b border-white/6 shrink-0">
            <span class="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
              <Moon class="w-2.5 h-2.5" /> Dark
            </span>
          </div>
          {#key refresh}
            <iframe
              bind:this={splitDarkEl}
              srcdoc={htmlDark}
              sandbox="allow-scripts allow-same-origin allow-forms"
              onload={() => { splitDarkLoadCount += 1; }}
              class="flex-1 w-full border-0"
              title="SLASHED dark preview"
            ></iframe>
          {/key}
        </div>
      </div>
    {:else}
      <div style={getWidthStyle()} class={isConstrained ? "" : "w-full h-full"}>
        {#key refresh}
          <iframe
            bind:this={iframeEl}
            srcdoc={html}
            sandbox="allow-scripts allow-same-origin allow-forms"
            onload={() => { loadCount += 1; }}
            class="w-full h-full border-0"
            title="SLASHED live preview"
          ></iframe>
        {/key}
      </div>
    {/if}
  </div>
</div>
