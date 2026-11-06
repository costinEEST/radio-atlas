---
name: maintain-radio-atlas
description: Research, add, and maintain Radio Atlas stations and its static vanilla HTML, CSS, and JavaScript interface. Use when station facts, catalog JSON, filters, listening links, or UI behavior change; do not use for unrelated repositories.
---

# Maintain Radio Atlas

Keep the project deployable as a dependency-free static site. Use semantic HTML, modern CSS, and browser-native JavaScript; do not introduce a framework or build step unless the user explicitly requests one.

## Required workflow

For every station addition or factual update, complete these stages in order:

1. **Research online before editing.** Verify every user-provided fact that can reasonably be checked, including station identity, location, frequency, format, operator, contact details, official site, listening page, direct stream, recommendation URL, and relevant dates. Prefer the station's official site and Romania's CNA; use reputable radio directories only for details the primary sources do not publish. Open the supporting pages rather than relying only on search-result snippets.
2. **Resolve evidence.** Keep the source URL for each material claim. Distinguish confirmed facts, third-party claims, and curator-provided information. If sources conflict, prefer the more authoritative and recent source, record the uncertainty in user-facing copy when relevant, and do not silently guess. If a required fact or URL cannot be verified, retain it only when the user explicitly supplied it and label it accordingly.
3. **Consult Modern Web Guidance.** Before changing the catalog or interface, use the locally available `modern-web-guidance` skill or executable. If it is not available locally, invoke the package with `npx -y modern-web-guidance@latest`. Search for the capability affected by the task, retrieve any directly relevant guidance, and apply it when applicable. If no guide applies to a data-only change, record that outcome and continue without forcing unrelated patterns.
4. **Preflight URLs with Chrome MCP.** Check the official site, listening page, recommendation link, and direct stream when browser access permits. Record redirects, mixed-content limitations, browser playback behavior, or failures. Do not treat a successful page load as proof that an audio stream is currently playing.
5. **Update `radios.json`.** Write only the verified or explicitly qualified values. Preserve the existing schema, valid JSON syntax, stable station IDs, URL protocols, display/value distinctions, and ISO-compatible machine values where the schema uses them. Update the verification date and source list. Do not duplicate station facts in HTML or JavaScript.
6. **Validate the rendered result with Chrome MCP.** Serve the repository over HTTP, confirm that `radios.json` loads successfully and hydrates the cards, then test search, filters, favorite and copy controls, outbound links, details disclosure, console errors, and failed network requests. Complete the mobile, responsive, and accessibility checks below, run Lighthouse accessibility/best-practices/SEO checks, and fix regressions before finishing.

Do not add or change catalog facts when online evidence materially contradicts the proposed data. Report the conflict and ask for direction if authoritative sources do not resolve it.

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

## Internationalization and naming

- Always use English for JSON property/message/category keys and HTML markup identifiers, including IDs, classes, `name`, `data-*` attribute names and their structural values. Use standard BCP 47 language tags (`en`, `ro`, `hu`, `ar`) for translation-map keys. Canonical station names, place names, existing stable station IDs and external URLs are not translated identifiers.
- English is the default and fallback language, including static HTML text, accessible labels and metadata. Romanian is a supported selectable language. Every translatable catalog field must contain both `en` and `ro` values; add other languages alongside them. Preserve the existing facts and uncertainty when translating.
- Keep UI translations in `locales/<language>.json`, locale configuration in `locales/index.json`, and station translations in `radios.json`. All enabled UI dictionaries must cover the English message keys and interpolation slots. Keep IDs, links, filter values, telephone values and ISO verification dates independent of display language.
- Persist language selection in the URL (`?lang=ro` for Romanian, `?lang=en` for English). With no selected language, or an unsupported/disabled locale, use English. The URL is the single source of truth; do not add sessionStorage or IndexedDB language state. Preserve the selected language on internal home links and reloads; browser Back/Forward must restore the URL-selected language.
- Set document `lang` and `dir` for the selected locale, annotate fallback text with its actual language, and isolate mixed-direction content. Use locale-aware dates, numbers and plural rules. Register future languages without enabling incomplete translations.
- Validate English/default and Romanian URLs, translation coverage, stable catalog identities, selector persistence, metadata, fallback and RTL behavior. Use the catalog schema and language publishing workflow below.

## Catalog schema and language publishing

- `radios.json` uses schema version 2. Translatable fields use language maps such as `"description": { "en": "…", "ro": "…" }`. Keep both entries; missing or empty catalog translations fall back to English. Country/city names, categories, tags, frequency display text, descriptions, programming, historical text, addresses and source labels use this format. Canonical station/person names may remain strings or use language maps.
- `verified` is an ISO `YYYY-MM-DD` date, displayed through `Intl.DateTimeFormat` with UTC to avoid timezone shifts. Historical dates remain translated text because some have only year precision. Result counts use `Intl.PluralRules` and `Intl.NumberFormat`; Arabic requires `zero`, `one`, `two`, `few`, `many` and `other` forms.
- Keep station IDs independent of display language; `radios.json` is their single source of truth.

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
- Keep presentation in `styles.css`, behavior in `app.js`, and the reusable card structure in the `station-template` element. Avoid inline styles, inline event handlers, and duplicated station facts outside JSON.
- Parse the catalog with the browser-native `Response.json()` method. Do not add a data-format parser or runtime CDN dependency.
- Populate JSON content through `textContent` and validated attributes on cloned template nodes. Do not interpolate catalog values into `innerHTML`.

## Mobile, responsive, and accessibility acceptance

Use Chrome MCP to verify observable behavior, not only CSS declarations:

- Test at a 320 CSS-pixel-wide touch viewport and at least one short landscape viewport. Confirm that the document and every visible card reflow without horizontal page scrolling, clipped content, overlapping text, or controls outside their containers.
- Test browser text scaling or an equivalent 200% text-size condition. Content and functionality must remain available without two-dimensional scrolling; long station names, URLs, frequencies, and action labels must wrap safely.
- Inspect every visible interactive target. Prefer a 44 by 44 CSS-pixel touch area on coarse pointers and never allow a target below the WCAG 2.2 minimum of 24 by 24 CSS pixels unless the spacing exception clearly applies.
- Navigate the complete interface using only the keyboard. Verify logical focus order, visible focus indicators, skip-link behavior, activation of buttons, links and `details`, and that focus is not lost after filtering or rerendering.
- Check semantic structure and accessible names in the accessibility tree. The catalog must expose a meaningful list of station articles; controls, status messages, empty results, loading state, and errors must be announced appropriately without duplicate or misleading labels.
- Exercise populated, empty, loading, and failure states where practical. Filtering must hide the entire station list item so assistive technologies and list semantics match the visible result count.
- Check forced-colors/high-contrast rendering and reduced-motion behavior when the affected UI uses custom colors or motion. Do not convey state or meaning through color alone.
- Finish with a mobile Lighthouse run and inspect the browser console and network panel. Treat automated audits as supporting evidence, not a substitute for keyboard, reflow, zoom, and accessibility-tree checks.
