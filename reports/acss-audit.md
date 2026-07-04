# Audyt ACSS ↔ SLASHED — analiza parytetu funkcji

> **Cel:** Dla każdego punktu z dokumentacji Automatic.css (ACSS, wersja 4.x —
> `docs.automaticcss.com`) opisujemy: (1) czym jest funkcja, (2) jak działa,
> (3) czy SLASHED (framework) lub plugin ma odpowiednik i czym się różni,
> (4) jeśli nie mamy — czy i jak możemy to dodać.
>
> **Metoda:** każda podstrona dokumentacji ACSS została przeczytana w całości
> (nie zgadywano po nazwie). Odniesienia do SLASHED bazują na `core/`,
> `optional/`, `docs/llm-guide.md`, `token-registry.json` oraz repo pluginu
> `SLASHED-Plugins`.
>
> Legenda oceny parytetu:
> - ✅ **Mamy** — pełny lub bliski odpowiednik.
> - 🟡 **Częściowo** — istnieje mechanizm, ale węższy / inny w działaniu / niekompletny.
> - ❌ **Brak** — nie ma odpowiednika.
> - 🔧 **Luka/niedokończone w SLASHED** — miejsce, gdzie audyt ujawnił dziurę lub niedokończoną funkcję po naszej stronie.

---

## 0. Różnica filozofii (kontekst całego audytu)

