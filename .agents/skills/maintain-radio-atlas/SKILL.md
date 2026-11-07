---
name: maintain-radio-atlas
description: Research, add, and maintain Radio Atlas stations and its static vanilla HTML, CSS, and JavaScript interface. Use when station facts, catalog JSON, filters, listening links, or UI behavior change; do not use for unrelated repositories.
---

# Maintain Radio Atlas

Keep the project deployable as a dependency-free static site. Use semantic HTML, modern CSS, and browser-native JavaScript; do not introduce a framework or build step unless the user explicitly requests one.

## Modern Web Guidance scope

Consult `modern-web-guidance` only when implementing or changing HTML structure, CSS layout/styles/animation, or client-side JavaScript behavior, including browser APIs, accessibility, performance, and frontend security. Do this before writing the affected frontend code. For mixed tasks, apply it only to the frontend implementation portion.

Skip the skill and its CLI entirely for data-only `radios.json` edits (stations, frequencies, URLs, translations, sources and verification dates), factual research, documentation or skill edits, Git operations, tests, tooling, infrastructure, and non-browser scripts. Merely loading the catalog in a browser to validate a data change does not trigger a guidance lookup.

When applicable, use the locally available skill or executable; otherwise invoke `npx -y modern-web-guidance@latest`. Search for one concrete web platform capability with a focused 2–5 word action-oriented query, such as `"responsive data table"` or `"validate form inputs"`. Retrieve and apply directly relevant guides; do not search for project/domain tasks such as `"maintain JSON catalog"` or retrieve unrelated guides to satisfy a checklist. Follow the installed skill's search/retrieval workflow.

Scope reference: [official Modern Web Guidance skill](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/SKILL.md).

## Required workflow

For every station addition or factual update, complete these stages in order:

1. **Research online before editing.** Verify every user-provided fact that can reasonably be checked, including station identity, location, frequency, format, operator, contact details, official site, listening page, direct stream, recommendation URL, and relevant dates. Prefer the station's official site and Romania's CNA; use reputable radio directories only for details the primary sources do not publish. Open the supporting pages rather than relying only on search-result snippets.
2. **Resolve evidence.** Keep the source URL for each material claim. Distinguish confirmed facts, third-party claims, and curator-provided information. If sources conflict, prefer the more authoritative and recent source, record the uncertainty in user-facing copy when relevant, and do not silently guess. If a required fact or URL cannot be verified, retain it only when the user explicitly supplied it and label it accordingly.
3. **Apply Modern Web Guidance only to frontend code changes.** Follow the scope above if this task also changes HTML, CSS or client-side JavaScript; skip this stage for data-only catalog updates.
4. **Preflight URLs with Chrome MCP.** Check the official site, listening page, recommendation link, and direct stream when browser access permits. Record redirects, mixed-content limitations, browser playback behavior, or failures. Do not treat a successful page load as proof that an audio stream is currently playing.
5. **Update `radios.json`.** Write only the verified or explicitly qualified values. Preserve the existing schema, valid JSON syntax, stable station IDs, URL protocols, display/value distinctions, and ISO-compatible machine values where the schema uses them. Update the verification date and source list. Do not duplicate station facts in HTML or JavaScript.
6. **Validate the rendered result with Chrome MCP.** Serve the repository over HTTP, confirm that `radios.json` loads successfully and hydrates the cards, then test search, filters, favorite and copy controls, outbound links, details disclosure, console errors, and failed network requests. Complete the mobile, responsive, and accessibility checks below, run Lighthouse accessibility/best-practices/SEO checks, and fix regressions before finishing.

Do not add or change catalog facts when online evidence materially contradicts the proposed data. Report the conflict and ask for direction if authoritative sources do not resolve it.

## Missing sources and PDFs

When an official page or file is unavailable, search its exact URL in the Wayback Machine and inspect the newest usable timestamped capture. For archive selection, download, PDF extraction and evidence checks, read [Recover and inspect PDF sources](references/pdf-research.md). Use the tested uv/pypdf helper there; keep archive capture dates separate from document dates and current factual verification.

## Recover a blocked Chrome MCP

Prefer Chrome MCP for browsing, page inspection, playback checks, UI validation, and Lighthouse whenever its tools support the task. A profile-in-use error is a recoverable blocker; attempt this procedure before switching to CLI browser automation.

