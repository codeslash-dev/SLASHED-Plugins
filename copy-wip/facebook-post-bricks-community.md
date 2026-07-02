# Facebook post — Bricks Builder community group

Hey everyone — I built a CSS framework and a Bricks plugin for it, and I'd love some honest feedback from this group.

Why another one? Because everything I tried on the market was either too opinionated or quietly locked me into one ecosystem. SLASHED is neither: it's pure CSS built on design tokens — no build step, no frontend JavaScript — so it works on any platform or CMS. WordPress, Shopify, Ghost, Laravel, plain HTML, a React app, whatever renders a stylesheet. Set six brand colors and everything derives from them automatically, including the full dark palette.

The plugin makes it feel native in Bricks: all variables in the pickers (with light/dark swatches), classes in the autocomplete, a floating color panel, and reBEMer — select an element in the structure panel, type a block name, and it BEM-names the whole subtree in one pass.

Fair warning: it uses modern CSS, so the browser floor is Chrome 125 / Safari 18 / Firefox 129. And it's still work in progress — a beta heading into release-candidate territory soon — so expect some rough edges.

Free and open source — the framework is MIT, the WordPress plugin is GPL like WordPress itself. CSS loads locally, nothing phones home.

Framework: https://github.com/codeslash-dev/SLASHED
Plugin: https://github.com/codeslash-dev/SLASHED-Plugins
Try it in the browser, nothing to install: https://slashed.codeslash.dev/configurator/

If you build client sites in Bricks daily, tell me where it fights your workflow.
