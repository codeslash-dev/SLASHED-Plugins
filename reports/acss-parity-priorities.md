# ACSS ↔ SLASHED — listy priorytetów (framework + plugin)

> Destylat z `acss-audit.md`. Dwie listy (**Framework**, **Plugin**), każda w 3 kategoriach:
> - **A. Mamy tak samo lub lepiej** — nic do poprawy.
> - **B. Mamy gorzej / czegoś brakuje** — warto dodać (podobnie albo alternatywnie/lepiej).
> - **C. Nie mamy i nie możemy mieć** — powód filozoficzny lub techniczny.
>
> **Sortowanie:** w obrębie każdej kategorii malejąco wg kolumny **„Użycie"** — *ekspercki szacunek
> odsetka typowych biznesowo‑marketingowych, mocno wizualnych stron, na których dana rzecz realnie
> się przydaje* (nie jest to pomiar telemetryczny). „Sekcja" wskazuje miejsce w `acss-audit.md`.

---

# 1. FRAMEWORK (SLASHED — czysty CSS)

## A. Mamy tak samo lub lepiej — nic do poprawy

| # | Użycie | Pozycja | Sekcja | Nota |
|---|---|---|---|---|
| 1 | ~100% | **Kolory / paleta / dark mode / color-scheme** | 7 | ACSS 4.x skonwergował do naszego modelu (OKLCH, `light-dark()`, `color-mix()`). U nas dark w pełni auto z 6 tokenów, LumLocker, auto-kontrast `--on-*`, płynne przejście. **Lepiej.** |
| 2 | ~100% | **Typografia fluid** (h1–h6, text, per-level/per-size, measure) | 17 | Pełny zestaw tokenów + generatywny clamp. Parytet, miejscami szerzej (`-interactive`). |
| 3 | ~100% | **Spacing: skala + `.sf-section--*` + gapy kontekstowe** | 16.1–3, 16.7 | Section padding (block, gutter zostaje) = rzadka funkcja — mamy. Gapy `--sf-gap/-content-gap/-gutter/-grid-gap`. |
| 4 | ~100% | **Kontenery / content width (+safe)** | 8.3–8.4 | Skala `narrow/prose/default/wide/full`; gutter-aware bez „double gutter". |
| 5 | ~95% | **System obramowań + radius (skala + koncentryczny)** | 2.1 | Skala radius + `--sf-radius-scale`, `--sf-radius-outer` (koncentryczny), pełne tokeny border. **Lepiej** (ACSS ma jeden `--radius`). |
| 6 | ~95% | **Linki (bezklasowo, tokenowo)** | 4.1 | `a:link/hover/visited/active` + auto-kontrast koloru linku. |
| 7 | ~90% | **Cienie (box/text/drop)** | 15 | **Lepiej:** auto-boost w dark, `glow`, `inner`. |
| 8 | ~90% | **Auto object-fit na `img`/`video`** | 8.9 | Domyślne (nie toggle), obejmuje też `video`. |
| 9 | ~90% | **Auto grid / variable grid (`.sf-grid`)** | 10.4, 10.7 | `auto-fill/-fit` + `--sf-grid-min`, breakpoint-free. |
| 10 | ~90% | **Sticky + scroll-offset kotwic** | 5.9, 8.8 | `scroll-padding` uwzględnia header (auto). **Lepiej/prościej.** |
| 11 | ~85% | **`.sf-bg` — obraz jako warstwa tła** | 1.3 | Odpowiednik `.is-bg`; rodzic auto przez `:has()`. |
| 12 | ~85% | **Presety transition** | 5.7 | Semantyczne per-właściwość, „nigdy `transition: all`". |
| 13 | ~85% | **Clickable / focus parent (klikalna karta)** | 12.2–3 | **Lepiej:** auto overlay-link, z-index zagnieżdżonych, wykluczenia. |
| 14 | ~80% | **Line clamp** | 12.11 | `.sf-line-clamp-*` + dowolne N tokenem. |
| 15 | ~70% | **Zigzag / alternating rows (`.sf-alternate`)** | 10.1 | **Lepiej:** container-query zamiast media. |
| 16 | ~65% | **Columns / masonry (`.sf-equal`)** | 8.1–2 | Kolumny CSS z regułami. |
| 17 | ~60% | **Gradient / overflow fades** | 5.10 | `.sf-overflow-fade` (maska), `.sf-scrim`, `.sf-text-protect`. |
| 18 | ~60% | **Content grid / breakout (rdzeń)** | 10.5 | `.sf-content-grid` + `.sf-breakout` + `.sf-full-bleed`. |
| 19 | ~55% | **Separatory (`.sf-divider`)** | 2.2 | Element + warianty (gradient/pionowy) — bogatszy. |
| 20 | ~50% | **Easing presets** | 5.6 | 8 tokenów (vs 5 w ACSS). |
| 21 | ~40% | **Selection styling (domyślne)** | 5.8 | `::selection` + `<mark>` tokenowo. |