1. Try `list_pages` first. If it succeeds, reuse that MCP browser with `new_page` or `navigate_page` rather than starting another instance.
2. If MCP cannot list or open pages, inspect the relevant processes with `ps aux | rg 'chrome-devtools-mcp|chrome-profile'`. If the sandbox rejects `ps`, request escalation for this exact read-only inspection; a narrow `ps aux` prefix is appropriate.
3. Compare start times and command lines to distinguish the current MCP from an older orphan. Identify the stale `npm exec chrome-devtools-mcp...` process, its MCP child, and the dedicated browser main process containing `--user-data-dir=.../.cache/chrome-devtools-mcp/chrome-profile`. The configured browser may be Chrome or Edge. Never target the user's ordinary browser or all browser, Node, or npm processes.
4. Request approval to send normal termination signals to those explicit stale PIDs, for example `kill <stale-npm-pid> <stale-mcp-pid> <stale-browser-pid>`, then retry MCP. Do not use broad `pkill`, wildcards, command substitution, or `kill -9` as the first attempt. Do not hard-code PIDs from an earlier session.
5. Only after process inspection confirms that no browser uses the MCP profile, inspect its `SingletonLock`, `SingletonSocket`, and `SingletonCookie`. If stale singleton files alone remain, request approval to remove those exact files, then retry. Never delete the entire MCP cache or profile.
6. Stop recovery as soon as `list_pages` or `new_page` succeeds. Report whether process termination or singleton cleanup was required, then resume the task using MCP.

If recovery fails, report the exact blocker before using a fallback. A login, security, or access-control page does not verify the intended page. Distinguish direct browser observations from indexed excerpts or CLI checks, and never present a successful HTTP response as confirmed audio playback.

## Data rules

- Never embed an HTTP audio stream on an HTTPS page. Present it as a direct link and copy action, explain mixed-content limits, and provide a working HTTPS listening page when known.
- Keep all catalog input in `radios.json`. Add or edit stations there; `app.js` derives filter options and searchable card data during hydration.
- Keep JSON values as short as possible while preserving meaning, identity, accuracy and necessary uncertainty. Remove redundant words and repeated context; use concise prose and source labels. Do not shorten official names, URLs, contact details or standard codes in ways that change their meaning or function.
- Use short, readable, unique station IDs. Omit generic `radio-`, `-radio` and redundant band suffixes such as `-fm`; retain words that distinguish the station or belong to its brand. Use the current `radios.json` ID directly everywhere, including cards, favorites and fragment links. Do not add alias maps or compatibility migrations for renamed IDs unless explicitly requested.

## Catalog presentation

Preserve these defaults unless the user requests a different experience:

- Label the catalog **Stations**, rather than claiming that every station or stream is verified. Keep individual verification dates and qualifications in station details; a factual verification date is not a live playback guarantee.
- Keep station discovery and listening ahead of external recommendations. Place Radio Garden and similar resources below the catalog in the related-resources area, not in the hero.
- Show one frequency on each card. Use the selected location's frequency when available; otherwise use the first catalog frequency. Resetting the location restores the first frequency. Keep all frequency locations searchable and selectable even when their rows are collapsed.
- Put frequency-copy controls and the complete frequency list in the closed-by-default native `details.frequency-options` disclosure after listening actions. Hide this disclosure when no frequency is copyable. Keep location-specific accessible names on copy buttons and preserve keyboard focus when filtering updates the frequency preview.
- Keep programming, stream notes, history, contacts, sources and verification dates in the separate closed-by-default station-details disclosure. Do not expand either disclosure automatically on initial load.
- Use badges for useful content, language or regional distinctions. Do not repeat Online, FM, AM or FM / AM badges; `modes` and frequency bands retain that information. Include modes and frequency bands explicitly in searchable text so removing badges does not break search.
- Describe what a listener will hear using supported catalog facts. Put imported directory classifications and provenance in Sources, not descriptions or badges. Preserve uncertainty that affects a listening choice visibly on the card; place the supporting explanation in Sources. Do not invent station-specific programming to make descriptions appear more varied.
- Editorial rewrites and moving existing information between fields do not constitute factual reverification. Retain verification dates unless the underlying facts were actually checked again.
- Keep Favorites only independent of the broadcast-type buttons and other filters. Reset clears both favorites-only and broadcast-type selections. If removing a favorite hides its focused card, move focus to an available filter control.
- Keep the bilingual listening guide compact and closed by default. Explain kbps, approximate data usage, codecs, channels, terrestrial frequencies and playlist compatibility in plain language. Do not infer sound-quality ratings from bitrate alone or publish unverified per-stream bitrate/codec values.
- Keep a compact, localized On this page navigation below the introduction, in normal flow. Link to Stations, Listening guide and More radio resources using native fragments and focusable destinations. Open the guide when its link or direct fragment is used. Preserve smooth scrolling with the reduced-motion override; do not add station-by-station navigation or another persistent bar.

