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

## Implementation

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

Serve the repository over HTTP because `fetch()` cannot reliably load `radios.json` from a `file:` URL.