## B. Mamy gorzej / brakuje — warto dodać (podobnie lub lepiej)

| # | Użycie | Pozycja | Sekcja | Rekomendacja |
|---|---|---|---|---|
| 1 | ~100% | **Przyciski `.sf-btn`** | 3 | 🔧 **Odblokować z `optional/components.css` (staged v0.8)** + dodać rozmiary T-shirt, `--outline`. Najwyższy priorytet. |
| 2 | ~95% | **Karty `.sf-card`** | 6 | 🔧 **Odblokować (staged v0.8)** + domknąć knoby (link/icon/min-radius, flex↔grid). |
| 3 | ~85% | **Efekty hover (`.sf-hover--*`)** | 5.2 | Opcjonalny `optional/effects.css`: grow/float/glow/underline na naszych tokenach. Duży efekt wizualny, niski koszt. |
| 4 | ~80% | **Scroll-reveal: stagger / `-all` / blur / parallax** | 5.3 | Mamy `.sf-entrance--*` (6 wariantów) — dołożyć `--stagger` (`sibling-index()`), wariant na dzieci, blur/parallax. |
| 5 | ~70% | **Overlays: solid `.sf-overlay` + custom overlay tokeny** | 13.1–2 | Prosta ciemna nakładka na obraz + reużywalne overlaye (gradient/blur/blend). Bardzo częste w hero. |
| 6 | ~65% | **Surfaces (preset tła: obraz/overlay/animacja)** | 1.2 | Tokeny `--sf-surface-*` + klasa; pełne UI po stronie pluginu (P). |
| 7 | ~65% | **Klasy stylu nagłówka/tekstu (`.sf-h1..-h6`, `.sf-text-{size}`)** | 12.10, 17.6 | Makra nakładające komplet sub-właściwości (odpowiednik `heading-style()`). Realny brak DX. |
| 8 | ~60% | **Lista ikon (`.sf-icon-list`)** | 11.1 | Ikona+tekst, gap, wyrównanie — częste w „features/benefits". Tanie. |
| 9 | ~55% | **Kontekstowe tła (`.sf-bg--light/-dark/-ultra`)** | 1.1 | Nazwane klasy tła + wymuszenie `data-theme`. |
| 10 | ~45% | **Efekty exit (`.sf-exit--*`)** | 5.4 | Symetrycznie do entrance (`view()`, zakres `cover`). Mamy keyframes. |
| 11 | ~40% | **Efekt „overlap" (tło zachodzące na sąsiada)** | 14 | Popularny w sekcjach marketingowych; makro + pseudo-element. |
| 12 | ~40% | **Grid: 7–12 kolumn + span/order + `--sf-grid-N`** | 10.2, 10.6 | Rozważyć moduł utilities grid (container-query). |
| 13 | ~40% | **Auto-radius mediów (globalny toggle)** | 2.1 | Token + reguła `:where(img,figure)`. |
| 14 | ~35% | **External link — cue dla czytników + auto po `href`** | 4.2 | Dodać visually-hidden tekst; a11y/zgodność. |
| 15 | ~35% | **Width utilities (frakcyjne szerokości)** | 8.6 | Klasy `.sf-width-*` + tokeny (jeśli wejdzie warstwa utility). |
| 16 | ~30% | **Blockquotes (rozbudowane, footer/cite/tło)** | 8.10 | Element + tokeny; dziś tylko prose-scoped. |
| 17 | ~30% | **Automatic spacing (opcjonalny auto-gap, zero-spec)** | 16.4 | Opcjonalny `:where(.sf-section > *)` dla chcących zachowania ACSS. |
| 18 | ~30% | **Content-grid: strefy `feature-max` / `full-safe`** | 10.5 | Druga strefa breakout + full z gutterem. |
| 19 | ~25% | **Marker classes (`.sf-marker--*`)** | 17.5 | Kolor `::marker` poza prose. |
| 20 | ~25% | **Header padding classes (`.sf-header--*`)** | 16.6 | Block padding ze skali standard, gutter zostaje. |
| 21 | ~20% | **`divider-all` → makro `.sf-divide`** | 2.2 | Linie między wszystkimi dziećmi. |
| 22 | ~15% | **Ribbons (`.sf-ribbon`)** | 8.11 | Narożne wstążki (promo/e-comm). |
| 23 | ~15% | **`fluid()` ad-hoc / natywna `@function --fluid()`** | 9.3 | Wzorzec `clamp()`; docelowo CSS `@function`. DX. |
| 24 | ~15% | **`.sf-list-none`, `.sf-selection--alt`** | 14, 5.8 | Drobne makra. |
| 25 | ~12% | **Textures (`.sf-texture-{n}` + tokeny)** | 12.12 | Presety tekstur (pełne UI = plugin). |
| 26 | ~10% | **Boxed layout (`.sf-boxed`)** | 8.7 | Layout „w ramce". Niszowe. |
| 27 | ~8% | **Inverted radius (przez `mask`)** | 2.3 | Wklęsłe narożniki nowocześniej niż shadow-hack ACSS. Niszowe. |