## In-page playback

- Use one shared native audio element with `controls` and `preload="none"`; assign its source only after an explicit play action. Keep playback behavior in `player.js` and card/filter integration in `app.js`. Filtering does not stop or switch the selected station.
- Offer Play as the main action for eligible HTTPS streams, with a clearly labeled listening-page link alongside it. Keep raw stream links and copying in station details. HTTP streams and playlist files requiring another player use the external listening page as their main action. Feature-detect native HLS support for `.m3u8` streams; do not add a runtime player library or proxy merely to bypass unsupported playback.
- Synchronize card labels and localized player status with native playing, pause, buffering and error events. Handle rejected play promises, connection timeouts and rapid station changes; obsolete requests must not overwrite the current selection. Stop releases the source and network activity. Never announce successful playback merely because a play request was issued.
- Keep the full shared player in normal document flow. Show a single-row compact bottom bar only after a station is selected and the full player is offscreen; keep it available while paused, buffering or failed, and remove it after Stop. Both views control the same audio element. Expand scrolls to and focuses the full player without changing its source or playback position.
- Keep the compact bar below 12% of the available viewport height and fall back to the in-flow player when controls overflow or the viewport is too short, including enlarged text and on-screen keyboards. Measure text/content changes as well as viewport changes. Hidden compact controls must be inert and absent from keyboard navigation. Restore focus to a visible action or the full player when a focused bar disappears.
- Reserve bottom content space and scroll padding while the compact bar is visible; keep keyboard focus and toast messages above it. Respect safe-area insets, retain 44px controls, and avoid unnecessary motion. Leave the header and full filter form in normal flow. Keep a localized Back to filters link after related resources at the bottom of the main content, targeting the search input.
- Expose retry and the listening-page fallback on playback failure. Do not claim that an HTTPS URL or a positive format-support check guarantees playback.
- Validate real advancing audio where available, plus native pause/resume, stop, switching, filtering during playback, no media request before Play, and localized failure recovery. Run the player regression tests with the existing Node suite; use controlled failures to cover unavailable streams without depending entirely on live broadcasters.
- Check compact/full-player transitions, Expand preserving playback, pause/resume, Stop and focus restoration in both languages. Test 320px reflow, 200% text, short landscape fallback, keyboard navigation to bottom-of-page links, and absence of duplicated audio elements or overlapping controls.

## Internationalization and naming