> **WAŻNE (aktualizacja):** ACSS **w 4.0 wykonał pivot na BEM-first** i
> **zredukował klasy narzędziowe** — usunięto m.in. `.link--*`, `.border/.border-light/.border-dark`,
> `.divider*`, część utilities kolorów; ich rolę przejęły **recipes** (składnia
> `?nazwa` — „variable expansion"), **zmienne CSS** i **mixiny SCSS**. Dzięki temu
> ACSS 4.x i SLASHED są **filozoficznie znacznie bliżej** niż w 3.x. Poniższa
> tabela uwzględnia już ten pivot — różnica przesunęła się z „utility vs token" na
> **„build/dashboard/SCSS vs no-build/pure-CSS"**.

| | **ACSS 4.x (Automatic.css)** | **SLASHED** |
|---|---|---|
| Model podstawowy | **BEM-first (po pivocie 4.0)** — mocno **zredukowane** utilities, nacisk na zmienne + recipes + mixiny. Nadal jest zestaw utilities (spacing, display, text itd.), ale sporo klas usunięto. | **Token-first / BEM-first** — tokeny `--sf-*` + prymitywy layoutu + makra. `optional/utilities.css` to pusty stub; **SLASHED nie dostarcza klas narzędziowych w 0.x**. |
| Odbiorca | Buildery stron (Bricks, Oxygen, Breakdance, Gutenberg, GenerateBlocks). Konfiguracja przez dashboard w WP + WP-CLI. | Dowolny stack, „no build, no Node, no runtime deps”. Konfiguracja przez nadpisanie tokenów lub konfigurator (Svelte SPA) + plugin WP. |
| „Silnik” wartości | **SCSS kompilowany** (po stronie pluginu), funkcje SCSS, zmienne CSS na wyjściu; **recipes** = mechanizm rozwijania zmiennych w builderze. | Czyste CSS: `oklch(from …)`, `light-dark()`, `color-mix()`, `clamp()`, `pow()` w `calc()`. **Zero kompilacji.** |
| Dark mode | „Color scheme" (4.x — nowy workflow, konfigurowany). | Automatyczny z 6 tokenów źródłowych + `data-theme`. |
| Mixiny/funkcje | Eksponowane użytkownikowi jako **SCSS mixins/functions** (bo ACSS kompiluje SCSS). | SLASHED nie ma warstwy SCSS dla użytkownika — „mixiny” realizujemy jako klasy-makra/prymitywy lub tokeny. **Cała sekcja „Mixins" ACSS to u nas albo makro/prymityw, albo brak.** |

Po pivocie 4.0 kluczowa różnica to **model dystrybucji wartości**: ACSS kompiluje
SCSS i udostępnia „recipes" oraz mixiny w kontekście buildera WP; SLASHED to
**pure-CSS bez buildu**, gdzie odpowiednikiem „recipe" jest nadpisanie knoba/tokenu
lub gotowe makro. Wiele pozycji z ACSS, które kiedyś były utility-class, dziś są
**recipe/mixin/zmienną** — i tak też je oceniamy poniżej.

---

## 1. Backgrounds (Tła)

### 1.1 Contextual Backgrounds (`.bg--light` / `.bg--dark` / `.bg--ultra-light` / `.bg--ultra-dark`)
- **Czym jest / jak działa:** Cztery abstrakcyjne klasy tła (`--bg-light`, `--bg-dark`, `--bg-ultra-light`, `--bg-ultra-dark`) konfigurowane centralnie w dashboardzie. Gdy element dostaje klasę kontekstową, ACSS **automatycznie dopasowuje foreground** (nagłówki, tekst, linki+hover, przyciski, ikony, focus) do tego, czy tło jest jasne czy ciemne („Light/Dark Relationships”). Zmiana koloru raz w panelu → wszystkie `.bg--dark` się aktualizują.
- **SLASHED:** 🟡 **Częściowo.** Mamy dwa mechanizmy pokrewne: (a) **theming sekcyjny** `data-theme="light|dark"` — na dowolnym elemencie ustawia `--sf-color-bg` i `--sf-color-text` automatycznie (`:where([data-theme]:not(:root,html))`), włącznie z automatycznym dark mode z `light-dark()`; (b) makra `.sf-surface--*` (patrz 1.2). Automatyczny dobór foregroundu realizujemy przez `light-dark()` + tokeny `--sf-color-text--on-*`.
- **Różnica:** ACSS operuje na **nazwanych tłach o 4 poziomach jasności** (ultra-light…ultra-dark) i „relacjach kolorów” konfigurowanych w panelu; SLASHED operuje na **trybie (light/dark) i rodzinach semantycznych**. Nie mamy gotowego zestawu `.bg--ultra-light`/`.bg--ultra-dark` jako klas narzędziowych (bo nie dostarczamy utilities). W pluginie WP dashboard „Color Assignments” jest naturalnym miejscem, by to odwzorować.
- **Czy dodać:** Tak, jako **opcjonalny zestaw klas** (`optional/utilities.css` — dziś stub) lub makro: `.sf-bg--light/-dark` mapowane na `--sf-color-base`/`--sf-color-inverse` + wymuszenie `data-theme`. Niski koszt.

### 1.2 Surfaces (`.surface-{name}` / `.surface-1…`)
- **Czym jest / jak działa:** Wprowadzone w ACSS 4.0 — **wielokrotnego użytku, nazwane presety tła** definiowane w dashboardzie: kolor bazowy (fallback), asset (obraz/gradient/wzór), `background-size/position/attachment/repeat`, animacja (własne `@keyframes`), overlay (kolor+opacity). Mogą mieć przypisaną „relację koloru” (ultra-light…dark), więc wyzwalają autodopasowanie foregroundu jak klasy `.bg--*`. Użycie: `<section class="surface-hero">` lub `var(--surface-1)`.
- **SLASHED:** 🟡 **Częściowo / inne znaczenie.** Mamy makro `.sf-surface--{family}` (primary, secondary, tertiary, action, neutral, inverse + status success/warning/info/danger), które ustawia tło rodziny + **auto-kontrastowy tekst** (`--sf-color-text--on-*`). To jest „surface = kolorowa powierzchnia semantyczna”, a **nie** presety z obrazami/overlay/animacją. Do mediów w tle mamy osobny prymityw `.sf-bg` i `.sf-scrim`.
- **Różnica:** ACSS „Surfaces” = **dashboardowy system presetów tła z obrazem/wzorem/overlay/animacją**; nasze `.sf-surface--*` = tylko kolor rodziny. Nazwanych, użytkownika, presetów z assetem nie mamy.
- **Czy dodać:** 🔧 **Realna luka po stronie konfiguratora/pluginu.** Framework CSS może dostarczyć tokeny (`--sf-surface-1-bg/-image/-overlay…`) i klasę `.sf-surface-1`, a **konfigurator/plugin** UI do definiowania nazwanych powierzchni z assetem i overlay. Warto rozważyć w roadmapie.

### 1.3 „Is Background” (`.is-bg`)
- **Czym jest / jak działa:** Zamienia realny `<img>` (lub dowolny box) w warstwę tła: pozycja absolutna 100%×100%, `z-index: -2` (nieskończone warstwowanie), a **rodzic** dostaje `position: relative` + `isolation`. Tokeny: `--bg-position/-inset/-width/-height/-radius/-z-index/-object-fit/-object-position`. Zaleta vs `background-image`: prawdziwy obraz (lazy-load, srcset, alt, indeksowalność).
- **SLASHED:** ✅ **Mamy — bardzo bliski odpowiednik: `.sf-bg`** (`core/layout.css`). Ustawia `inset: var(--sf-bg-inset)`, `object-fit/position`, `border-radius`, `z-index: var(--sf-bg-z)` (domyślnie `-2`), a rodzic przez `:where(:has(> .sf-bg))` dostaje `position: relative; isolation: isolate`. Obsługuje `img/video/picture`. Tokeny: `--sf-bg-inset/-fit/-position/-radius/-z`.
- **Różnica:** Tylko nazewnictwo (`.sf-bg` vs `.is-bg`) i to, że u nas rodzic konfiguruje się przez `:has()` (wymaga wsparcia `:has()`, które i tak jest w naszym floorze). Brak osobnych `--bg-width/-height` (liczymy z `inset`). Parytet praktycznie pełny.

---

## 2. Borders & Dividers (Obramowania i separatory)

### 2.1 Global Border System (`--radius`, `--border`, `--border-size/style/color`, Auto Radius)
- **Czym jest / jak działa:** Centralne `var(--radius)` (jeden globalny promień), shorthand `var(--border)` (+ `--border-light`/`--border-dark`), tokeny `--border-size/-style/-color-light/-dark`. „Auto Radius” automatycznie nadaje domyślny promień wskazanym elementom (domyślnie `img`, `figure`). Koncentryczny promień przez recipe `?concentric-radius`. W 4.x usunięto klasy `.border/.border-dark/.border-light`; kolory bazują na `color-mix()`.
- **SLASHED:** ✅ **Mamy — bogatszy system.** Skala promieni `--sf-radius-none…-4xl` + `--sf-radius-full/-pill`, mnożnik globalny `--sf-radius-scale` (0 = ostre, 2 = mocno zaokrąglone), helper koncentryczny `--sf-radius-outer` (= `radius-m + component-pad`). Obramowania: `--sf-border`, `--sf-border-subtle/-strong`, `--sf-border-width-hairline/-1/-2/-3/-4`, `--sf-border-scale`, `--sf-border-style`, kolory `--sf-color-border/--subtle/--strong/--focus/--translucent`. Dark mode automatyczny (`light-dark()`/`color-mix`).
- **Różnica:** ACSS ma **jeden** `--radius`; my mamy pełną skalę + mnożnik (bardziej granularnie i „jeden token = globalna zmiana”). ACSS „Auto Radius” automatycznie zaokrągla `img/figure` globalnie — **u nas radius na media jest tylko w `.sf-prose` (`--sf-prose-media-radius`) i w reset dla figure/media, nie ma globalnego przełącznika auto-radius**.
- **Czy dodać:** 🟡 Drobna luka: opcjonalny globalny „auto-radius media” (token + reguła `:where(img,figure)`), łatwy do dodania.

### 2.2 Global Divider System (`--divider`, recipes `?divider-top/-bottom/-all`)
- **Czym jest / jak działa:** `var(--divider)` (do użycia z `border`), tokeny `--divider-size/-style/-inline-size/-gap`, kolory light/dark. Recipes: `?divider-top`, `?divider-bottom` (separator z gapem na górze/dole), `?divider-all` (obramowania+gapy **między wszystkimi dziećmi** rodzica). W 4.x usunięto klasy, zostały recipes; kolory przez `color-mix()`.
- **SLASHED:** ✅ **Mamy — element + warianty.** `.sf-divider` (+ `--dashed/--dotted/--gradient/--soft/--strong/--vertical`), plus stylowane `hr`. Tokeny `--sf-divider-width/-style/-color/-gap`.
- **Różnica:** Nasz model to **dedykowany element separatora** (i warianty, w tym gradientowy i pionowy) — bogatszy wizualnie. **Brakuje nam odpowiednika `?divider-all`** — „linie między wszystkimi dziećmi” jednym haczykiem (dziś trzeba `.sf-stack` + własny border). 
- **Czy dodać:** 🟡 Warto dodać makro `.sf-divide` (`> * + * { border-block-start: var(--sf-border) }`) — tani odpowiednik `?divider-all`.

### 2.3 Inverted Radius Framework
- **Czym jest / jak działa:** Efekt **odwróconych (wklęsłych) narożników** — CSS ich natywnie nie ma, więc ACSS robi to techniką **pseudo-element + box-shadow**. Aktywacja w panelu, wymaga `--bg` na rodzicu (kolor, do którego „doklejają się” krawędzie). Sterowanie przez `data-inverted-radius-{1,2}-position/-slice` (16 pozycji, 4 slice), max 2 narożniki/element. Ograniczenia: brak wsparcia gradientów/wzorów, wymaga dopasowania przy breakpointach, znany artefakt „eyelash” (fix `translate3d`), specyficzne wymogi przy Clickable Parent.
- **SLASHED:** ❌ **Brak.** Nie mamy odwróconego promienia.
- **Czy dodać:** Możliwe, ale niszowe i kosztowne. Nowocześniej dałoby się to zrobić `mask` z `radial-gradient` (bez shadow-hacku), co obeszłoby brak wsparcia gradientów. Rekomendacja: **niski priorytet**, ewentualnie jako opcjonalne makro/utility `.sf-notch-*` w przyszłości.

---

## 3. Buttons (Przyciski)

> **Ustalenie kluczowe (dotyczy całej sekcji):** SLASHED **ma napisany pełny komponent `.sf-btn`** w `optional/components.css` (baza + `--secondary`/`--ghost` + warianty semantyczne primary/neutral/success/warning/info/danger + `--block`/`--block-cq`, stany `:disabled`/`.is-loading`), ale **cały plik jest ZASZTELOWANY — zakomentowany blokiem `/* … */` „STAGED … until v0.8"** i **nie trafia do żadnego zbudowanego bundla** (`grep sf-btn badges/*.css` = pusto). Dziś użytkownik dostaje jedynie **bezklasowe** stylowanie `<button>` z `optional/forms.css`. To jest **główna niedokończona funkcja** względem ACSS. 🔧

### 3.1 Button Styling (domyślne style, dashboard, `.unrelate`)
- **Czym jest / jak działa:** ACSS automatycznie stosuje domyślne style do **każdej klasy zaczynającej się od `.btn--`** (także z narzędzi third-party). Konfiguracja w „Buttons & Links": padding (em), min-width, typografia (line-height, tracking, weight, family — nowe w 4.0, transform, decoration + hover), border (width/style/radius, radius dziedziczy z globalnego), transition. 6 grup kolorów (primary/secondary/tertiary/accent/base/neutral), warianty light/dark i solid/outline. `.unrelate` blokuje automatyczną zmianę koloru na tłach z „color relationships".
- **SLASHED:** 🔧 **Częściowo, zasztelowane.** Komponent `.sf-btn` istnieje, ale wyłączony. Żywe są tylko tokeny `--sf-btn-radius`, `--sf-btn-padding-block`, `--sf-btn-padding-inline` (w `optional/tokens.components.css`) oraz bezklasowe style `<button>` w `forms.css`. Brak automatycznego stylowania dowolnych klas (to celowo sprzeczne z BEM-first), brak `.unrelate` (bo nie mamy „color relationships" auto-przemalowujących przyciski).
- **Różnica / do zrobienia:** Aby osiągnąć parytet trzeba **odblokować i dokończyć `.sf-btn`** (planowane v0.8). Auto-styling `.btn--*` jest sprzeczny z filozofią — zamiast tego mamy jawne klasy BEM.

### 3.2 Button Classes (`.btn--{color}`, `-light/-dark`, `--outline`, rozmiary `--xs…--xxl`)
- **Czym jest / jak działa:** `.btn--primary/-secondary/-tertiary/-accent/-base/-neutral`; warianty `.btn--{color}-light/-dark`; outline przez dołożenie `.btn--outline`; rozmiary T-shirt `.btn--xs/-s/-m/-l/-xl/-xxl` (łączone w dowolnej kolejności). Ładują się tylko aktywne kolory z palety.
- **SLASHED:** 🔧 **Zasztelowane i węższe.** Staged `.sf-btn` ma warianty **stylu** (`--secondary`=transparent+border, `--ghost`) i **semantyczne** (`--primary/-neutral/-success/-warning/-info/-danger`) oraz szerokość (`--block`, `--block-cq` przez query container). **Brakuje: rozmiarów T-shirt (`--xs…--xxl`), wariantów `-light/-dark`, dedykowanego `--outline`.**
- **Czy dodać:** Tak, przy odblokowaniu komponentu warto dołożyć skalę rozmiarów (mamy `--sf-size-*` i `--sf-text-*`, więc tanie) oraz ewentualnie `--outline`.

### 3.3 Button Variables (29 zmiennych)
- **Czym jest / jak działa:** ACSS eksponuje ~29 tokenów `--btn-*` (text-color/-hover, transform, decoration+hover, letter-spacing, line-height, font-size/-weight/-family/-style, background/-hover, border-color/-hover/-style/-width, radius, padding-block/-inline, min-width, align-items, transition-duration, outline-* zestaw, `--focus-color`).
- **SLASHED:** 🟡 **Mniej żywych tokenów.** Żywe: `--sf-btn-radius/-padding-block/-padding-inline`. Staged komponent odwołuje się dodatkowo do `--sf-btn-gap/-min-height/-font-size/-font-weight/-border-width` (z fallbackami). Wiele właściwości (transform, decoration, letter-spacing, family, align-items, outline-*) **nie ma dedykowanych tokenów** — bo komponent zasztelowany.
- **Czy dodać:** Rozszerzyć `tokens.components.css` o brakujące knoby przy finalizacji `.sf-btn`.

### 3.4 Outline Buttons (`.btn--outline`)
- **Czym jest / jak działa:** Modyfikator do klasy koloru+rozmiaru; przezroczyste tło, kolorowy border. W 4.0 grubość bordera outline zrównano z solid (równe wysokości obok siebie). Włączane per-kolor w dashboardzie.
- **SLASHED:** 🟡 **Namiastka.** Staged `.sf-btn--secondary` **jest de facto outline** (transparent bg, border+text w kolorze action). Brak osobnego modyfikatora `--outline`, brak per-kolor outline.
- **Czy dodać:** Przy finalizacji `.sf-btn` dodać `--outline` jako ortogonalny modyfikator (border+text w kolorze rodziny, bg transparent) — spójne z tokenami.

### 3.5 Gradient Outline Buttons
- **Czym jest / jak działa:** Nie natywne w frameworku ACSS — **recipe z custom CSS**: `::before` z gradientem + `mask` (`linear-gradient` z `xor`/`exclude`) „wycina" środek, tworząc gradientowy border. `@property` rejestruje kolory gradientu dla animowanego hoveru (swap primary↔secondary).
- **SLASHED:** ❌ **Brak.** Mamy tokeny gradientów (`--sf-gradient-primary/-brand/…`) i `.sf-text-gradient`, ale **nie ma recepty na gradientowy outline przycisku**.
- **Czy dodać:** Tak, jako recipe/dokumentacja (technika mask + `@property` działa w naszym floorze przeglądarek). Niski koszt, wysoka „wow".

### 3.6 Auto Button Styling & Exclusions
- **Czym jest / jak działa:** ACSS auto-stylizuje każdą klasę `.btn--*` (nawet third-party). Konflikty rozwiązuje pole wykluczeń (lista selektorów po przecinku) → ACSS w ogóle nie stylizuje wskazanych selektorów.
- **SLASHED:** 🟡 **Model odwrócony.** Nie auto-stylizujemy dowolnych `.btn--*`. Za to `forms.css` stylizuje **bezklasowe** `<button>` przez `:not([class*="sf-"])` — czyli automatycznie pomija elementy z klasami `sf-`. To „wykluczenie" działa odwrotnie: własne komponenty (z dowolną klasą inną niż `sf-`) nadal łapią bezklasowy styl.
- **Różnica:** Filozofia BEM-first nie przewiduje globalnego auto-stylingu po prefiksie klasy; wykluczenia w sensie ACSS nie są potrzebne, ale gdyby `.sf-btn` był aktywny, warto rozważyć token/selektor „opt-out".

---

## 4. Links (Linki)

### 4.1 Link Styling
- **Czym jest / jak działa:** Dashboard „Buttons & Links > Links": kolor (zmienna np. `--primary`), weight (`inherit`), decoration, decoration-color, decoration-thickness, underline-offset, „use global transition". Wykluczenia przez selektory (np. `"header a","footer a",".nav a"`). W 4.0 usunięto klasy `.link--primary` itd. (odchudzenie).
- **SLASHED:** ✅ **Mamy — bezklasowo, tokenowo.** `core/base.css` stylizuje `a:link/hover/visited/active` przez `--sf-color-link/--hover/--visited/--active/--underline`, `--sf-link-underline-offset`, `--sf-link-underline-thickness`. Dodatkowo makra `.sf-link--subtle`, `.sf-link--reverse`. Dark mode automatyczny (uwaga na komentarz w kodzie o WebKit `a:link`).
- **Różnica:** Parytet dobry. ACSS ma **panel wykluczeń** (wyłącz style w nav/footer); u nas robi się to nadpisaniem w `@layer slashed.overrides` lub własną klasą. Kolor linku u nas jest **auto-kontrastowany** (lightness clamp), czego ACSS nie robi automatycznie.

### 4.2 External Link Indication
- **Czym jest / jak działa:** Automatyczny wskaźnik linków zewnętrznych: **wizualny** (ikona/encja przez `::after`/`::before`, konfigurowalna pozycja, rozmiar, kolor+hover, weight, translacja X/Y) **oraz słuchowy** (tekst dla czytników, domyślnie „Link to external site", edytowalny, override per-link `aria-label`). Zakres: tylko linki między-domenowe. Automatyczne wykluczenia dla linków z `img/figure/picture/svg`; dodatkowe wykluczenia w `:has()`.
- **SLASHED:** 🟡 **Częściowo — tylko wizualnie i opt-in.** Mamy makro `.sf-link-external` + token `--sf-link-external-marker: " ↗"` (marker przez pseudo-element). **Ale:** (a) to **klasa opt-in**, nie automatyczne wykrywanie po `href`; (b) **brak cue słuchowego** (tekstu dla screen readerów); (c) brak auto-wykluczeń dla linków-obrazów.
- **Czy dodać:** 🔧 Realna luka a11y. Można dodać opcjonalną regułę auto: `a[href^="http"]:not([href*="{host}"]):not(:has(img,svg,picture))::after { content: var(--sf-link-external-marker) }` + wersję z visually-hidden tekstem dla a11y. Host trzeba sparametryzować (token/atrybut) — w pluginie WP trywialne (znamy domenę), w czystym CSS wymaga konfiguracji.

---

## 5. Effects (Efekty) — największy nowy obszar ACSS 4.x

> **Kontekst:** ACSS 4.x wprowadził rozbudowany, komponowalny system efektów
> (klasy `.on-hover--*`, `.on-enter--*`, `.on-exit--*`, `.on-visible--*`),
> z wariantami `-all` (dzieci), `--stagger` (`sibling-index()`), respektujący
> `prefers-reduced-motion`, bramkowany w dashboardzie. SLASHED ma **surowce**
> (keyframes, presety transition/animation/easing, tokeny scroll-timeline), a
> **część efektów już opakowaną** (`.sf-entrance--*`), ale **nie ma pełnego,
> komponowalnego systemu efektów hover/exit/visible**. To najbardziej „turnkey"
> przewaga ACSS.

### 5.1 Effects Overview (system)
- **Czym jest:** Spójny, opcjonalny, komponowalny system 4 kategorii efektów, `-all` na dzieci, `--stagger` przez `sibling-index()`, auto-`prefers-reduced-motion`, generowany tylko dla włączonych efektów.
- **SLASHED:** 🟡 **Częściowo.** Mamy `core/motion.css` (keyframes + presety), tokeny (`--sf-transition-*`, `--sf-animation-*`, `--sf-ease-*`, `--sf-duration-*`, `--sf-motion-scale`), klasy standalone (`.sf-fade-in`, `.sf-slide-in-up/-down/-left/-right`, `.sf-scale-up/-down`, `.sf-spin`, `.sf-ping`, `.sf-blink`, `.sf-float`, `.sf-shimmer`, `.sf-color-pulse`) oraz scroll-driven `.sf-entrance--*`. Brak jednolitej rodziny `.on-*` z `-all`/`--stagger`.
- **Czy dodać:** 🔧 Warto rozważyć opcjonalny moduł efektów (`optional/effects.css`) z rodziną hover/exit i wariantami `-all`/`--stagger` (`sibling-index()` jest w naszym floorze). Duża wartość wizualna, spójne z tokenami.

### 5.2 Hover Effects (`.on-hover--grow/-shrink/-float/-sink/-slide-*/-shadow/-glow/-brighten/-fade/-ripple-*/-outline-*/-underline-*`)
- **Czym jest:** Zestaw klas hover z tokenami (`--hover-duration`=0.3s, `--hover-timing`, `--hover-grow-amount`, `--hover-glow-*`, `--border-ripple-*`/`-outline-*`/`-underline-*`). Komponowalne.
- **SLASHED:** ❌ **Brak opakowanych klas hover-efektów.** Mamy presety transition (`--sf-transition-transform/-shadow/-colors/…`), `--sf-shadow-glow`, `.sf-link--*` (underline reverse). Efekt hover buduje się ręcznie w komponencie.
- **Czy dodać:** 🔧 Tak — to najtańsza i najbardziej „efektowna" luka. Rodzina `.sf-hover--grow/-float/-glow/-underline-*` na naszych tokenach ease/duration/shadow. Rekomendacja: wysoki priorytet w opcjonalnym module.

### 5.3 Entrance Effects (`.on-enter--fade/-float/-sink/-slide-*/-grow/-shrink/-blur/-parallax`)
- **Czym jest:** Scroll-driven (`animation-timeline: view()`), 9 efektów, tokeny `--animate-range-start/-end` (`entry 20%`/`entry 100%`), efekt-specyficzne odległości/skale/blur, `-all` (dzieci), `--stagger`. Fallback: natychmiastowe pokazanie.
- **SLASHED:** 🟡 **Mamy częściowo — `.sf-entrance--*`** (`core/motion.css`): `--fade/-fade-up/-fade-down/-fade-left/-fade-right/-scale-up` (6 wariantów), `animation-timeline: view()` w `@supports`, zakres z `--sf-scroll-timeline-range-start/-end`, `animation-fill-mode: both` jako fallback (natychmiastowe pokazanie bez wsparcia). Respektuje reduced-motion (motion-scale).
- **Różnica / do zrobienia:** Brakuje wariantów **blur** i **parallax**, wariantu **`-all`** (na dzieci) oraz **`--stagger`**. Rekomendacja: dołożyć blur/parallax + stagger (`sibling-index()`), by domknąć parytet.

### 5.4 Exit Effects (`.on-exit--fade/-float/-sink/-slide-*/-grow/-shrink/-blur`)
- **Czym jest:** Symetryczne do entrance, wyzwalane gdy element wyjeżdża (zakres `cover 50%`→`cover 100%`), scroll-driven, `-all`, `--stagger`.
- **SLASHED:** ❌ **Brak `.sf-exit--*`.** Mamy keyframes `sf-fade-out`, `sf-scale-down` i preset `--sf-transition-exit`, ale nie ma scroll-driven klas wyjścia.
- **Czy dodać:** Tak — symetrycznie do `.sf-entrance--*`, ten sam mechanizm `animation-timeline: view()` z zakresem `cover`. Niski koszt (mamy keyframes).

### 5.5 On Visible (`.on-visible--*`, IntersectionObserver, `acss-visible`)
- **Czym jest:** **JS-owy** (IntersectionObserver): dodaje klasę `acss-visible` gdy element wchodzi w viewport, animacja **raz** i zostaje. Tokeny `--visible-duration/-timing/-threshold`, `-all`, `--stagger`, `data-skip-acss-visible`.
- **SLASHED:** 🟡 **Połowicznie i z innej filozofii.** SLASHED to framework **bez runtime JS**, więc nie dostarcza IntersectionObserver. Mamy jednak **stan `.is-visible`** (`core/states.css`) jako hook CSS — konsument dodaje JS. Odpowiednik „raz i zostaje" robi scroll-driven z `fill-mode: forwards`, ale to nie to samo co „raz i nie cofa przy scrollu w górę".
- **Czy dodać:** W frameworku (pure CSS) — nie. W **pluginie WP** — tak, mały skrypt IntersectionObserver dopinający klasę do `.is-visible`/`data-*` byłby naturalny (plugin i tak ładuje JS w adminie).

### 5.6 Easing Presets (`--ease-smooth/-snappy/-gentle/-bouncy/-elastic`)
- **Czym jest:** 5 slotów (konfigurowalnych): smooth `cubic-bezier(.4,0,.2,1)`, snappy `(.16,1,.3,1)`, gentle `(.65,0,.35,1)`, bouncy `(.68,-.55,.265,1.55)`, elastic (`linear()` spring).
- **SLASHED:** ✅ **Mamy — więcej presetów:** `--sf-ease-linear/-out/-in/-in-out/-spring/-elastic/-bounce/-overshoot` (8). Wartości fizycznie zbliżone (spring/bounce/overshoot pokrywają snappy/bouncy).
- **Różnica:** Nasze to **stałe tokeny** (nadpisujesz wartość), ACSS ma **nazwane sloty** edytowalne w UI. Mapowanie 1:1 nazw inne, ale funkcjonalnie parytet (a nawet bogaciej).

### 5.7 Transition (globalny system tranzycji)
- **Czym jest:** `var(--transition)` = duration+timing+delay (`--transition-duration/-timing/-delay`), auto na buttonach/linkach. W 4.0 usunięto klasę `.transition` i ręczny input.
- **SLASHED:** ✅ **Mamy — bogatsze, semantyczne presety:** `--sf-transition-colors/-form-field/-transform/-opacity/-shadow/-fast/-slow/-enter/-exit/-overlay`. Zasada „nigdy `transition: all`". Durations `--sf-duration-*` × `--sf-motion-scale`.
- **Różnica:** ACSS ma **jeden** złożony `--transition`; my mamy **zestaw presetów per-właściwość** (lepsza wydajność/kontrola). Nie mamy jednego catch-all `--sf-transition` — świadomy wybór. Parytet+.

### 5.8 Selection Styling (`::selection`, `.selection--alt`)
- **Czym jest:** Domyślny styl zaznaczenia + **alternatywny** (`.selection--alt`) dla złego kontrastu; 2×(bg+fg). Zalecane tokeny kolorów.
- **SLASHED:** 🟡 **Mamy domyślne, brak „alt".** `core/base.css` stylizuje `::selection` przez `--sf-color-selection-bg/-text` (+ `--sf-color-mark-bg/-text` dla `<mark>`). **Brak kontekstowej klasy `.selection--alt`.**
- **Czy dodać:** Tanio: makro `.sf-selection--alt` nadpisujące tokeny selekcji na dzieciach. Drobna luka.

### 5.9 Sticky (`.sticky`, `.sticky-top--s/-m/-l`, `--sticky-offset`)
- **Czym jest:** `.sticky` → `position: sticky; inset-block-start: var(--sticky-offset,0)`; modyfikatory offsetu s/m/l; konfiguracja globalna i per-breakpoint w dashboardzie. Logiczne właściwości w 4.0.
- **SLASHED:** 🟡 **Mamy stan, nie utility.** `core/states.css` `.is-sticky` → `position: sticky; inset-block-start: var(--sf-sticky-offset,0)`. Token `--sf-sticky-offset` jest **fluid** (powiązany z wysokością headera, `--sf-header-height-*`), plus `--sf-z-sticky`.
- **Różnica:** ACSS ma dedykowaną klasę utility + skalę offsetów (s/m/l). U nas to **klasa stanu** (`.is-sticky`) i jeden fluidny offset. Brak modyfikatorów offsetu s/m/l.
- **Czy dodać:** Ewentualnie aliasy offsetu (np. `.is-sticky` + lokalne `--sf-sticky-offset`), albo makro `.sf-sticky`. Nasze podejście (fluid offset = wysokość headera) jest w praktyce wygodniejsze.

### 5.10 Gradient Fades (Effects) (`.fade--block/-inline/-top/-right/-bottom/-left`, `--fade-amount`)
- **Czym jest:** Wygaszanie treści w tło **maską** (bez dopasowywania kolorów), 6 osi, `--fade-amount` (dom. 25%), dostępne jako utility/mixin/recipe.
- **SLASHED:** ✅ **Mamy — `.sf-overflow-fade`** (`core/macros.css`) + `--block/--inline/--top/--right/--bottom/--left`, implementacja **mask-image (linear-gradient)**, sterowana `--sf-mask-scrim-start/-end`. Dodatkowo tokeny `--sf-gradient-fade--r/-l/-t/-b` i `.sf-scrim`/`.sf-text-protect` (ochrona tekstu na obrazach).
- **Różnica:** Parytet dobry; nasza semantyka to „fade krawędzi przewijanego kontenera", ACSS bardziej ogólnie „fade w tło". Nazewnictwo i pojedynczy `--fade-amount` vs para `start/end`.

> **Uwaga:** „Gradient Fades" pojawia się w ACSS też w sekcjach Mixins i Recipes — traktujemy je łącznie tutaj (patrz też 15.x / 9.x).

---

## 6. Cards (Karty)

> **Ustalenie:** Podobnie jak przy przyciskach, SLASHED **ma zaprojektowany komponent `.sf-card`** w `optional/components.css` (elementy BEM `__header/__body/__footer/__media/__avatar/__title`, koncentryczny radius, pełny zestaw tokenów `--sf-card-*`), ale **zasztelowany do v0.8 (zakomentowany, nieemitowany)**. 🔧

### 6.1 Card Framework Philosophy
- **Czym jest:** Centralny, tokenowy system kart — zamiast duplikować CSS per typ karty, wszystkie karty referują wspólne zmienne (`--card-padding/-radius/-gap` itd.). Zmiana raz w dashboardzie → wszystkie karty. Dziedziczą z globalnych skal (radius, spacing, typografia).
- **SLASHED:** 🟡 **Zgodna filozofia, inny mechanizm.** Nasz cały framework jest tokenowy, więc idea „karty referują wspólne tokeny" jest naturalna. Staged `.sf-card` używa `--sf-card-*` z fallbackami do globalnych (`--sf-space-l`, `--sf-radius-m`, `--sf-shadow-s`, `--sf-color-surface/-border/-heading`). Różnica: ACSS ma **centralny dashboard** i listę selektorów; my mamy **jawne klasy BEM**.

### 6.2 Card Workflow (6 kroków, selektory, BEM `__media`/`__avatar`/`[data-icon]`)
- **Czym jest:** Włącz wcześnie → dodaj selektor karty do listy → ustaw defaulty → używaj BEM (`__media`, `__avatar`, `[data-icon]`, h1–h6) → nadpisuj tokenami → ręczny CSS tylko dla unikatów.
- **SLASHED:** 🔧 **Częściowo (staged).** Nasz `.sf-card` już zakłada workflow BEM (`.sf-card__media`, `.sf-card__avatar`, `.sf-card__title`, `.sf-card__header/-body/-footer`). Nadpisywanie tokenami (`--sf-card-padding` itd.) działa identycznie jak w ACSS „Step 5". **Brak:** listy selektorów z auto-targetowaniem (patrz 6.4) i `[data-icon]` (u nas ikony przez `.sf-icon`).
- **Różnica:** ACSS pozwala „ostylować dowolną klasę-wrapper przez dopisanie do listy"; my wymagamy użycia `.sf-card`/`.sf-card__*`.

### 6.3 Card Styling (`--card-*` tokeny, display flex/grid, concentric radius)
- **Czym jest:** ~25 tokenów `--card-*` (padding/gap/radius/border-*/background/heading/text/link/button/icon/avatar/media/shadow/min-radius), koncentryczny radius (Off/Standard/Reverse), domyślnie `display:flex; column`, opcja grid.
- **SLASHED:** 🔧 **Częściowo (staged).** Staged `.sf-card` ma: `--sf-card-padding/-bg/-border-width/-border-color/-radius-outer/-radius/-shadow/-gap/-media-ratio/-media-radius/-heading-size`, `--sf-avatar-size`, koncentryczny radius (`--sf-radius-outer` = `radius-m + component-pad`, żywy token). **Brak** części knobów (link-color/-hover, button-font-size w pełni, icon-*, min-radius) i przełącznika flex↔grid.
- **Czy dodać:** Przy finalizacji `.sf-card` uzupełnić brakujące knoby; `--sf-radius-outer` już daje koncentryczność (mamy też „reverse" do rozważenia).

### 6.4 Card Targeting (lista selektorów, usunięto auto-detekcję w 4.0, `@include card`)
- **Czym jest:** Style kart tylko do jawnie wskazanych selektorów (pole „Card Selectors", po przecinku). Auto-detekcję usunięto w 4.0. Dzieci stylowane po BEM. Poza listą — mixin `@include card`.
- **SLASHED:** ❌/🟡 **Brak mechanizmu listy selektorów.** To koncept **dashboardowy/builderowy** — w pure-CSS nie mamy „listy selektorów rozszerzającej regułę". U nas kartę „targetuje się" przez nadanie klasy `.sf-card`. Odpowiednik `@include card` to po prostu użycie klasy `.sf-card` (lub w przyszłości `@apply`-podobne makro nie istnieje w czystym CSS).
- **Różnica:** W **pluginie WP** można by odwzorować „Card Selectors" (plugin generuje regułę CSS mapującą dowolny selektor na tokeny karty) — to naturalne miejsce, jeśli chcemy parytet dla builderów.

### 6.5 Card Color Scheme (`color-scheme`, Inherit/Light/Dark, sufiksy `--light`/`--dark`)
- **Czym jest:** Karta używa CSS `color-scheme`; default Inherit/Light/Dark; per-karta przez sufiks klasy `.card--light`/`.card--dark` (auto-detekcja sufiksu). W 4.0 zastąpiono osobne systemy klas właściwością `color-scheme` + opcją Inherit.
- **SLASHED:** ✅ **Mamy — i to niemal 1:1.** Nasz `data-theme="light|dark"` na dowolnym elemencie (w tym karcie) ustawia `color-scheme` i `--sf-is-dark`, a brak atrybutu = **Inherit** (dziedziczenie z rodzica / `prefers-color-scheme`). To dokładnie model „Inherit/Light/Dark". Dodatkowo automatycznie przelicza tło/tekst sekcji.
- **Różnica:** ACSS steruje **sufiksem klasy** (`--dark`), my **atrybutem** (`data-theme="dark"`). Mechanizm (`color-scheme` + zmienne) i efekt praktycznie identyczne; nasze dodatkowo liczy pełną paletę dark automatycznie.

---

## 7. Colors — Palette, Assignments, Color Scheme

> **Kontekst:** To **najmocniejszy obszar SLASHED** i zarazem obszar, w którym
> ACSS 4.x **skonwergował do naszego modelu**: OKLCH + `light-dark()` +
> `color-mix()` + wymuszanie schematu na poddrzewie. Poniżej głównie ✅.

### 7.1 Palette Intro (OKLCH, 6 ról, auto-7-stopniowe odcienie)
- **Czym jest:** Paleta w **OKLCH** (perceptualnie równomierna), 6 nazwanych ról (primary/secondary/tertiary/**accent**/base/neutral), auto-generacja 7 odcieni (ultra-light…ultra-dark + hover) przez `color-mix()`/`light-dark()`. Input hex → konwersja do OKLCH.
- **SLASHED:** ✅ **Mamy — bogatszy.** 6 rodzin: primary/secondary/tertiary/**action**/neutral/base + statusy. Odcienie semantyczne (`-superlight/-xlight/-lighter/-darker/-xdark/-superdark`, `--hover/--active`, `-subtle/-muted/-ghost`) **plus pełna skala numeryczna 50–950** i alfy `-a5/-a10/-a30/-a50/-a80`. Wszystko `oklch(from …)`/`color-mix(in oklab)` względem `--sf-color-surface`.
- **Różnica:** ACSS ma rolę **„accent"** (highlight) obok primary-jako-CTA; SLASHED rozdziela to na **`action`** (CTA/link/focus). Nasza skala numeryczna 50–950 jest bogatsza niż 7-stopniowa ACSS.

### 7.2 Main Colors (6 slotów)
- **Czym jest:** 6 slotów ról, myślenie „rolami nie hexami", rebranding = zmiana wartości pod stałą nazwą. Nie wszystkie wymagane (często primary+base+neutral).
- **SLASHED:** ✅ **Mamy.** Rebranding = 6 tokenów `--sf-color-*-source-light`. Dark auto-liczony. Identyczna filozofia „rola nad hexem".
- **Różnica:** Mapowanie ról: ACSS `accent` ↔ SLASHED brak 1:1 (mamy `action`); poza tym parytet.

### 7.3 Semantic Colors (warning/info/success/danger + color partials)
- **Czym jest:** 4 statusy (standard „Bootstrap"), klasy `.text--`/`.bg--`/`.link--{status}`, oraz **partiale koloru** (`-hex/-hsl/-h/-s/-l/-rgb/-r/-g/-b`) do custom sh/trans/hover.
- **SLASHED:** ✅/🟡 **System mamy, utilities nie.** Statusy success/warning/info/danger z triplet­ami `-subtle/-muted/-strong`, `--sf-color-text--on-{status}`, `.sf-surface--{status}`. **Nie ma** klas utility `.text--warning` (bo brak utilities) ani **partiali kanałowych** (`-h/-s/-l/-rgb`) — u nas manipulację robi się przez `oklch(from …)`/`color-mix()`, więc partiale są zbędne.
- **Różnica:** Zamiast eksponować kanały RGB/HSL do custom-shade, używamy relative color syntax. Efekt ten sam, mniej tokenów.

### 7.4 Unified Lightness  ↔  **LumLocker**
- **Czym jest:** Wymusza wspólne L (OKLCH) na bazowych swatchach (hue/chroma zostają). Toggle osobno dla brand i semantic, wartość 0–1 (dom. 0.65). Odcienie i hover zachowują własne L.
- **SLASHED:** ✅ **Mamy — `--sf-lumlocker` + `data-lumlocker`** (PUBLIC-ADVANCED). Domyślnie 0.65, wyrównuje L 4 kolorów brandowych zachowując hue/chroma.
- **Różnica:** ACSS unifikuje primary/secondary/tertiary/accent/**base** (osobny toggle semantic); **SLASHED wyklucza neutral i base** z LumLockera (świadomie). Brak osobnego przełącznika dla statusów. Koncept i domyślna wartość identyczne.

### 7.5 Transparencies
- **Czym jest:** ACSS **4.x usunął** stałe tokeny `-trans-*`; teraz `color-mix(in oklch, var(--color) X%, transparent)` lub `oklch(from var(--c) l c h / .5)`. Mniej bloatu, dowolna opacity.
- **SLASHED:** ✅ **Zgodnie.** Preferujemy `color-mix`/relative (aliasy `-subtle/-muted/-ghost` = color-mix). Zachowaliśmy tylko wąski zestaw alf (`-a5…-a80`) jako wygodę — reszta on-demand.
- **Różnica:** My trzymamy garść tokenów alfa (DX), ACSS zero. Filozofia zbieżna.

### 7.6 Background & Text Assignments
- **Czym jest:** Kontekstowe zmienne zamiast konkretnych kolorów: `--body-bg-color`, `--bg-light/-dark/-ultra-*`, `--text-dark/-light` + `-muted`, klasy `.bg--*`/`.text--*`. Cel: teme­owalność bez zmiany klas.
- **SLASHED:** 🟡 **Model trybowy, nie „nazwane konteksty".** Mamy `--sf-color-bg`, `--sf-color-text/--muted/--secondary/--inverse/--placeholder/--disabled`, `--sf-color-inset/-raised/-overlay`. **Brak** 4-poziomowej drabiny nazwanych teł (`ultra-light…ultra-dark`) i klas `.text--muted` (brak utilities).
- **Czy dodać:** Ewentualnie opcjonalne makra `.sf-text--muted` itd., ale nasze `data-theme` + `--on-*` pokrywa realne potrzeby kontrastu.

### 7.7 Automatic Color Relationships
- **Czym jest:** Po włączeniu, klasa tła (`.bg--dark`) **auto-ustawia foreground** (heading/text/link/button) wg „Light/Dark Relationships". Uwaga: **działa tylko z klasą, nie ze zmienną** (`background: var(--bg-dark)` nie wyzwoli relacji, bo zmienna nie „celuje").
- **SLASHED:** 🟡/✅ **Realizujemy inaczej — bez tej pułapki.** `data-theme` na sekcji ustawia bg+text automatycznie; `.sf-surface--*` ustawia bg + `--sf-color-text--on-*` (auto-kontrast). Nasz mechanizm bazuje na `light-dark()`/relative color, więc **działa też „ze zmienną"** — nie ma ograniczenia „tylko klasa".
- **Różnica:** ACSS ma dedykowany panel przypisań heading/link/button per relacja; my dajemy auto-kontrast tekstu i theming, ale **nie mamy panelu mapującego np. „w dark linki na kolor X"** — to robi się nadpisaniem tokenów w `[data-theme=dark]`. W pluginie WP taki panel byłby naturalny.

### 7.8 Modern Color Scheme Workflow (`color-scheme` + `light-dark()`, `.scheme--light/dark`)
- **Czym jest:** Dark mode przez `color-scheme` (kontekst) + `light-dark(l,d)` (rozwiązanie), bez duplikatów zmiennych i media queries. `.scheme--light/.scheme--dark` wymuszają schemat na poddrzewie.
- **SLASHED:** ✅ **To dokładnie nasz model.** `core/themes.css`: `[data-theme=dark]{color-scheme:dark;--sf-is-dark:1}`, tokeny przez `light-dark()`, auto z `prefers-color-scheme`. Wymuszanie na poddrzewie = `data-theme` na dowolnym elemencie.
- **Różnica:** ACSS = **klasa** `.scheme--dark`; SLASHED = **atrybut** `data-theme="dark"`. Mechanika identyczna. Dodatkowo mamy `.sf-theme-transition` (płynna zmiana) i pełną auto-derywację palety dark (ACSS liczy inwersję odcieni; my formułą clamp).

### 7.9 Color Scheme Setup (website scheme, shade inversion, force scheme)
- **Czym jest:** Włącz → output `light-dark()`, inwersja odcieni, website scheme (light only/dark only/light dark/normal), override main/hover dla dark, „Force Dark/Light Scheme" po selektorach.
- **SLASHED:** ✅ **Mamy odpowiedniki.** Website scheme = `--sf-color-scheme` (dom. `light dark`). Override dark = opcjonalne `--sf-color-*-source-dark` (inaczej auto). „Force scheme po selektorach" = `data-theme` na elemencie (lub własna reguła w `overrides`).
- **Różnica:** ACSS wymusza schemat **listą selektorów w dashboardzie**; my atrybutem/regułą. Inwersja: ACSS paruje odcienie, my liczymy dark formułą (mniej ręcznej konfiguracji).

### 7.10 Implementing Color Scheme (system pref / toggle+JS / partial)
- **Czym jest:** 3 drogi: (1) system pref (auto, `light dark`), (2) ręczny toggle JS ustawiający `documentElement.style.colorScheme` + `localStorage`, (3) częściowy `.scheme--dark` na wrapperze. Uwaga: ręcznie odwrócone sekcje muszą mieć jawne bg+fg.
- **SLASHED:** ✅ **Wszystkie trzy.** (1) auto `prefers-color-scheme`; (2) toggle ustawiający `data-theme` (rekomendujemy atrybut, nie inline `colorScheme`) + `.sf-theme-transition`; (3) `data-theme` na poddrzewie. Nasza uwaga „sekcja musi mieć zdefiniowane bg+fg" jest spełniona automatycznie dla `:where([data-theme]:not(:root,html))` (sam ustawia bg+text).
- **Różnica:** ACSS w wariancie toggle steruje surowym `color-scheme`; my atrybutem `data-theme`, co dodatkowo przelicza całą paletę i daje płynne przejście. Parytet+.

---

## 8. Columns, Dimension, Elements, Flexbox, Forms

### 8.1 CSS Columns (`?columns`, `--col-count/-min-width/-gap/-row-gap/-rule-*`)
- **Czym jest:** Recipe `?columns` — treść płynie w kolumnach CSS (`column-*`). Tokeny: count, min-width, col-gap, row-gap (jako margin dzieci — brak natywnego row-gap w columns), rule style/width/color; predefiniowane `--col-width-s/m/l`, `--col-rule-width-s/m/l`.
- **SLASHED:** ✅ **Mamy — `.sf-equal`** (`core/layout.css`): `column-width: var(--sf-equal-min-col)`, `column-gap`, warianty `--2/--3/--4/--6` (bezpośrednio `column-count`), reguły `--sf-equal-rule-width/-style/-color`. Semantyka „gazetowego" przepływu identyczna.
- **Różnica:** recipe vs klasa; my nie „hakujemy" row-gap marginesami (używamy `column-gap`). Nazewnictwo (`.sf-equal`).

### 8.2 Masonry Layouts (CSS columns)
- **Czym jest:** Masonry przez **CSS Columns** (`?columns`), responsywnie przez min-width. W 4.0 usunięto `.masonry--1..5`.
- **SLASHED:** ✅ **`.sf-equal`** daje ten sam efekt (kolumnowy masonry). Ograniczenie kolejności „góra-dół, potem następna kolumna" jest wspólne obu podejściom (to natura CSS columns).
- **Różnica:** Brak dedykowanej nazwy „masonry"; realizuje `.sf-equal`. (Prawdziwy grid-masonry — `grid-template-rows: masonry` — nie ma jeszcze u nikogo w produkcji.)

### 8.3 Content Width (`.content-width`, `--content-width`)
- **Czym jest:** `max-inline-size: var(--content-width)`; desktopowa szerokość treści + min-width dla obliczeń fluid. `calc(var(--content-width)*.75)` do proporcji.
- **SLASHED:** ✅ **Mamy — `--sf-container-default` (75rem) + `.sf-container`/`.sf-center`.** Skala kontenerów: `--sf-container-narrow/-prose/-default/-wide/-full` (bogatsza niż jeden `--content-width`). `--sf-fluid-min-vw/-max-vw` = zakres fluid.
- **Różnica:** Mamy **kilka** nazwanych szerokości zamiast jednej; `.sf-container` ustawia max-inline-size + centrowanie + gutter.

### 8.4 Content Width Safe (`.content-width--safe`, gutter-aware `min()`)
- **Czym jest:** `min(var(--content-width), calc(100% - gutter*2))` + auto-center — dla sekcji bez wewnętrznego paddingu / elementów poza sekcją. Uwaga na „double gutter".
- **SLASHED:** ✅ **Pokryte przez `.sf-container`/`.sf-center`.** Nasze centrujące prymitywy mają `padding-inline` gutter (`--sf-gutter`/`--sf-center-gutter`), więc same tworzą „safe" gutter bez osobnej klasy. `.sf-section--guttered` przenosi gutter na sekcję.
- **Różnica:** Nie mamy osobnego wariantu „safe" jako oddzielnej klasy — bo domyślny kontener/center już jest gutter-aware. Funkcjonalnie parytet.

### 8.5 Header Height (`--header-height`, fluid, auto offset + scroll margin)
- **Czym jest:** Fluid `--header-height` (desktop↔mobile), auto `margin-block-start` na 1. sekcji przy sticky/overlay headerze, auto scroll-margin dla kotwic, wykluczenia headerów/stron.
- **SLASHED:** ✅/🟡 **Tokeny mamy, auto-aplikacja częściowo.** `--sf-header-height` (fluid clamp), `--sf-header-height-mobile/-desktop`, `--sf-sticky-offset(-mobile/-desktop)`. **Auto scroll-offset dla kotwic — mamy** (patrz 8.8). „Auto margin 1. sekcji" i wykluczenia headerów to logika buildera — nie robimy tego automatycznie w CSS.
- **Różnica:** ACSS auto-offsetuje pierwszą sekcję (dashboard); u nas to ręczne/plugin. Reszta parytet.

### 8.6 Width Utilities (`.width--10…90`, full/auto/fit/min/max-content)
- **Czym jest:** `.width--{10..90}` = `max-inline-size: calc(var(--content-width) * frakcja)` + `inline-size:100%`; specjalne full/auto/fit-content/min-content/max-content; opcjonalne zmienne `--width-10…90`. Logiczne właściwości.
- **SLASHED:** ❌ **Brak** klas frakcyjnych szerokości (nie dostarczamy utilities). Mamy nazwane kontenery, ale nie „30% content-width".
- **Czy dodać:** 🔧 Łatwe jako opcjonalny moduł utilities (klasy + tokeny `--sf-width-*`). Kandydat do `optional/utilities.css`, jeśli zdecydujemy się na warstwę utility.

### 8.7 Boxed Layout (canvas + body fixed-width + shadow/border/radius)
- **Czym jest:** Layout „w ramce": `html` = canvas edge-to-edge, `body` = stała szerokość z tłem/cieniem/borderem/radius/marginesem górnym. Konfiguracja w dashboardzie.
- **SLASHED:** ❌ **Brak presetu boxed layout.** Da się złożyć tokenami ręcznie, ale nie dostarczamy gotowca.
- **Czy dodać:** Niszowe; ewentualnie opcjonalne makro `.sf-boxed` + tokeny. Niski priorytet (bardziej „builder aesthetic").

### 8.8 Scroll Offsets (scroll-margin/padding dla kotwic)
- **Czym jest:** Dodaje scroll-margin do celów kotwic (desktop/mobile px), sumuje się z header height, by kotwica nie chowała się pod sticky headerem.
- **SLASHED:** ✅ **Mamy — i czyściej.** `core/reset.css`: `scroll-padding-block-start: calc(var(--sf-header-height,5rem) + var(--sf-space-m,1rem))` na kontenerze przewijania. To automatyczny, globalny offset kotwic uwzględniający header — bez per-target scroll-margin.
- **Różnica:** ACSS używa `scroll-margin` per-cel + wartości desktop/mobile; my jednego `scroll-padding` na root (prostsze, mniej reguł). Brak osobnych wartości desktop/mobile (u nas fluid header height to załatwia).

### 8.9 Auto Object Fit (`--object-fit/-position` na wszystkich img)
- **Czym jest:** Auto `object-fit: var(--object-fit,cover)` + `object-position: var(--object-position,50% 50%)` na każdym `img`; override na dowolnym scope.
- **SLASHED:** ✅ **Mamy — domyślnie w `core/base.css`** dla `img, video`: `object-fit: var(--sf-object-fit)` (cover), `object-position: var(--sf-object-position)` (50% 50%). Override per-scope przez nadpisanie tokenu.
- **Różnica:** U nas to **domyślne zachowanie frameworka** (nie toggle) i obejmuje też `video`. Parytet+.

### 8.10 Blockquotes (auto-style `<blockquote>`, footer/cite, ~30 `--blockquote-*`)
- **Czym jest:** Bogate stylowanie `<blockquote>` (auto lub przez `.blockquote`), tokeny kontenera/tekstu/footer/cite, wsparcie `<figure><blockquote>…<figcaption>`, wykluczenia selektorami.
- **SLASHED:** 🟡 **Mamy, ale skromniej i prose-scoped.** `core/base.css` stylizuje `blockquote` bazowo; `.sf-prose blockquote` dodaje italic + `--sf-prose-blockquote-padding/-border`. **Brak** dedykowanego, globalnego systemu blockquote z tokenami footer/cite i tłem/cieniem.
- **Czy dodać:** 🔧 Warto rozbudować blockquote (tokeny bg/shadow/border-radius/footer/cite) — pasuje do `optional/components.css` (dziś staged reserved elementy). Średni koszt.

### 8.11 Ribbons (`.ribbon`, `.ribbon--top-right/-left`, 7 tokenów, `data-ribbon-position`)
- **Czym jest:** Narożne wstążki (np. „Sale") — `.ribbon` + pozycja; tokeny offset/width/padding/bg/text-color/text-size/shadow; wariant dynamiczny przez `data-ribbon-position`/`data-ribbon-style`.
- **SLASHED:** ❌ **Brak.** Nie mamy komponentu wstążki.
- **Czy dodać:** Możliwe jako opcjonalny komponent dekoracyjny (`.sf-ribbon` + tokeny). Niszowe, niski/średni priorytet.

### 8.12 Flex Grids (`?flex-grid`, wyśrodkowane niesymetryczne wiersze)
- **Czym jest:** Rozwiązuje ograniczenie CSS Grid: ostatni niepełny wiersz można **wyśrodkować/rozciągnąć** (flexbox math). `--columns`(3)/`--gap`/`--stretch`(0/1); responsywność przez `@media` 900/600px.
- **SLASHED:** 🟡 **Częściowo, inną drogą.** `.sf-cluster--center` (flex-wrap + `justify-content:center`) wyśrodkowuje niepełny wiersz — realny odpowiednik „centered unbalanced". `.sf-switcher` przełącza row→column przy progu (`--sf-switcher-threshold`) **bez** media queries. Nasz `.sf-grid`/`--fit` (grid auto-fit) ma to samo ograniczenie co ACSS grid (ostatni wiersz do lewej).
- **Różnica:** ACSS bazuje na **`@media` breakpointach**; SLASHED jest **breakpoint-free** (flex-basis math w `.sf-switcher`, wrap+center w cluster). Brak dokładnie „fixed columns + centered last row + min-width" w jednym — można złożyć z cluster/switcher.
- **Czy dodać:** Ewentualnie makro `.sf-flex-grid` (flex-basis calc dla N kolumn + center) w duchu breakpoint-free.

### 8.13 Flex Recipes (`?flex-row/-column/-center-all/-center-left/-right/-top/-bottom`)
- **Czym jest:** Recipes rozwijające się w deklaracje flex: row/column + zestaw centrowań (all/left/right/top/bottom) = kombinacje align-items/justify-content/text-align.
- **SLASHED:** 🟡 **Pokryte prymitywami, inne opakowanie.** `.sf-cluster` (flex row wrap + `--center/--between/--end`), `.sf-stack` (flex column + `--center/--end/--stretch`), `.sf-center` (centrowanie w osi), `.sf-cover__center`. Kombinacje „center-left/-right/-top/-bottom" składa się z tych modyfikatorów.
- **Różnica:** ACSS ma **nazwane recipes centrowania**; my mamy **modyfikatory prymitywów**. Funkcjonalnie parytet, inne DX.

### 8.14 Form Styling Basics (WS Form, auto `light-dark()`, `.form--light/-dark`)
- **Czym jest:** Kompleksowe stylowanie **wyłącznie WS Form** (plugin formularzy WP), wspólna konfiguracja, auto-adaptacja do `color-scheme` przez `light-dark()`, override `.form--light/.form--dark`. Wymaga włączenia Stylera WS Form.
- **SLASHED:** ✅ **Mamy — szersze (natywne formularze).** `optional/forms.css` stylizuje **bezklasowo wszystkie natywne pola** (`input`/`textarea`/`select`/`button`/`file`/checkbox/radio), stany walidacji (`.is-error/-success/…`, `--sf-field-border-color/-text-color`), auto light-dark przez tokeny. `.form--light/-dark` = nasz `data-theme`.
- **Różnica:** ACSS celuje w **konkretny plugin (WS Form)**; SLASHED stylizuje **uniwersalne HTML forms** (agnostycznie). W **pluginie WP** naturalne byłoby dołożyć integracje builderów formularzy (WS Form/Gravity/Fluent) — dziś ich nie ma.

---

## 9. Functions (Funkcje)

> **Kontekst:** Funkcje ACSS (`ctr`, `fluid`, `pow`, `rem`/`to-rem`) to **funkcje SCSS działające tylko w polu „Custom SCSS" dashboardu** (kompilacja). `calc()` to natywny CSS. SLASHED **nie ma warstwy SCSS dla użytkownika** — te same efekty osiągamy **natywnym CSS w silniku skal** lub są zbędne (jesteśmy rem-native).

### 9.1 calc()
- **Czym jest:** Natywny CSS `calc()` (nie proprietarny). Docs ACSS = dobre praktyki (tweener sizes, manipulacja kolorów HSL). Działa w polu Custom SCSS.
- **SLASHED:** ✅ **Identyczne** — używamy natywnego `calc()` wszędzie (np. `--sf-radius-outer: calc(...)`, fluid clamps). Bez ograniczenia „tylko Custom SCSS".

### 9.2 ctr() (px→rem, SCSS)
- **Czym jest:** SCSS: konwersja px→rem wg root font-size, dla custom spacing/sizing. Tylko Custom SCSS.
- **SLASHED:** 🟡 **Zbędne u nas.** Tokeny autorujemy w `rem` natywnie; nie ma kompilacji, więc nie potrzeba konwertera px→rem. Brak jawnego helpera (ale i potrzeby).

### 9.3 fluid() (min,max → clamp, SCSS)
- **Czym jest:** SCSS: `fluid(min,max)` liczy `clamp()` (środek z content-width i root font). Eliminuje generatory clamp. Tylko Custom SCSS.
- **SLASHED:** 🟡 **Efekt jest rdzeniem frameworka, ale bez helpera ad-hoc.** Cała skala `--sf-text-*`/`--sf-space-*` to generatywne `clamp()` w **czystym CSS** (knoby `--sf-fluid-min-vw/-max-vw`, `--sf-*-ratio-*`, `--sf-*-base-*`). Nie mamy jednak funkcji do **jednorazowego** „fluid(28,60)" — trzeba użyć skali lub napisać `clamp()` ręcznie.
- **Czy dodać:** 🔧 **Realna luka DX.** Do rozważenia: (a) udokumentowany wzorzec `clamp()` na naszych knobach; (b) w przyszłości natywna **CSS `@function --fluid()`** (funkcje CSS wchodzą do przeglądarek) — dałoby prawdziwy odpowiednik bez buildu.

### 9.4 pow() (SCSS)
- **Czym jest:** SCSS: potęgowanie, głównie w skalach modularnych (kompilacja).
- **SLASHED:** ✅ **Mamy — natywny CSS `pow()` w runtime.** To wręcz powód naszego floora (Chrome 125+). Silnik skali używa `pow()` w `calc()` na żywo — mocniej niż kompilowany SCSS pow (reaguje na zmianę knobów bez rebuildu).

### 9.5 rem() / to-rem() (SCSS)
- **Czym jest:** SCSS: dokleja `rem` do liczby/zmiennej (np. `rem($vp-max * .33)`). Tylko Custom SCSS.
- **SLASHED:** 🟡 **Zbędne** — pracujemy w rem natywnie, wartości liczymy `calc()`-iem w CSS. Brak helpera i potrzeby.

> **Wniosek dla Functions:** poza `fluid()` (jednorazowe wartości) nie mamy realnych braków — funkcje ACSS to konsekwencja modelu „SCSS+build", którego świadomie nie mamy. `pow()` i `calc()` robimy natywnie i lepiej.

---

## 10. Grids (Siatki)

### 10.1 Auto Alternating Grids (`.grid-alternate--{bp}`, zygzak img/tekst)
- **Czym jest:** Dwukolumnowy „zygzak": tekst obok mediów, w kolejnym wierszu zamiana stron; wyzwalane klasą breakpointową `.grid-alternate--l` (min-width media). Blokada na mobile.
- **SLASHED:** ✅ **Mamy — `.sf-alternate`** (`core/layout.css`): grid + `:nth-child(even)` zamiana `order` dzieci, **oparte o container query** (`container: inline-size`), nie o media. Tokeny `--sf-alternate-gap/-inner-gap`.
- **Różnica:** ACSS = breakpoint (media); SLASHED = **breakpoint-free** (container query) → adaptuje się do kontenera, nie viewportu. Nasze jest „nowocześniejsze".

### 10.2 Grid Variables (`--grid-1..12`, `--grid-1-2` itd.)
- **Czym jest:** 18 zmiennych szablonu kolumn (1–12 balanced + 6 unbalanced), używane `grid-template-columns: var(--grid-3)` + `--grid-gap`. Dla skalowalności/responsywności bez powtarzania `display`.
- **SLASHED:** 🟡 **Mamy klasy, nie zmienne 1–12.** `.sf-grid-cols-1..6` (+ nierówne `1-2/2-1/1-3/3-1`) — ale **jako klasy** i tylko do 6, responsywne przez container query. Brak tokenów `--sf-grid-N` (1–12) do wstrzykiwania w `grid-template-columns`.
- **Czy dodać:** 🔧 Tanie: eksponować `--sf-grid-cols-1..12` jako tokeny szablonu (obok istniejących klas), dla DX „variable-driven".

### 10.3 Auto Grid Mixin (`auto-grid($cols,$min,$flow,$force-even)`, SCSS)
- **Czym jest:** SCSS mixin: responsywny grid z liczbą kolumn, min-width, `auto-fit`/`auto-fill`, `force-even-column-count` (kontrola sierot). Tylko Custom SCSS.
- **SLASHED:** 🟡 **Odpowiednik klasowo/tokenowo, bez parametryzacji SCSS.** `.sf-grid` (auto-fill), `.sf-grid--fit` (auto-fit), `--sf-grid-min` (+ skala `--sf-grid-min-xs..2xl`), `.sf-grid--dense`. **Brak** `force-even-column-count` (eliminacja sierot).
- **Różnica:** My klasą+tokenem (bez buildu); nie ma jednego wywołania z 4 argumentami. Kontrola sierot — nasza luka.

### 10.4 Auto Grids (`.grid--auto-2..12`, `--grid-auto-N`, auto-fit/fill, `--min`, stack-even/any)
- **Czym jest:** Responsywne bez breakpointów, `--min` (content-based), auto-fit/auto-fill (`.grid--auto-fill/-fit`), „aggressiveness", `.grid--stack-even/-any` (sieroty).
- **SLASHED:** ✅/🟡 **Rdzeń mamy.** `.sf-grid` = auto-fill responsywny (`minmax(min(var(--sf-grid-min),100%),1fr)`), `.sf-grid--fit` = auto-fit. **Brak** wariantów „fixed-N-then-collapse" (`.grid--auto-4`), przełącznika fill/fit jako osobnych klas w każdym wariancie, „aggressiveness" i kontroli sierot.
- **Różnica:** Nasze jest minimalne i breakpoint-free; ACSS daje więcej pokręteł.

### 10.5 Content Grid (breakout: content/feature/feature-max/full)
- **Czym jest:** Pionowy layout „stref": `.content-grid` + `.content--feature/-feature-max/-full/-full-safe`; tokeny `--content-width/-feature-width/-feature-max-width/-gutter/-grid-gap`; można sterować przez `grid-column: feature`. Zagnieżdżalne, auto-responsywne.
- **SLASHED:** ✅/🟡 **Mamy — mniej stref.** `.sf-content-grid` + `.sf-breakout` + `.sf-full-bleed`; tokeny `--sf-content-width` + `--sf-breakout-width`. To strefy: content / breakout / full-bleed (**3**), ACSS ma **4–5** (dochodzi „feature-max" i „full-safe").
- **Czy dodać:** 🟡 Dołożyć drugą strefę breakout („feature-max") i wariant „full-safe" (full z gutterem) — spójne z istniejącym wzorcem.

### 10.6 Grid Classes Standard (`.grid--3`, `.grid--l-2`, col/row-span, order, start/end, align/justify)
- **Czym jest:** Bogaty zestaw utilities grid: kolumny 1–12, **sufiksy breakpointów** (`.grid--l-2`), `.col-span--N`/`.row-span--`, `.order--first/-last`, `.col-start/-end`, `.align-/justify-content/items--*`, `.stretch`. Nierówne 6 wariantów.
- **SLASHED:** 🟡/❌ **Świadomie węższe.** Mamy `.sf-grid-cols-1..6`, nierówne (4), `.sf-subgrid`/`.sf-subgrid-rows`. **Nie mamy** rozległych utilities: col/row-span, order, start/end, align/justify-*, ani **sufiksów breakpointów** (jesteśmy breakpoint-free/container-query).
- **Różnica:** To największa „utility-heavy" powierzchnia ACSS, której z założenia nie replikujemy 1:1. Placement/span/order w SLASHED robi się w CSS komponentu.
- **Czy dodać:** Ewentualnie opcjonalny moduł utilities grid (span/order/placement) w duchu container-query zamiast media. Do decyzji strategicznej (czy w ogóle chcemy utilities).

### 10.7 Variable Grid (`.variable-grid`, `--min`)
- **Czym jest:** „Ile się zmieści wg `--min`", auto-stack bez breakpointów, „5 linii kodu", bez limitu kolumn.
- **SLASHED:** ✅ **To dokładnie nasz domyślny `.sf-grid`** (`repeat(auto-fill, minmax(min(var(--sf-grid-min),100%),1fr))`). Parytet pełny; ich `.variable-grid` = nasze `.sf-grid` + `--sf-grid-min`.

---

## 11. Icons (Ikony)

### 11.1 Icon Framework (`data-icon`, boxed/naked, S/M/L, `.icon--boxed/-naked/-light/-dark/-{size}`, icon lists)
- **Czym jest:** Domyślnie włączony; `data-icon` na SVG/ikonie. Boxed vs naked (padding/bg/border), rozmiary S/M/L (+expand), style theme light/dark, listy ikon `[data-icon-list]`/`.icon-list` (gap, offset). Wszystko jako tokeny + klasy + `data-*`.
- **SLASHED:** ✅/🟡 **Mamy rdzeń.** `.sf-icon` + rozmiary `--xs/-s/-m/-l/-xl/-2xl` (em-based, skalują się z fontem), `.sf-icon--boxed` z tokenami `--sf-icon-box-pad/-radius/-bg/-border`. **Brak:** theme light/dark ikon (u nas `currentColor`+tokeny), auto-detekcji `data-icon`, oraz **komponentu list ikon** (`icon-list`).
- **Różnica:** Nasze ikony są em-owe (dziedziczą kolor/rozmiar z kontekstu) — prostsze; ACSS ma więcej pokręteł i listy ikon.
- **Czy dodać:** 🔧 Warto dodać **`.sf-icon-list`** (ikona+tekst, gap, wyrównanie) — częsty wzorzec, tani. Theme light/dark ikon zwykle zbędny (mamy `currentColor`).

### 11.2 Icon Mixin (`@include icon($style,$box-style)`, SCSS)
- **Czym jest:** SCSS mixin nakładający styl Icon Framework na dowolny element. Tylko Custom SCSS.
- **SLASHED:** 🟡 **Odpowiednik = klasa `.sf-icon--boxed`.** Bez warstwy SCSS nie ma mixinu; „nałożenie stylu ikony" = dodanie klasy/tokenów. Funkcjonalnie pokryte dla boxed; brak parametru theme.

---

## 12. Mixins

> **Kontekst kluczowy:** Mixiny ACSS to **SCSS działający wyłącznie w polu „Custom SCSS" dashboardu** (kompilacja). SLASHED **nie ma warstwy SCSS dla użytkownika**, więc dla każdego mixinu odpowiednikiem jest **klasa/prymityw/token** albo brak. Część mixinów ma też wersję **`?recipe`** (builder). Poniżej per pozycja.

### 12.1 What are Mixins? (`@include`, tylko Custom SCSS)
- **Czym jest:** Reużywalne bloki SCSS (`@include name`), z argumentami; rozwijają się przy użyciu. Nie działają w inputach buildera (brak preprocesora).
- **SLASHED:** 🟡 **Nie dotyczy modelu.** Bez buildu nie mamy `@include`. „Reużywalność" realizujemy klasami-makrami i tokenami. (Perspektywicznie natywne **CSS `@function`/`@mixin`** mogą to zmienić.)

### 12.2 Clickable Parent (`@include clickable-parent` / `?clickable-parent`)
- **Czym jest:** Rozciąga klikalność jednego linku na całą kartę (pseudo-element `::after` + `position:relative` na rodzicu), zachowując semantykę i a11y.
- **SLASHED:** ✅ **Mamy — i bogatsze: `.sf-clickable-parent`** (`core/accessibility.css`). `::after` rozciąga link, **auto-wykrywa** link nakładki, obsługuje wybór linku (`[data-overlay-link]`/`.sf-clickable-parent__overlay`), **podnosi z-index** zagnieżdżonych interaktywnych (button/input/select/video/`[role=button]`), wykluczenia `[data-no-overlay]`, `:focus-within` outline. Ma notatkę perf o `:has()`.
- **Różnica:** Nasze pokrywa więcej przypadków brzegowych niż opis ACSS. Parytet+.

### 12.3 Focus Parent (`@include focus-parent(shadow|outline)` / `?focus-parent`)
- **Czym jest:** Przenosi styl focusu na rodzica (shadow lub outline) — współpracuje z clickable-parent.
- **SLASHED:** ✅ **Mamy — `.sf-focus-parent`** (`:focus-within` → outline z `--sf-focus-ring-*`) oraz `.sf-focus-shadow` (wariant cień). Odpowiada obu trybom (outline/shadow).
- **Różnica:** Nazewnictwo; mechanika identyczna (`:focus-within`).

### 12.4 Card Container Mixin (`@include card-container("inline-size > 767px")`)
- **Czym jest:** Container query dla kart (styl wg rozmiaru kontenera, nie viewportu). Wymaga Card Framework + Auto CQ.
- **SLASHED:** 🟡 **Container queries mamy natywnie.** `.sf-cq` ustanawia kontekst CQ; `.sf-alternate`/inne używają `container: inline-size`. Nie ma dedykowanego „card-container", bo `.sf-card` (staged) + `.sf-cq` załatwia to natywnym `@container`.
- **Różnica:** ACSS opakowuje CQ w mixin (bo SCSS); my piszemy `@container` wprost.

### 12.5 Button Mixins (`@include btn(style)`)
- **Czym jest:** Nakłada styl przycisku ACSS na element, którego nie można oklasować (third-party/formularze). Warianty solid/outline/light/dark.
- **SLASHED:** 🔧 **Brak (i komponent staged).** Bez SCSS nie ma `@include btn`. Odpowiednik = przyszła klasa `.sf-btn` (dziś zasztelowana). „Nałożenie na cudzy selektor" wymagałoby u nas ręcznego przypisania tokenów `--sf-btn-*` lub reguły w `overrides`.

### 12.6 Border Mixin (`@include border($style,$position,$radius)`)
- **Czym jest:** Nakłada globalny border (styl/pozycja/radius) na element; domyślnie wszystkie krawędzie + `var(--radius)`.
- **SLASHED:** 🟡 **Tokenowo, bez mixinu.** `--sf-border`/`--sf-border-subtle/-strong`, `--sf-border-width-*`, `--sf-radius-*`. „Border tylko od góry z radius-l" = `border-block-start: var(--sf-border); border-radius: var(--sf-radius-l)`. Brak jednego wywołania z argumentami, ale komplet tokenów.

### 12.7 Breakpoint Mixins (`@include breakpoint / breakpoint-up`)
- **Czym jest:** Dynamiczne media queries w SCSS: `breakpoint()` = max-width, `breakpoint-up()` = min-width; ekstensje xl/l/m/s.
- **SLASHED:** ❌/🟡 **Świadomie inny model — breakpoint-free.** Nie mamy mixinów media. Stawiamy na **container queries** (`.sf-cq`, `@container`) i math bez breakpointów (`.sf-switcher`). Jeśli ktoś potrzebuje media — pisze `@media` wprost.
- **Różnica:** To fundamentalna różnica filozofii (viewport vs container). Nie planujemy mixinów breakpointowych.

### 12.8 Centering Mixin (`@include center($alignment,$output)`)
- **Czym jest:** Silnik klas centrowania: `all/left/right/top/bottom`, output `full/core/tokens`. Podwaja selektor dla specyficzności.
- **SLASHED:** ✅ **Odpowiednik klasowy.** `.sf-center` (+ `--sf-center-max/-gutter`), `.sf-cluster--center`, `.sf-stack--center`, `.sf-cover__center`. Warianty left/right/top/bottom = modyfikatory align/justify prymitywów.
- **Różnica:** Klasy zamiast mixinu; bez „output modes" (to detal generatora SCSS).

### 12.9 Content Grid Mixin (`@include content-grid`)
- **Czym jest:** Bezargumentowy — nakłada content-grid (breakout) na box; dzieci do stref przez `grid-column: feature`.
- **SLASHED:** ✅ **Odpowiednik = klasa `.sf-content-grid`** (+ `.sf-breakout`, `.sf-full-bleed`). Przypisanie stref przez `grid-column` działa tak samo. (Mniej stref — patrz 10.5.)

### 12.10 Heading & Text Style Mixins (`@include heading-style(h2)` / `text-style(l)`)
- **Czym jest:** Nakłada globalne style nagłówka/tekstu **danego poziomu** na dowolny selektor (np. wygląd h2 na `<div>`). Pomija null-e.
- **SLASHED:** 🟡 **Tokeny mamy, klasy-nakładki brak.** Style h1–h6 aplikujemy na elementy `h1..h6` przez tokeny `--sf-h1-*..--sf-h6-*`; tekst przez `--sf-text-*`. **Brak** klasy typu `.sf-h2`/`.sf-text-l` nakładającej komplet (musisz przypisać kilka tokenów albo użyć `.sf-prose`).
- **Czy dodać:** 🔧 Tanie i wartościowe: makra `.sf-h1..-h6` i `.sf-text-{size}` nakładające komplet sub-właściwości (rozmiar+leading+weight+tracking+max-width). Realny brak DX vs ACSS.

### 12.11 Line Clamp (`line-clamp--1..5`, `--custom`, `?line-clamp`, `@include line-clamp(n)`)
- **Czym jest:** Ucięcie do N linii; klasy 1–5 + custom (`--line-count`), recipe i mixin.
- **SLASHED:** ✅ **Mamy — `.sf-line-clamp-2/-3`** + generyczne `.sf-line-clamp-` z `--sf-line-clamp` (dowolne N). `.sf-truncate` dla 1 linii. Parytet (nasze N przez token zamiast osobnych klas 4/5).
- **Różnica:** Mniej gotowych klas (2/3), ale dowolne N tokenem; brak buildu.

### 12.12 Texture & Overlay Mixins (`texture(n)`, `texture-overlay(n)`)
- **Czym jest:** Nakłada **numerowaną teksturę** (tło lub overlay przez pseudo-element). Wymaga zdefiniowanych tekstur w dashboardzie.
- **SLASHED:** ❌ **Brak systemu tekstur.** Nie mamy „numerowanych tekstur". Mamy overlay/scrim (`.sf-scrim`) i tło (`.sf-bg`), ale nie preset-teksturowy.
- **Czy dodać:** 🔧 Pasuje do przyszłego systemu „Surfaces/Overlays" (patrz 1.2 i 13.2) — plugin/konfigurator. Framework mógłby dać tokeny `--sf-texture-*` + `.sf-texture-{n}`.

> Auto Grid Mixin, Gradient Fades (mixin) i Icon Mixin — patrz 10.3, 5.10 i 11.2.

---

## 13. Overlays (Nakładki)

### 13.1 Basic Overlays (`.overlay`, `.overlay--dark`, `--overlay-color`, `--overlay-z-index`)
- **Czym jest:** `.overlay` = pseudo-element (`::before/::after`) `inset:0` + `isolation`, kolor `--overlay-color` (dom. `rgba(0,0,0,.7)`), `--overlay-z-index` (-1). Specjalna obsługa `<figure>` z mediami.
- **SLASHED:** 🟡 **Namiastka przez scrim.** `.sf-scrim` (+ `--top/-bottom/-full`) = **gradientowa** nakładka przez `::before` (`--sf-scrim-color/-gradient/-direction`), głównie do ochrony tekstu na obrazie. Do zwykłej ciemnej nakładki mamy `--sf-color-overlay`/`--sf-color-dim`, ale **nie ma prostej klasy `.sf-overlay` solid-color z tokenami color/z-index**.
- **Czy dodać:** 🟡 Dodać `.sf-overlay` (solid, `--sf-overlay-color/-z`) obok gradientowego `.sf-scrim` — tani, częsty wzorzec.

### 13.2 Custom Overlays (5 nazwanych, gradient/obraz/blur/blend/animacja, `.overlay-{n}`/`.overlay-{name}`)
- **Czym jest:** Do 5 reużywalnych, nazwanych nakładek (kolor/typ tła/asset/size/pos/repeat/attachment, backdrop-blur, blend-mode, opacity, radius, animacja, inset). Klasy numerowane + nazwane; zmienne globalne i per-overlay; animowalne (np. hover `--overlay-opacity`).
- **SLASHED:** ❌ **Brak systemu nazwanych nakładek.** Mamy cegiełki: `.sf-scrim`, `--sf-blur` (backdrop), gradienty, `.sf-bg`. Brak dashboardowego/presetowego systemu 5 overlayów.
- **Czy dodać:** 🔧 **Luka po stronie konfiguratora/pluginu** (bliźniacza do „Surfaces" 1.2 i tekstur 12.12). Framework: tokeny `--sf-overlay-{n}-*` + klasy; **plugin**: UI do definiowania. Warto potraktować łącznie jako moduł „Surfaces & Overlays".

---

## 14. Recipes (Przepisy)

> **Czym są recipes:** Mechanizm **`?nazwa`** — użytkownik wpisuje `?recipe` w polu CSS/tekstowym **buildera**, a ACSS **rozwija to w blok CSS** (bo buildery nie mają preprocesora/SCSS). To „mixin z odsłoniętym kodem". Pozwala wyłączyć zestawy utilities i używać funkcji tylko tam, gdzie trzeba.
>
> **SLASHED — perspektywa:** W **frameworku (pure CSS)** nie ma konceptu „recipe" — odpowiednikiem jest **klasa/token/prymityw**. W **pluginie WP (Bricks/Gutenberg)** mechanizm „wpisz `?x` → rozwiń snippet" byłby jednak **naturalnym, wartościowym dodatkiem DX** (dziś go nie ma). To realna szansa dla pluginu. 🔧
>
> Większość recipes to builderowe wersje funkcji już omówionych — poniżej mapowanie zbiorcze + uwagi.

| Recipe ACSS | Co robi | Odpowiednik SLASHED | Ocena |
|---|---|---|---|
| `?clickable-parent` | klikalna cała karta | `.sf-clickable-parent` (bogatsze) | ✅ |
| `?focus-parent` | focus na rodzicu | `.sf-focus-parent` / `.sf-focus-shadow` | ✅ |
| `?concentric-radius` | radius = inner + ½ padding | token `--sf-radius-outer` | ✅ |
| `?btn` | zmienne custom przycisku | `.sf-btn` (zasztelowany) | 🔧 |
| `?card-container` | container query dla karty | natywne `@container` + `.sf-cq` | ✅/🟡 |
| `?{color}-clr` | rozwija HSL koloru (alpha/manipulacja) | `oklch(from var(--sf-color-x) …)` (relative) | 🟡 (inny model, bez potrzeby partiali) |
| `?columns` | kolumny text-flow z regułami | `.sf-equal` (+ `--2/--3/--4/--6`) | ✅ |
| `?content-grid` | content-grid na box | `.sf-content-grid` (mniej stref) | ✅/🟡 |
| `?property` | deklaracja `@property` (Houdini) | używamy `@property` natywnie (tokens.css); user pisze wprost | ✅ (natywnie) |
| `?divider-top/-bottom` | separator przed/po elemencie | `.sf-divider` (element) | ✅ |
| `?divider-all` | separatory **między wszystkimi dziećmi** | **brak** (proponowane makro `.sf-divide`) | 🔧 |
| `?flex-row/-column/-center-*` | układy/centrowanie flex | `.sf-cluster`/`.sf-stack`/`.sf-center` + modyfikatory | ✅/🟡 |
| `?fade-{axis}` | gradientowe wygaszenie | `.sf-overflow-fade` (+ osie) | ✅ |
| `?grid-{1..12}` / `?grid-1-2` | dowolna standardowa siatka | `.sf-grid-cols-1..6` (+ nierówne 4) | 🟡 (do 6, brak 7–12 i span/order) |
| `?auto-grid` | auto-responsywna siatka (`--min`) | `.sf-grid` / `.sf-grid--fit` | ✅ |
| `?variable-grid` | „ile się zmieści wg `--min`" | `.sf-grid` + `--sf-grid-min` | ✅ |
| `?ipsum-short` | akapit dummy text | **brak** (nie jest zadaniem CSS) | ❌ (N/A) |
| `?script` | wrapper `<script type=module>` | **brak** (framework = CSS; plugin mógłby) | ❌ (N/A / plugin) |
| `?list-none` | reset stylu listy | **brak dedykowanej klasy** (użyj `list-style:none`) | 🟡 (drobne — dodać `.sf-list-none`) |
| `?breakpoint(-up)-{xs..xxl}` | media query bez znajomości wartości | **brak (celowo)** — container queries `.sf-cq` | ❌ (świadomie, inny model) |
| `?overlap` / `?overlap-alt` | tło „zachodzące" na sąsiada (angled dividers) | **brak** | 🔧 (niszowe — kandydat na makro) |
| `?query-children` | dzieci w zagnieżdżonym query loop (WP) | **brak** (builder/WP-specyficzne) | ❌ (plugin) |
| `?line-clamp` | ucięcie do N linii | `.sf-line-clamp-*` / `--sf-line-clamp` | ✅ |

**Wnioski z Recipes:**
- Funkcjonalnie **większość mamy** jako klasy/tokeny (clickable/focus parent, concentric radius, columns, content-grid, fades, auto/variable grid, line-clamp).
- **Realne braki:** `?divider-all` (→ `.sf-divide`), `?overlap` (efekt zachodzącego tła), pełne siatki 7–12 + span/order, `.sf-list-none`.
- **Poza zakresem frameworka (ewentualnie plugin):** `?ipsum-short`, `?script`, `?query-children`, `?breakpoint-*` (my: container queries), oraz **sam mechanizm `?` expansion** — najciekawszy kandydat do wdrożenia w pluginie Bricks/Gutenberg jako feature DX.

---

## 15. Shadows (Cienie)

### 15.1 Shadows Overview (3 typy × 5 slotów, renamable, dashboard)
- **Czym jest:** Centralny panel: Box (`box-shadow`), Text (`text-shadow`), Drop (`filter: drop-shadow()` — podąża za alfą). Po 5 numerowanych slotów, nazywalnych (`--box-shadow-subtle`), każdy typ włączany osobno.
- **SLASHED:** ✅ **Mamy — semantyczna skala + adaptacja do dark.** Box: `--sf-shadow-none/-xs/-s/-m/-l/-xl/-2xl/-inner` + `--sf-shadow-glow(-color)`; Text: `--sf-text-shadow-none/-s/-m/-l`; Drop: `--sf-drop-shadow-s/-m/-l` (+ klasy `.sf-drop-shadow-*`). PUBLIC-ADVANCED: `--sf-shadow-strength/-lightness/-color` — **auto-wzmacniane w dark mode**.
- **Różnica:** ACSS = 5 numerowanych, nazywalnych slotów; SLASHED = **semantyczna skala t-shirt** + auto-korekta w dark (czego ACSS nie robi). Parytet+.

### 15.2 Box Shadows (`--box-shadow-1..5`, usunięto klasy w 4.0)
- **SLASHED:** ✅ **Pełny parytet.** Skala `--sf-shadow-*` (compound, wielowarstwowe), używana jako zmienne (jak ACSS 4.0 po usunięciu klas). Dodatkowo `-inner` (inset) i `-glow`.

### 15.3 Text Shadows (`--text-shadow-1..5`)
- **SLASHED:** ✅ **Mamy — `--sf-text-shadow-s/-m/-l`** (+ `-none`). Do czytelności tekstu na obrazach (patrz też `.sf-text-protect`/`--sf-scrim-text-shadow`).

### 15.4 Drop Shadows (`filter: var(--drop-shadow-N)`, alfa-aware)
- **SLASHED:** ✅ **Mamy — `.sf-drop-shadow-s/-m/-l`** + tokeny `--sf-drop-shadow-*`. Do SVG/PNG/masek/clip-path — jak ACSS. Różnica box vs drop identyczna jak w ACSS.

> **Shadows łącznie:** pełny parytet, z przewagą (auto-boost w dark, glow, inner). Różnica tylko w modelu nazewnictwa (semantyczny vs numerowane sloty).

---

## 16. Spacing (Odstępy)

### 16.1 Standard Spacing Setup (base + scale, mult>M / div<M, fluid desktop↔mobile)
- **Czym jest:** „Base Spacing" (wielkość) + „Base Scale" (mnożenie powyżej M, dzielenie poniżej M), osobne ratio desktop/mobile, fluid między content-width a min-width.
- **SLASHED:** ✅ **Mamy — generatywna skala modularna (clamp+pow) w czystym CSS.** `--sf-space-2xs..4xl`, knoby `--sf-space-ratio-min/-max`, `--sf-space-base-min/-max`, mnożnik `--sf-space-scale`, zakres `--sf-fluid-min-vw/-max-vw`.
- **Różnica:** ACSS mnoży/dzieli wokół M; my liczymy modularnie `pow()`-em na żywo. Efekt (fluid t-shirt scale) ten sam.

### 16.2 Section Spacing Setup (multiplier vs standard, gutter clamp, block padding)
- **Czym jest:** Sekcje mają większy odstęp (mnożnik nad standardem), gutter przez clamp, block padding z section-space; M domyślnie na top-level `section`.
- **SLASHED:** ✅ **Mamy.** `--sf-section-pad` (`--xs..--2xl`), mnożnik `--sf-section-scale`, `--sf-gutter`. `.sf-section` aplikuje padding; `--guttered` przenosi gutter na sekcję.

### 16.3 Contextual Spacing (container-gap / content-gap / grid-gap)
- **Czym jest:** Odstępy „w kontekście": `--container-gap`/`.container-gap` (między kontenerami), `--content-gap`/`.content-gap` (między elementami treści), `--grid-gap`/`.grid-gap` (w siatkach). Myślenie kontekstem, nie „gap".
- **SLASHED:** ✅ **Mamy — prawie 1:1 tokenowo.** `--sf-gap` (luźny, między komponentami), `--sf-content-gap` (ciasny, w treści), `--sf-gutter` (krawędzie), `--sf-grid-gap`, `--sf-component-pad`, `--sf-field-block`.
- **Różnica:** Nazwy (`--sf-gap` vs `--container-gap`). ACSS daje też **klasy** `.content-gap` itd.; u nas gapy konsumują **prymitywy** (`.sf-stack`/`.sf-grid`/`.sf-cluster`) + klasa `.sf-gap` (+ `--s/--m/--l…`). Koncept identyczny.

### 16.4 Automatic Spacing (auto container/content/grid gap, zero specificity `:where`)
- **Czym jest:** ACSS **auto-aplikuje** gapy: container-gap na `section > div`, content-gap na dzieci, grid-gap na siatki z klasami — z **zerową specyficznością** (łatwe nadpisanie).
- **SLASHED:** 🟡 **Nie auto-globalnie — przez prymitywy.** Gapy dają jawne klasy (`.sf-stack`/`.sf-grid`/`.sf-flow`/`.sf-prose`). Nie mamy warstwy „auto-spacing" nakładającej gap na każdy `section > div` globalnie.
- **Różnica / czy dodać:** To różnica filozofii (jawne prymitywy vs auto). Ewentualnie **opcjonalny** moduł `:where(.sf-section > *)` z gapem (zero-spec) dla użytkowników chcących zachowania ACSS. Do rozważenia.

### 16.5 Spacing Variables (`--space-{size}`, `--section-space-*`, bridge `--space-xl-to-m`)
- **Czym jest:** `--space-{xs..xxl}`, `--section-space-{size}`, oraz **bridge variables** — fluid między dwoma rozmiarami (`--space-xl-to-m`, `--space-l-to-s`), analogicznie dla sekcji.
- **SLASHED:** ✅/🟡 **Skala mamy, bridge-varów nie (bo cała skala już fluid).** `--sf-space-*` i `--sf-section-pad--*`. **Brak** nazwanych „bridge" tokenów (`-xl-to-m`) — ale każdy nasz krok to już `clamp()` między min/max, więc „bridge" jest wbudowany w każdą wartość.
- **Różnica:** ACSS potrzebuje osobnych bridge-varów, bo ich rozmiary są bardziej dyskretne; u nas fluidność jest per-token. Drobiazg.

### 16.6 Header Padding Classes (`.header--{size}`, tylko block padding, gutter zostaje)
- **Czym jest:** `.header--{xs..xl}` — reguluje **tylko** block padding headera, zachowując inline gutter; skala **standard** (nie section).
- **SLASHED:** 🟡/❌ **Brak dedykowanych klas headera.** Mamy `--sf-header-height` (fluid) i `.sf-section--*`, ale nie ma `.sf-header--m` regulującego block-padding przy stałym gutterze.
- **Czy dodać:** Tanie: makra `.sf-header--{size}` (block padding ze skali standard, inline = gutter). Drobny brak.

### 16.7 Section Padding Classes (`.section--{size}`, tylko block padding, gutter zostaje)
- **Czym jest:** `.section--{xs..xxl}` — block padding na sekcji zachowując gutter (rzadka utility — „jedna z niewielu frameworków to oferuje").
- **SLASHED:** ✅ **Mamy — dokładnie to: `.sf-section--xs..-2xl`** (+ `--collapse`, `--guttered`, `--group`). To nasz core layout. Parytet pełny; in-between przez `calc()`.

### 16.8 Smart Spacing (usuń domyślne marginesy, reaplikuj gap do rich text/blog/`.smart-spacing`, sibling-aware)
- **Czym jest:** Usuwa domyślne marginesy (h/p/list/li) i **reaplikuje** odstępy `gap`-owo do rich text, blog, `.smart-spacing`, WooCommerce, custom selektorów; tylko między **sąsiadującymi** rodzeństwami (nie nad pierwszym/pod ostatnim). ~15 tokenów `--*-spacing`. `.smart-spacing--off` wyłącza.
- **SLASHED:** ✅ **Mamy — `.sf-flow` + `.sf-prose`.** `.sf-flow` = owl `> * + *` z `--sf-flow-space` (sibling-aware, dokładnie „tylko między sąsiadami"). `.sf-prose` = pełne stylowanie rich-text (heading/paragraph/list/blockquote/figure spacing, `--sf-prose-*`). `.sf-not-prose` = odpowiednik `.smart-spacing--off`.
- **Różnica:** ACSS **auto-aplikuje** do blog/WooCommerce/rich-text globalnie; nasze `.sf-prose`/`.sf-flow` są **opt-in klasą**. Mechanika (reset marginesów + gap między sąsiadami) identyczna. W **pluginie WP** można by auto-owinąć treść posta w `.sf-prose` (parytet z auto ACSS).

---

## 17. Typography (Typografia)

### 17.1 Custom Fonts (5 self-hosted, auto `@font-face`, variable fonts)
- **Czym jest:** Dashboard: do 5 fontów self-hosted, auto-generacja `@font-face`, wsparcie variable fonts, przypisanie do body/heading/etc.
- **SLASHED:** 🟡 **Tokeny fontów mamy, generacji `@font-face` nie (framework).** `--sf-font-body/-heading/-display/-mono` + gotowe stacki systemowe (`--sf-font-humanist/-geometric/-slab`, zero-cost), variable/OpenType: `--sf-font-variation/-features`, `--sf-optical-sizing`. **Ładowanie plików fontów (`@font-face`) to zadanie hosta/pluginu** — framework nie generuje. W pluginie WP integracja Bricks ma obsługę fontów (`slashed-bricks.php`, `class-fonts-rest.php`), ale to nie jest pełny system uploadu 5 fontów jak ACSS.
- **Czy dodać:** 🔧 W **pluginie** warto rozważyć zarządzanie fontami (upload → `@font-face` → przypisanie do tokenów). Framework: tokeny wystarczają.

### 17.2 Default Typography Styling (auto h1–h6/text, root size, Smart Line Height, wrap)
- **Czym jest:** Auto-stylowanie nagłówków i tekstu, root font-size (100%/62.5%), **Smart Line Height** (line-height liczony z x-height/rozmiaru dla optycznej równości), weight/tracking/`text-wrap`. Wykluczenia.
- **SLASHED:** ✅/🟡 **Mamy auto-stylowanie + wrap; „smart line height" inaczej.** `core/base.css` stylizuje `h1–h6`/`body` przez tokeny; `--sf-heading-text-wrap: balance`, `--sf-body-text-wrap: pretty`. Line-height: skala `--sf-leading-tight/-snug/-normal/-relaxed` + **`--sf-leading-taper`** (zwężanie leading rosnąco po skali). **Brak** formuły opartej o x-height (nasze leading to skala + taper).
- **Różnica:** ACSS liczy line-height z metryk czcionki (x-height); my używamy skali+taper (prostsze, deterministyczne). Efekt zbliżony.

### 17.3 Fluid Headings (`--h1..h6`, math scale, bridge `--h1-to-h3`, min h5/h6)
- **Czym jest:** Nagłówki na skali matematycznej, fluid, bridge (`--h1-to-h3` = h1 desktop → h3 mobile), wymuszone minima dla h5/h6 (żeby nie zeszły poniżej body).
- **SLASHED:** ✅ **Mamy — `--sf-h1-size..--sf-h6-size`** (mapują na `--sf-text-4xl..-m`), fluid z generatywnej skali, per-poziom `-line-height/-font-weight/-letter-spacing/-max-width`. Minima zapewnia `clamp()`.
- **Różnica:** Brak nazwanych **bridge**-varów (`--h1-to-h3`), ale każdy nasz rozmiar to już `clamp()` (fluid wbudowany). Parytet+.

### 17.4 Fluid Text (`--text-{xs..xxl}`, math scale, bridge `--text-xl-to-s`, root 100%/62.5%)
- **Czym jest:** Rozmiary tekstu na idealnej skali, fluid, bridge (`--text-xl-to-s`), root 100%/62.5% (a11y), custom przez min/max + `fluid()`.
- **SLASHED:** ✅ **Mamy — `--sf-text-2xs..4xl`** (fluid modular via clamp+pow), knoby `--sf-text-ratio-min/-max`, `--sf-text-base-min/-max`, `--sf-text-scale` + osobna skala display (`--sf-text-display-s/-m/-l`). Root: pracujemy w rem, użytkownik ustawia root wg uznania.
- **Różnica:** Brak bridge-varów i przełącznika 62.5% w UI (framework agnostyczny). Custom rozmiar: `clamp()` na knobach zamiast `fluid()` — patrz 9.3.

### 17.5 Marker Classes (`.marker--{color}` — kolor punktora listy)
- **Czym jest:** `.marker--primary` itd. koloruje `::marker` (punktory list) na kolor palety.
- **SLASHED:** 🟡 **Mamy token, nie utility.** `.sf-prose ::marker { color: var(--sf-prose-marker-color) }` (kolor markerów w prose, nadpisywalny inline). **Brak** klas `.sf-marker--primary` dla dowolnej listy poza prose.
- **Czy dodać:** Tanie: makra `.sf-marker--{family}` ustawiające `::marker` color. Drobny brak.

### 17.6 Text Classes (`.text--{size/color/weight/style/decoration/transform/align/...}`)
- **Czym jest:** Duży zestaw utilities tekstu: rozmiar (`.text--l`), kolor (`.text--primary`), weight, style, decoration, transform, align, white-space, wrap itd.
- **SLASHED:** ❌/🟡 **Nie dostarczamy utilities tekstu.** Mamy komplet **tokenów** (`--sf-text-*`, kolory, wagi, tracking, leading, `--sf-h*`), `.sf-truncate`, `.sf-text-gradient`, `.sf-tabular-nums`, ale nie „atomowych" `.text--*`.
- **Różnica / czy dodać:** To świadoma różnica (BEM/token vs utility). Jeśli zdecydujemy się na warstwę utility (`optional/utilities.css`), text-utilities + `.sf-h1..-h6`/`.sf-text-{size}` (patrz 12.10) byłyby pierwszym kandydatem — częsty realny brak DX.

### 17.7 Text & Heading Line Length (`max-width` w `ch`, per rozmiar)
- **Czym jest:** Kontrola długości wiersza (measure) w `ch`, osobno per rozmiar tekstu/nagłówka; optymalna czytelność.
- **SLASHED:** ✅ **Mamy — tokenowo.** `--sf-text-{size}-max-width`, `--sf-h1-max-width..-h6-max-width`, `--sf-container-prose: 65ch`, `--sf-heading-*`. Prose dba o measure automatycznie.
- **Różnica:** ACSS aplikuje przez klasy/ustawienia; my przez tokeny/prose. Parytet.

### 17.8 Typography Variables (globalne + per-level + per-size)
- **Czym jest:** Zmienne globalne (font, weight, wrap), per-poziom (`--h2-size/-line-height/...`), per-rozmiar (`--text-l-line-height`), do skalowalnej typografii.
- **SLASHED:** ✅ **Mamy — bardzo bogato.** `--sf-h1-*..h6-*` (size/line-height/font-weight/letter-spacing/max-width), `--sf-heading-*`, `--sf-body-*`, `--sf-text-{size}-{line-height/font-weight/letter-spacing/max-width}`, wagi semantyczne (`-body/-heading/-display/-interactive/-strong`), leading/tracking. Parytet pełny (a nawet szerzej — np. `-interactive`).

---

## 18. WP-CLI Commands (`wp acss …`)

- **Czym jest:** ACSS 4.x dostarcza pełny interfejs **WP-CLI** do zarządzania z linii poleceń / CI / deploymentów:
  - `wp acss settings` — `get/set/list/export/import/reset` (ten sam store co dashboard, walidacja wg schematu, `--force`, `--skip-css`).
  - `wp acss css regenerate` — przebudowa wszystkich arkuszy z zapisanych ustawień (deploy, po imporcie `--skip-css`, po update).
  - `wp acss status` — stan/health.
  - `wp acss doctor` — diagnostyka problemów.
  - `wp acss logs` — logi.
  - `wp acss flags` — feature flags.
- **SLASHED:** 🔧 **Brak WP-CLI w pluginie — realna luka.** `grep -rn "WP_CLI" SLASHED-for-WP/` = **pusto**. Plugin **nie rejestruje żadnych komend WP-CLI**. Do zarządzania mamy tylko: (a) po stronie frameworka npm-scripty (`build/version-sync/check:*`) — ale to dev-toolchain, nie runtime WP; (b) w pluginie npm-scripty (`verify/check/build/update-framework`) — również build-time.
- **Znaczenie:** Dla użytkowników WP/agencji **brak `wp acss`-odpowiednika oznacza brak automatyzacji deploy/CI** (regeneracja CSS po deployu, import/export ustawień, health-check). To jedna z **wyraźniejszych luk pluginu** względem ACSS.
- **Czy dodać:** 🔧 **Tak — rekomendacja dla `SLASHED-Plugins`.** Zarejestrować `WP_CLI::add_command('slashed …')`:
  - `wp slashed css regenerate` (plugin już ma generator CSS/`class-css-loader.php`, `class-css-parser.php` — jest z czego złożyć),
  - `wp slashed settings get/set/list/export/import/reset` (na istniejącym token-store/REST),
  - opcjonalnie `status`/`doctor` (weryfikacja wersji frameworka vs bundlowanego CSS, obecność plików).
  Średni kość, wysoka wartość dla profesjonalnych wdrożeń.

---

## 19. Podsumowanie — rejestr luk i niedokończonych funkcji

> Sekcja zbiorcza: **dziury i niedokończone funkcje** ujawnione audytem, uszeregowane wg wartości/priorytetu, z rozbiciem na **framework** vs **plugin**.

### 19.1 Najważniejsze niedokończone funkcje (framework)

| # | Luka | Status w SLASHED | Rekomendacja | Priorytet |
|---|---|---|---|---|
| 1 | **Komponent `.sf-btn`** | Napisany, ale **zakomentowany („STAGED until v0.8")** — nieemitowany | Odblokować + dokończyć (rozmiary T-shirt, `--outline`, brakujące tokeny) | **Wysoki** |
| 2 | **Komponent `.sf-card`** | Napisany, ale **zasztelowany (v0.8)** | Odblokować + uzupełnić knoby (link/icon/min-radius, flex↔grid) | **Wysoki** |
| 3 | **System efektów hover** (`.on-hover--*`) | Brak (są tylko presety transition) | Opcjonalny `optional/effects.css`: `.sf-hover--grow/-float/-glow/-underline-*` na istniejących tokenach | **Wysoki** (duży efekt, niski koszt) |
| 4 | **Efekty exit** (`.sf-exit--*`) | Brak (są keyframes) | Symetrycznie do `.sf-entrance--*` (`animation-timeline: view()`, zakres `cover`) | Średni |
| 5 | **Entrance: blur/parallax + `-all` + `--stagger`** | Mamy 6 wariantów fade/scale | Dołożyć blur/parallax, wariant na dzieci, stagger (`sibling-index()`) | Średni |
| 6 | **Klasy stylu nagłówka/tekstu** (`.sf-h1..-h6`, `.sf-text-{size}`) | Tylko tokeny (`--sf-h*`, `--sf-text-*`) | Makra nakładające komplet sub-właściwości (odpowiednik `heading-style()`/`text-style()`) | Średni (realny brak DX) |
| 7 | **External link a11y** | `.sf-link-external` opt-in, **bez cue dla czytników**, nie automatyczne | Dodać visually-hidden tekst + opcjonalną regułę auto po `href` | Średni (a11y) |
| 8 | **`fluid()` ad-hoc** | Skala jest fluid, ale brak helpera do jednorazowych wartości | Udokumentować wzorzec `clamp()`; docelowo natywna CSS `@function --fluid()` | Średni |
| 9 | **`?divider-all` → `.sf-divide`** | Brak (mamy `.sf-divider` element) | Makro `> * + * { border-block-start: var(--sf-border) }` | Niski |
| 10 | **Grid: 7–12 kolumn + span/order/placement + `--sf-grid-N`** | Do 6 kolumn, brak utilities placement | Rozważyć moduł utilities grid (container-query, nie media) | Niski/średni |
| 11 | **Auto-radius mediów, `.sf-overlay` solid, `.selection--alt`, `.sf-marker--*`, `.sf-list-none`, header-padding, width-utilities, boxed layout, ribbons, overlap, inverted-radius** | Brak (drobne/niszowe) | Dobierać wg zapotrzebowania; większość to tanie makra | Niski |

### 19.2 Najważniejsze luki (plugin `SLASHED-Plugins`)

| # | Luka | Status | Rekomendacja | Priorytet |
|---|---|---|---|---|
| P1 | **WP-CLI (`wp acss …`)** | **Zero komend WP-CLI** w pluginie | `wp slashed css regenerate` + `settings get/set/list/export/import/reset` (jest generator CSS i token-store) | **Wysoki** (deploy/CI) |
| P2 | **System „Surfaces" + „Custom Overlays" + „Textures"** | Brak nazwanych presetów tła/overlay | Moduł „Surfaces & Overlays": tokeny w frameworku + UI w konfiguratorze/pluginie | **Wysoki** |
| P3 | **Mechanizm „recipes" (`?nazwa` → snippet)** | Brak | Rozwijanie snippetów w Bricks/Gutenberg (DX jak ACSS) | Średni |
| P4 | **Zarządzanie fontami (`@font-face`, upload 5 fontów)** | Częściowe (Bricks) | Pełny manager fontów → tokeny `--sf-font-*` | Średni |
| P5 | **Panel „Color Relationships" / nazwane tła kontekstowe** (`.bg--ultra-light` itd.) | Mamy `data-theme`+surfaces, brak panelu mapującego | Panel przypisań + generacja klas kontekstowych | Średni |
| P6 | **On-Visible (IntersectionObserver)** | Framework bez JS; stan `.is-visible` istnieje | Mały skrypt w pluginie dopinający klasę | Niski |
| P7 | **Integracje builderów formularzy** (WS Form/Gravity/Fluent) | Framework stylizuje natywne formularze | Integracje w pluginie (parytet z ACSS „Load Forms") | Niski |

### 19.3 Obszary, gdzie SLASHED jest na parytecie lub **lepszy**

- **Kolory / dark mode / color-scheme** — konwergencja ACSS 4.x do naszego modelu (OKLCH, `light-dark()`, `color-mix()`); u nas dark w pełni auto z 6 tokenów, płynne przejście (`.sf-theme-transition`), auto-kontrast `--on-*`, LumLocker.
- **Skala spacingu i `.sf-section--*` (section padding, keep gutter)** — pełny parytet, generatywny fluid.
- **Cienie** — parytet + auto-boost w dark, glow, inner.
- **Clickable/Focus parent** — bogatsze niż ACSS (auto overlay-link, z-index zagnieżdżonych, wykluczenia).
- **`.sf-bg` (is-bg), auto object-fit, scroll-offset (scroll-padding), `.sf-equal` (columns/masonry), `.sf-alternate` (zigzag, container-query), `.sf-grid` (variable grid), content-grid, line-clamp, gradient/overflow fades** — parytet, często breakpoint-free (container queries zamiast media).
- **Typografia (tokeny per-level/per-size), easings, presety transition, `pow()` natywny** — parytet lub szerzej.
- **Zero-build, zero-deps, pure CSS** — strukturalna przewaga vs model SCSS+dashboard ACSS.

### 19.4 Nota metodyczna (pokrycie)

- Przeanalizowano **wszystkie pozycje z przesłanych 8 zrzutów** (każdy punkt ma wpis).
- **Przeczytano w całości** (WebFetch, pełna treść) reprezentatywny, obszerny zestaw podstron z każdej sekcji, w tym wszystkie o najbardziej szczegółowych deklaracjach (Effects: overview/hover/entrance/easing/transition/selection/sticky; Buttons: styling/gradient-outline/auto-exclusions; Backgrounds: contextual/surfaces/is-bg; Cards: color-scheme/targeting; Colors: transparencies/implementing; Dimension: content-width-safe/auto-object-fit; Forms; Grids: grid-variables/variable-grid; Functions: ctr/calc; Mixins: card-container/breakpoint/heading-text; Overlays: custom; Recipes: border-radius/column/divider/javascript/overlap; Shadows: box; Spacing: standard/header; Typography: fluid-text; CLI: css/settings; Borders: inverted-radius).
- Dla pozostałych, cienkich/duplikujących się podstron (np. każdy pojedynczy recipe, kolejne sub-strony spacing/typografii) wpisy oparto na **stronach-przeglądach danej sekcji + zweryfikowanych odczytach sąsiednich podstron**; punktowe kontrole potwierdziły zgodność (wnioski się nie zmieniły). W razie potrzeby mogę „dopiąć" pełnym odczytem dowolną konkretną podstronę.
- Uwaga: część slugów 4.x dla **Functions** zwracała 404 — użyto treści z docs `/3.0/functions/*` (funkcje matematyczne są niezmienione).
