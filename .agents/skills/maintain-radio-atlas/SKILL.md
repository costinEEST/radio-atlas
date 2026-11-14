---
name: maintain-radio-atlas
description: Use when adding or updating Radio Atlas stations, catalog translations, listening links, or its static HTML/CSS/JavaScript interface.
---

# Maintain Radio Atlas

## Purpose

Maintain this repository's radio catalog and dependency-free static site. Keep station facts in `radios.json`, UI messages in `locales/`, presentation in `styles.css`, catalog behavior in `app.js`, localization in `i18n.js`, and shared audio behavior in `player.js`. Do not introduce a framework or build step unless requested.

## Prerequisites

Work from the repository root. Station research needs online sources; prefer Chrome MCP for page inspection, playback and rendered checks. Local validation uses Python's HTTP server and Node's built-in test runner. PDF extraction additionally uses `uv` and `pypdf`; it needs no project dependency installation. No API key is required by this skill.

## Choose the task

Read only the references needed for the requested work:

| Task | Reference |
| --- | --- |
| Add/update station facts, frequencies, categories or catalog translations | [Catalog schema and data rules](references/catalog.md) |
| Change HTML, CSS or client-side JavaScript | [Frontend implementation and presentation](references/frontend.md), then [browser acceptance checks](references/validation.md) |
| Change shared audio or compact player behavior | [Playback invariants and checks](references/playback.md) |
| Change locale behavior or publish a language | [Localization and publishing](references/localization.md), plus catalog rules for translated station fields |
| Recover a missing source or inspect a PDF | [PDF research](references/pdf-research.md) |
| Chrome MCP reports a profile-in-use error | [Browser recovery](references/browser-recovery.md) |

Consult `modern-web-guidance` before writing HTML/CSS/client-side JavaScript, as described in the frontend reference. Skip it for data-only catalog edits, research, documentation, skills, Git, tooling and non-browser scripts. Browser validation alone does not trigger a lookup.

## Station workflow

1. **Inspect before adding.** Search `radios.json` by station name, official domain and stream URL. Update an existing entry rather than duplicating it; preserve its ID. Check the working tree and keep unrelated changes intact.
2. **Research before editing.** Open supporting pages and verify the facts being added or changed: identity, location, frequencies, format, operator, contacts, listening URLs, recommendations and dates. Prefer the broadcaster and relevant regulator (Romania's CNA for Romanian stations); use reputable directories for gaps. Do not rely solely on search snippets.
3. **Resolve evidence.** Retain URLs for material claims and distinguish official facts, third-party claims and curator information. Prefer authoritative, recent evidence. If an unresolved conflict materially affects the proposed change, report it and ask for direction; continue independent work. An unverifiable required fact may be retained only when explicitly supplied by the user and labeled accordingly. Do not advance unrelated verification dates.
4. **Preflight links and playback.** Check official, listening, recommendation and stream URLs with Chrome MCP when available. Record redirects, failures and mixed-content limits. A loaded page, HTTP success or accepted play request is not proof of playback: confirm advancing audio before stating that it played.
5. **Update the catalog.** Follow the catalog reference. Keep schema version 2, bilingual `en`/`ro` text, stable IDs, machine/display distinctions, source URLs and ISO verification dates. Reuse appropriate category keys. New frequency locations must participate in generated search and filters without hard-coded UI options.
6. **Validate the affected result.** Run the Node suite and serve over HTTP. Confirm fresh catalog hydration, search, relevant country/location/language/category filters, location frequency preview/reset, disclosures, favorites, copy actions and outbound URLs. Inspect console and failed network requests. Check new labels/options in English and Romanian. For new long content or frequency-list shapes, inspect expanded cards at 320px and 200% text size. Apply the full browser acceptance reference when frontend behavior changes or a new rendering case warrants it.

Editorial rewrites are not factual reverification. Frequency-only research uses `frequency_verification` rather than renewing unrelated station or stream facts. Keep limitations visible where they affect listening choices, with supporting provenance under Sources.

## Frontend workflow

Read the frontend reference before changing implementation. Add the playback or localization reference when the change affects those behaviors. Preserve native semantics, keyboard focus, the one shared audio element, URL-selected locale, generated filters and safe DOM population. Apply the browser acceptance checks to the affected flows; include mobile Lighthouse accessibility, best-practices and SEO checks for frontend changes. Fix regressions before finishing.

## Available scripts

| Script | Purpose | Arguments |
| --- | --- | --- |
| `scripts/extract-radio-pdf.py` (inside this skill) | Extract layout text with page markers and report PDF metadata for manual verification | Input PDF path, output text path |

For PDF research, after following the download and completeness checks in the PDF reference:

```sh
uv run --no-project --with pypdf python .agents/skills/maintain-radio-atlas/scripts/extract-radio-pdf.py /tmp/radio-source.pdf /tmp/radio-source.txt
```

## Local checks

Serve in a separate terminal/session, then inspect the reported local URL with Chrome MCP:

```sh
python3 -m http.server 8765
```

Run repository regression checks:

```sh
node --test tests/*.test.mjs
```

After changing this skill, run `quick_validate.py` from the installed `skill-creator` skill with PyYAML available, for example:

```sh
uv run --no-project --with pyyaml python "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" .agents/skills/maintain-radio-atlas
```

Resolve that validator path from the local installation on other machines. Keep the README focused on the user-facing product; maintain schema and technical workflows here.

## Troubleshooting

- **Catalog fails to hydrate:** use HTTP rather than `file:`, inspect JSON syntax and network/console failures, and reload without cache before judging a data edit.
- **Official source unavailable:** follow the archive/PDF reference and label archived evidence. A login or access-control page does not verify the intended source.
- **Chrome profile in use:** follow the browser recovery reference; do not target ordinary browser processes or delete the profile.
- **Tool, network or cache access denied:** use the environment's permission mechanism for the specific operation. Report the exact blocker and use a suitable fallback when recovery fails.
- **Stream fails:** retain the verified listening-page fallback and distinguish link reachability from actual audio playback; do not invent a replacement stream.

## Limitations

Verification dates record checked facts, not continuous stream availability or live RF reception. Archived captures and PDF metadata do not establish current transmission or publication dates. Report checks that could not run and distinguish browser observations from CLI checks and indexed excerpts.

Runtime-selected translations do not provide separately rendered multilingual search indexing. Static HTML/canonical metadata remain English defaults; see the localization reference before changing that publishing model.

## Commits

When asked to commit, inspect all pending changes and create coherent commits by purpose. Preserve changes outside the authorized task. Use a concise subject and detailed body explaining the problem, final changes, compatibility or migration behavior, validation and material limitations. Report commit hashes and subjects. Do not commit generated cross-agent skill copies or temporary research/evaluation artifacts.