- Always use English for JSON property/message/category keys and HTML markup identifiers, including IDs, classes, `name`, `data-*` attribute names and their structural values. Use standard BCP 47 language tags (`en`, `ro`, `hu`, `ar`) for translation-map keys. Canonical station names, place names, existing stable station IDs and external URLs are not translated identifiers.
- English is the default and fallback language, including static HTML text, accessible labels and metadata. Romanian is a supported selectable language. Every translatable catalog field must contain both `en` and `ro` values; add other languages alongside them. Preserve the existing facts and uncertainty when translating.
- Keep UI translations in `locales/<language>.json`, locale configuration in `locales/index.json`, and station translations in `radios.json`. All enabled UI dictionaries must cover the English message keys and interpolation slots. Keep IDs, links, filter values, telephone values and ISO verification dates independent of display language.
- Persist language selection in the URL (`?lang=ro` for Romanian, `?lang=en` for English). With no selected language, or an unsupported/disabled locale, use English. The URL is the single source of truth; do not add sessionStorage or IndexedDB language state. Preserve the selected language on internal home links and reloads; browser Back/Forward must restore the URL-selected language.
- Switch languages in the current document using the History API, not `location.assign` or a page reload. Load messages before committing the change, ignore obsolete language requests, and handle `popstate` for Back/Forward. Translation-load or history failures must leave the working interface and playback intact, with a localized error. Preserve other query parameters and the fragment.
- Keep the shared audio element mounted and its source, volume, mute, playback position and paused/loading state unchanged during translation. Rebuild only catalog content, preserving filter values, favorites mode, open disclosures and relevant focus. Refresh dynamic full/compact-player labels, catalog data, dates, counts, document language/direction, metadata and the home link. Test a language switch immediately after Play, while paused, and through Back/Forward; confirm a single stream load and advancing audio without document navigation.
- Set document `lang` and `dir` for the selected locale, annotate fallback text with its actual language, and isolate mixed-direction content. Use locale-aware dates, numbers and plural rules. Register future languages without enabling incomplete translations.
- Validate English/default and Romanian URLs, translation coverage, stable catalog identities, selector persistence, metadata, fallback and RTL behavior. Use the catalog schema and language publishing workflow below.

## Catalog schema and language publishing

- `radios.json` uses schema version 2. Translatable fields use language maps such as `"description": { "en": "…", "ro": "…" }`. Keep both entries; missing or empty catalog translations fall back to English. Country/city names, categories, tags, frequency display text, descriptions, programming, historical text, addresses and source labels use this format. Canonical station/person names may remain strings or use language maps.
- `verified` is an ISO `YYYY-MM-DD` date, displayed through `Intl.DateTimeFormat` with UTC to avoid timezone shifts. Historical dates remain translated text because some have only year precision. Result counts use `Intl.PluralRules` and `Intl.NumberFormat`; Arabic requires `zero`, `one`, `two`, `few`, `many` and `other` forms.
- Keep station IDs independent of display language; `radios.json` is their single source of truth.
- Optional `source_note` is an English/Romanian translation map for provenance, imported classifications and supporting uncertainty. Render it as plain text under Sources, with the correct language and direction; omit the note when absent. Keep supporting URLs in `sources`.
- A station with several city frequencies uses a nonempty `frequencies` array instead of the singular `frequency`. Each entry has `city` (`slug`, translated `name`), `value`, translated `display`, and `band`; `county` is optional. The station's top-level `city` identifies its home location. Keep one station entry, include every frequency location in search and city filters, and give each copy control a city-specific accessible name. Existing singular-frequency entries remain supported.

To publish a language:

1. Copy `locales/en.json` to the locale’s configured message path. Translate all messages without changing their English keys or interpolation placeholders. Add catalog translations alongside `en` and `ro`.
2. Preserve the `{garden}`, `{frequency}` and `{person}` slots in their respective messages. Translators may reorder them; they retain semantic links and emphasis. Translation strings are plain text, never HTML.
3. Configure the locale in `locales/index.json` using its BCP 47 tag, native `name`, `dir` (`ltr` or `rtl`), `og_locale`, `messages` path and `enabled`. English and Romanian are enabled; Hungarian and Arabic remain disabled until complete. The native language picker appears when at least two languages are enabled.
4. Test URL selection and fallback. Region tags such as `en-GB` fall back to their enabled base language. Unknown/disabled languages and unavailable message files fall back to English. New URLs without `lang` use English, independently of other tabs.
5. Verify translated metadata, language annotations, interpolation slots, plural forms, missing translations, keyboard use, RTL, 320px reflow and 200% text size. Arabic uses document `dir="rtl"`; use logical CSS properties and bidi isolation, while URLs, telephone numbers and email remain LTR.

Client-selected translations update page and social metadata at runtime. Static HTML and the canonical URL remain English defaults. Full multilingual search indexing would require separately rendered language URLs and `hreflang` links.

## Local development and checks

- Serve over HTTP, for example `python3 -m http.server 8765`; fetching `radios.json` from a `file:` URL is unreliable.
- Run regression checks with `node --test tests/*.test.mjs`.
- After editing this skill, run the skill-creator validator with PyYAML supplied by uv: `uv run --no-project --with pyyaml python /Users/costi/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/maintain-radio-atlas`. This uses uv's cached environment without adding Python dependencies to the project. On another machine, resolve `quick_validate.py` from the installed `skill-creator` skill rather than assuming this absolute path exists.
- Keep the README focused on what Radio Atlas offers its users. Maintain implementation details, schema rules and technical workflows in this skill.

