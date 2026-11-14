# Browser acceptance checks

## Mobile, responsive, and accessibility acceptance

Use these checks for frontend changes and for catalog changes that introduce new rendering cases. For routine catalog edits, use the focused checks in SKILL.md. Verify observable behavior with Chrome MCP, not only CSS declarations:

- Test at a 320 CSS-pixel-wide touch viewport and at least one short landscape viewport. Confirm that the document and every visible card reflow without horizontal page scrolling, clipped content, overlapping text, or controls outside their containers.
- Test browser text scaling or an equivalent 200% text-size condition. Content and functionality must remain available without two-dimensional scrolling; long station names, URLs, frequencies, and action labels must wrap safely.
- Test expanded frequency and station-details disclosures in both English and Romanian, including long stream-error text. Check card overflow as well as page overflow: clipped card content can hide a reflow failure. Verify location selection and reset, frequency copying, and searches for Online/FM/AM after badge changes.
- Inspect every visible interactive target. Prefer a 44 by 44 CSS-pixel touch area on coarse pointers and never allow a target below the WCAG 2.2 minimum of 24 by 24 CSS pixels unless the spacing exception clearly applies.
- Navigate the complete interface using only the keyboard. Verify logical focus order, visible focus indicators, skip-link behavior, activation of buttons, links and `details`, and that focus is not lost after filtering or rerendering.
- Check semantic structure and accessible names in the accessibility tree. The catalog must expose a meaningful list of station articles; controls, status messages, empty results, loading state, and errors must be announced appropriately without duplicate or misleading labels.
- Exercise populated, empty, loading, and failure states where practical. Filtering must hide the entire station list item so assistive technologies and list semantics match the visible result count.
- Check forced-colors/high-contrast rendering and reduced-motion behavior when the affected UI uses custom colors or motion. Do not convey state or meaning through color alone.
- Finish with a mobile Lighthouse run and inspect the browser console and network panel. Treat automated audits as supporting evidence, not a substitute for keyboard, reflow, zoom, and accessibility-tree checks.