## C. Nie mamy i nie możemy mieć (filozofia / technika)

| # | Użycie | Pozycja | Sekcja | Dlaczego / czym zastępujemy |
|---|---|---|---|---|
| 1 | ~80% | **On-Visible (IntersectionObserver, runtime JS)** | 5.5 | Framework = **zero runtime JS**. Mamy stan `.is-visible` (hook) + scroll-driven `view()`. Pełny efekt „raz i zostaje" → **plugin** (JS). |
| 2 | ~60% | **SCSS mixiny/funkcje (warstwa buildu)** | 9, 12 | **Brak kompilatora** — pure CSS. Równoważniki jako klasy-makra/tokeny; `pow()` i `calc()` natywnie. |
| 3 | ~50% | **Auto-styling dowolnych `.btn--*` po prefiksie** | 3.1, 3.6 | Sprzeczne z **BEM-first**. Zamiast: jawne `.sf-btn` + warianty. |
| 4 | ~45% | **Breakpoint mixiny / media-query recipes** | 12.7, 14 | Model **breakpoint-free** — container queries (`.sf-cq`, `@container`). |
| 5 | ~40% | **Mechanizm „recipe" (`?snippet` → CSS)** | 14 | Wymaga buildera/preprocesora — nie w pure-CSS. Możliwe w **pluginie**. |
| 6 | ~30% | **Card targeting listą selektorów** | 6.4 | Wymaga dashboardu/generatora reguł — **plugin**. Zamiast: klasa `.sf-card`. |
| 7 | ~20% | **Color partials `-h/-s/-l/-rgb`** | 7.3 | Inny model — **OKLCH relative** (`oklch(from …)`), kanały zbędne. |
| 8 | ~10% | **Ipsum / dummy text, `?script`** | 14 | Nie jest zadaniem CSS. |

---

# 2. PLUGIN (`SLASHED-Plugins` — WP + Bricks/Gutenberg + konfigurator)

## A. Mamy tak samo lub lepiej — nic do poprawy

| # | Użycie | Pozycja | Nota |
|---|---|---|---|
| 1 | ~95% | **Konfigurator tokenów (kolory / typografia / spacing / bordery)** | Svelte SPA edytuje rdzeń palety i skal — odpowiednik dashboardu ACSS dla podstawowej konfiguracji. |
| 2 | ~90% | **Integracje Bricks / Gutenberg (class + variable hints, inventory)** | Podpowiedzi klas/zmiennych w builderze; `class-hints.json`, `variables-hints.json`, inventory. |
| 3 | ~85% | **Ładowanie i wersjonowanie CSS frameworka** | `update-framework`, bundlowanie, spójność wersji plugin↔framework. |
| 4 | ~80% | **Dark mode / color-scheme przez `data-theme`** | Dziedziczy zalety frameworka bez dodatkowej pracy w builderze. |

> Uwaga: konfigurator pokrywa **rdzeń** (kolory/typografia/spacing). Panele specjalistyczne (Surfaces, Effects, Fonts, Relationships) — patrz B.