## Commits

When the user says `commit`, inspect all pending changes and create as many coherent commits as needed. Group changes by purpose and keep each commit reviewable; do not force unrelated work into one commit or split interdependent changes into broken intermediate states. Preserve changes outside the authorized task.

Write a detailed message for every commit: a concise, descriptive subject followed by a body explaining the problem, the changes and their purpose, relevant compatibility or migration behavior, and validation performed. Include material limitations when applicable. Describe the final implementation rather than the conversation history, and report the resulting commit hashes and subjects to the user.

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
- Fluid sizing is not proof of accessible scaling. Apply the enlarged-text and reflow checks below to English and Romanian, including expanded details and long station names. Reference: [Addressing Accessibility Concerns With Using Fluid Type — Maxwell Barvian, Smashing Magazine (7 November 2023)](https://www.smashingmagazine.com/2023/11/addressing-accessibility-concerns-fluid-type/). For the technique itself, see [Modern Fluid Typography Using CSS Clamp — Adrian Bece (17 January 2022)](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/).

## Mobile, responsive, and accessibility acceptance

Use Chrome MCP to verify observable behavior, not only CSS declarations:

- Test at a 320 CSS-pixel-wide touch viewport and at least one short landscape viewport. Confirm that the document and every visible card reflow without horizontal page scrolling, clipped content, overlapping text, or controls outside their containers.
- Test browser text scaling or an equivalent 200% text-size condition. Content and functionality must remain available without two-dimensional scrolling; long station names, URLs, frequencies, and action labels must wrap safely.
- Test expanded frequency and station-details disclosures in both English and Romanian, including long stream-error text. Check card overflow as well as page overflow: clipped card content can hide a reflow failure. Verify location selection and reset, frequency copying, and searches for Online/FM/AM after badge changes.
- Inspect every visible interactive target. Prefer a 44 by 44 CSS-pixel touch area on coarse pointers and never allow a target below the WCAG 2.2 minimum of 24 by 24 CSS pixels unless the spacing exception clearly applies.
- Navigate the complete interface using only the keyboard. Verify logical focus order, visible focus indicators, skip-link behavior, activation of buttons, links and `details`, and that focus is not lost after filtering or rerendering.
- Check semantic structure and accessible names in the accessibility tree. The catalog must expose a meaningful list of station articles; controls, status messages, empty results, loading state, and errors must be announced appropriately without duplicate or misleading labels.
- Exercise populated, empty, loading, and failure states where practical. Filtering must hide the entire station list item so assistive technologies and list semantics match the visible result count.
- Check forced-colors/high-contrast rendering and reduced-motion behavior when the affected UI uses custom colors or motion. Do not convey state or meaning through color alone.
- Finish with a mobile Lighthouse run and inspect the browser console and network panel. Treat automated audits as supporting evidence, not a substitute for keyboard, reflow, zoom, and accessibility-tree checks.

## Large terrestrial frequency lists

- Preserve one station and the existing `frequencies` array. The legacy `city` field may identify an officially listed area or site; optional `location_type` (`region` or `transmitter`) qualifies those labels. Optional translated `licensed_site` records the regulator’s transmitter-site label, and translated `note` explains a material discrepancy. Do not infer reception coverage or turn license counties into city locations.
- Use optional `frequency_verification` with ISO `checked`, ISO `source_updated`, supporting source URLs in `sources`, and a translated `note`. Keep frequency checks separate from station/stream `verified`. Reconcile broadcaster labels with regulator sites; record historical conflicts and unavailable sources without claiming live RF verification. Keep source links in the station’s Sources list.
- Keep one frequency preview and the native closed disclosure. Show the dated verification context inside it. Lists longer than eight entries have a labeled local search with visible/total status and an empty state; match location, licensed site and frequency, tolerating accents and decimal commas. Hide the complete unmatched list item. Preserve its query and open state during language changes. Include licensed sites in global search and qualify region/site options in the location filter.
