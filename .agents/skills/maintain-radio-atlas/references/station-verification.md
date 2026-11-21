# Station verification scripts

Use the repository-root scripts for selected stations, the full catalog, or additions from a commit. They gather evidence and never edit the catalog. Requirements: Python 3.11+, curl with `%{json}` support, and Chrome DevTools MCP for playback. Only commit-based selection needs Git history containing the commit and its parent.

## Select the scope

Run from the repository root; choose exactly one selection mode:

```sh
# One or more current catalog IDs; --station can also be repeated.
python3 scripts/check-radio-stations.py --station nablus-quran rock \
  --output /tmp/radio-http.json --browser-expression /tmp/radio-browser.js

# Every current station, without depending on Git history.
python3 scripts/check-radio-stations.py --all \
  --output /tmp/radio-http.json --browser-expression /tmp/radio-browser.js

# Stations introduced by any specified commit.
python3 scripts/check-radio-stations.py --commit REVISION \
  --output /tmp/radio-http.json --browser-expression /tmp/radio-browser.js

# Generate targets and the MCP function without network probes.
python3 scripts/check-radio-stations.py --station nablus-quran --prepare-only \
  --output /tmp/radio-targets.json --browser-expression /tmp/radio-browser.js
```

Replace example IDs with current `radios.json` IDs and `REVISION` with the intended commit. Unknown IDs fail before requests; duplicate selections are deduplicated. `--catalog PATH` selects another JSON catalog with the same station schema. Commit mode still compares this repository's historical `radios.json`, then resolves entries against the selected current catalog by ID, unambiguous identical stream, or unambiguous identical name. Removed stations use their historical endpoints and report `current_id: null`.

`--output` defaults to `radio-http.json` in the system temporary directory. Explicit paths above keep outputs predictable across machines. Use a distinct temporary filename per simultaneous run. Do not retain raw JSON reports or generated expressions in the repository unless the user requests them. Preserve concise conclusions, source URLs and material limitations when making catalog changes; these are dated observations, not permanent availability claims.

## HTTP probes

Defaults: four workers, 15 seconds per URL, a requested 16 KB range and a 256 KB cap. Configure `--workers` and `--timeout` as needed. Streams may ignore ranges; timeout or size-cap exits after receiving audio bytes do not establish that a station is offline. Inspect HTTP status, content type, bytes, redirects and error together. Missing streams or pages are reported as null, and their listening alternatives require manual inspection. Redirect query strings are omitted to avoid archiving transient signatures.

A playlist, successful GET, reachable page or resolved play promise does not prove browser playback. Network permission failures affect the test environment and require the environment's normal escalation mechanism; they do not justify removing stations. Do not bypass certificate validation or browser security settings.

## Chrome MCP playback

1. Open an isolated tab on the local site served with `python3 -m http.server 8765`, and use a separate HTTPS tab to check production security behavior. Keep the tested tab in the foreground to avoid background timer throttling.
2. Read the generated `/tmp/radio-browser.js` and pass its complete function text as `function` to Chrome MCP `evaluate_script`. Use inline text if the tool cannot access local file paths. The call starts asynchronously and returns immediately. Do not start another audit in the same tab until it finishes.
3. Poll using `() => ({done: window.radioStationAudit.done, results: window.radioStationAudit.results.map(r => ({id: r.current_id || r.original_id, advancing: r.advancing, skipped: r.skipped}))})`. Retrieve `() => window.radioStationAudit` when done. Inspect `fatalError`, each run's errors and timeout status; save results only to temporary storage unless requested otherwise.
4. Default checks use three temporary muted audio elements concurrently, up to two attempts and 16 seconds per attempt. Configure the generated expression with `--browser-timeout SECONDS`, `--browser-attempts N` and `--browser-concurrency N`. Success requires a native `playing` event and increasing `currentTime` by more than 0.25 seconds between samples while unpaused. Each attempt releases its source. A missing stream is skipped and needs listening-page inspection.
5. For failures, open the official/listening page, inspect its actual audio/source elements, activate playback and take two time samples. An autoplay `NotAllowedError` requires a real user gesture, not a station deletion. Unsupported native HLS requires checking the external player. If HTTP works in a standalone browser tab but fails embedded in HTTPS, retain it as external-only when a working listening link is available. Never claim HTTPS in-page playback from an HTTP-only test.
6. Replace obsolete streams only with a source verified on a broadcaster/listening page and advancing browser playback. Apply the user's requested removal policy after checking alternatives; the scripts do not authorize deletion or choose it automatically. Keep browser, network, geographic and temporary-failure limits explicit. Muted advancement verifies decoding/playback, not content identity by ear or terrestrial reception.

After catalog changes, preserve unrelated station/frequency dates, update affected bilingual notes, run `node --test tests/*.test.mjs`, and check fresh catalog hydration, generated filters, favorites, corrected playback and external links in MCP. Run `git diff --check`. For script edits, also run Ruff lint/format checks, Python selection tests and `node --check` on a generated browser expression.