## B. Mamy gorzej / brakuje — warto dodać (podobnie lub lepiej)

| # | Użycie | Pozycja | Sekcja | Rekomendacja |
|---|---|---|---|---|
| 1 | ~90% | **Presety Buttons/Cards w builderze** | P (3,6) | Po odblokowaniu `.sf-btn`/`.sf-card` we frameworku — kontrolki/presety w Bricks/Gutenberg. Bardzo wysoki impakt wizualny. |
| 2 | ~85% | **Manager fontów (upload → `@font-face` → tokeny)** | P4 | Brandowe fonty to niemal standard; dziś tylko częściowe wsparcie (Bricks). |
| 3 | ~80% | **On-Visible JS (scroll reveals)** | P6 | Mały IntersectionObserver dopinający klasę do `.is-visible`. Bardzo częste na marketingu. |
| 4 | ~70% | **Efekty hover/entrance jako kontrolki buildera** | P (5) | Ekspozycja przyszłego `optional/effects.css` w UI. |
| 5 | ~65% | **Surfaces / Custom Overlays / Textures — UI presetów** | P2 | Nazwane tła z obrazem/overlay/animacją; definiowane w pluginie, konsumowane klasą. |
| 6 | ~60% | **WP-CLI (`wp slashed …`)** | P1 | `css regenerate` + `settings get/set/list/export/import/reset`. Kluczowe dla agencji/CI/deploy (choć na 1 stronę mniej „widoczne"). |
| 7 | ~55% | **Panel Color Relationships + generacja klas kontekstowych** | P5 | Mapowanie „w dark linki/nagłówki na X" + `.bg--*` kontekstowe. |
| 8 | ~45% | **Auto-owijanie treści posta w `.sf-prose` (smart spacing)** | P (16.8) | Parytet z auto-spacingiem ACSS dla bloga/rich-text. |
| 9 | ~40% | **Mechanizm „recipe" (`?snippet`) w builderze** | P3 | Rozwijanie snippetów w polach Bricks/Gutenberg. DX. |
| 10 | ~35% | **Integracje form-builderów (WS Form / Gravity / Fluent)** | P7 | Framework stylizuje natywne formularze; integracje = parytet z „Load Forms". |
| 11 | ~25% | **Toggle auto-offsetu 1. sekcji / sticky pod headerem** | P (8.5) | Automatyzacja marginesu przy sticky header (dashboard ACSS to ma). |

## C. Nie mamy i nie możemy mieć (filozofia / technika)

| # | Użycie | Pozycja | Dlaczego / czym zastępujemy |
|---|---|---|---|
| 1 | ~50% | **Pole „Custom SCSS" z mixinami/funkcjami ACSS** | SLASHED = **pure CSS, bez kompilatora SCSS**. Zamiast: nadpisania tokenów + custom CSS + natywne `pow()`/`@function`/`@container`. |
| 2 | ~50% | **Auto-styling dowolnych klas `.btn--*`/kart po prefiksie** | **BEM-first.** Zamiast: jawne `.sf-btn`/`.sf-card` + presety w builderze. |
| 3 | ~45% | **Utilities/mixiny breakpointowe (media-based)** | Model **container-query**. Zamiast: `.sf-cq` / `@container` / breakpoint-free math. |
| 4 | ~30% | **Generacja pełnej biblioteki utilities „à la ACSS 3.x"** | Świadomie **token/prymityw-first** (utilities tylko opcjonalnie, na żądanie). |

---

## Jak czytać priorytety (skrót operacyjny)

**Zrób najpierw (framework, największy zwrot):** odblokuj `.sf-btn` (B1) i `.sf-card` (B2) → dodaj moduł efektów hover (B3) i stagger/blur do scroll-reveal (B4) → overlays + surfaces (B5–6) → klasy stylu nagłówka/tekstu i listę ikon (B7–8).

**Zrób najpierw (plugin):** ekspozycja presetów Buttons/Cards (B1) → manager fontów (B2) → On-Visible JS (B3) → kontrolki efektów (B4) → WP-CLI dla wdrożeń CI/agencyjnych (B6).

**Nie ruszaj (celowo poza zakresem):** SCSS/mixiny, auto-styling po prefiksie, mixiny breakpointowe, `?`-recipe w czystym frameworku, On-Visible w frameworku bez JS — to świadome wybory architektoniczne, nie długi techniczny.
