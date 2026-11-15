# Frontend implementation and presentation

## Modern Web Guidance scope

Consult `modern-web-guidance` only when implementing or changing HTML structure, CSS layout/styles/animation, or client-side JavaScript behavior, including browser APIs, accessibility, performance, and frontend security. Do this before writing the affected frontend code. For mixed tasks, apply it only to the frontend implementation portion.

Skip the skill and its CLI entirely for data-only `radios.json` edits (stations, frequencies, URLs, translations, sources and verification dates), factual research, documentation or skill edits, Git operations, tests, tooling, infrastructure, and non-browser scripts. Merely loading the catalog in a browser to validate a data change does not trigger a guidance lookup.

When applicable, use the locally available skill or executable; otherwise invoke `npx -y modern-web-guidance@latest`. Search for one concrete web platform capability with a focused 2–5 word action-oriented query, such as `"responsive data table"` or `"validate form inputs"`. Retrieve and apply directly relevant guides; do not search for project/domain tasks such as `"maintain JSON catalog"` or retrieve unrelated guides to satisfy a checklist. Follow the installed skill's search/retrieval workflow.

Scope reference: [official Modern Web Guidance skill](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/SKILL.md).

## Catalog presentation

Preserve these defaults unless the user requests a different experience:

- Label the catalog **Stations**, rather than claiming that every station or stream is verified. Keep individual verification dates and qualifications in station details; a factual verification date is not a live playback guarantee.
- Keep station discovery and listening ahead of external recommendations. Place Radio Garden and similar resources below the catalog in the related-resources area, not in the hero.
- Place one `section.frequency-options` after listening actions, titled **Listen on a radio**, with per-band counts and FM/AM groups visible together. Show lists of up to eight entries directly; longer lists use a closed-by-default native `details.frequency-disclosure` with local search. Hide the section when no frequency is copyable. Stack groups on small cards and use columns when space permits; avoid tabs that conceal a band.
- Long lists retain a compact frequency preview while collapsed. Use the selected location's frequency when available; otherwise use the first catalog frequency. Reset restores the first frequency. Hide the preview when the list opens and omit it for short lists to avoid duplication. Keep every frequency location searchable and selectable even when its row is collapsed.
- Give every frequency a copy button that copies its localized value, units, band and location, with frequency- and location-specific accessible names and brief success feedback. Preserve focus and the manual-copy fallback when clipboard access fails. Label station streaming actions **Play online** and explain that terrestrial frequencies require a suitable receiver.
- Keep programming, stream notes, history, contacts, sources and station verification dates in the separate closed-by-default station-details disclosure. Put the frequency check date after the frequency list and its supporting research note under Sources. Keep schedule limits and transmission uncertainty beside affected frequency rows; omit a repeated licensed-site label when it matches the displayed location.
- Use badges for useful content, language or regional distinctions. Do not repeat Online, FM, AM or FM / AM badges; `modes` and frequency bands retain that information. Include modes and frequency bands explicitly in searchable text so removing badges does not break search.
- Describe what a listener will hear using supported catalog facts. Put imported directory classifications and provenance in Sources, not descriptions or badges. Preserve uncertainty that affects a listening choice visibly on the card; place the supporting explanation in Sources. Do not invent station-specific programming to make descriptions appear more varied.
- Editorial rewrites and moving existing information between fields do not constitute factual reverification. Retain verification dates unless the underlying facts were actually checked again.
- Keep Favorites only independent of the broadcast-type buttons and other filters. Reset clears both favorites-only and broadcast-type selections. If removing a favorite hides its focused card, move focus to an available filter control.
- Keep the bilingual listening guide compact and closed by default. Explain kbps, approximate data usage, codecs, channels, terrestrial frequencies and playlist compatibility in plain language. Do not infer sound-quality ratings from bitrate alone or publish unverified per-stream bitrate/codec values.
- Keep a compact, localized On this page navigation below the introduction, in normal flow. Link to Stations, Listening guide and More radio resources using native fragments and focusable destinations. Open the guide when its link or direct fragment is used. Preserve smooth scrolling with the reduced-motion override; do not add station-by-station navigation or another persistent bar.

## Implementation

- Enclose potentially failing work in `try`/`catch` at the boundary that owns recovery: startup, browser APIs, parsing/formatting, event handlers and deferred callbacks. A caller's catch may cover synchronous helpers; do not add repetitive catches around pure operations already covered by that caller. Await asynchronous work inside the catch boundary so rejections are handled.
- Catches must recover, provide a localized error, or rethrow with context. Keep optional failures (metadata, fragment navigation, unavailable persistence) from replacing a working catalog with a fatal error. Guard fallback paths too; retain readable static HTML if translation or error rendering fails. Do not silently swallow unexpected errors or claim that try/catch prevents failures.
- Exercise failure paths with denied storage/clipboard/navigation APIs, malformed JSON/messages/dates, and rejected asynchronous handlers, as applicable to the change.

- Preserve native semantics: `article` for stations, headings in order, links for navigation, buttons for actions, and `details` for secondary information.
- Maintain keyboard operation, visible focus, 44 CSS-pixel minimum control targets, descriptive new-tab text, and polite status announcements.
- Keep presentation in `styles.css`, behavior in `app.js`, and reusable markup in `station-template` and `frequency-template`. Populate both the frequency preview and disclosure from the same catalog data. Avoid inline styles, inline event handlers, and duplicated station facts outside JSON.
- Parse the catalog with the browser-native `Response.json()` method. Do not add a data-format parser or runtime CDN dependency.
- Populate JSON content through `textContent` and validated attributes on cloned template nodes. Do not interpolate catalog values into `innerHTML`.

## Typography

- Reuse the shared `--text-*` and `--leading-*` roles in `styles.css` for labels, reading text and headings. Keep small interface text at least `0.9375rem` and body/control text at least `1rem`; avoid introducing one-off sizes that weaken the hierarchy. Keep decorative logo/icon sizing separate from reading text.
- Use restrained fluid `clamp()` sizes for headings, combining `rem` and viewport units with `rem` bounds. Keep reading and control text steady, use unitless line heights, and leave the browser's root font size unchanged. Use balanced wrapping for headings and readable line lengths for prose.
- Fluid sizing is not proof of accessible scaling. Apply the enlarged-text and reflow checks in [Browser acceptance](validation.md) to English and Romanian, including expanded details and long station names. Reference: [Addressing Accessibility Concerns With Using Fluid Type — Maxwell Barvian, Smashing Magazine (7 November 2023)](https://www.smashingmagazine.com/2023/11/addressing-accessibility-concerns-fluid-type/). For the technique itself, see [Modern Fluid Typography Using CSS Clamp — Adrian Bece (17 January 2022)](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/).
