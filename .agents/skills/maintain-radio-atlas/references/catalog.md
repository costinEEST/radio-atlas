# Catalog data and station research

## Data rules

- Never embed an HTTP audio stream on an HTTPS page. Present it as a direct link and copy action, explain mixed-content limits, and provide a working HTTPS listening page when known.
- Keep all catalog input in `radios.json`. Add or edit stations there; `app.js` derives filter options and searchable card data during hydration.
- Whenever `radios.json` changes, review the country, location, broadcast-language and content-category selects against the updated station data. Populate the station fields needed for automatically derived options. Reuse suitable content-category keys; when verified programming warrants a new category, add an English key with both `en` and `ro` labels to the top-level `categories` dictionary and assign it to the relevant stations. Do not create a category merely because a station is new. Verify that new options appear, filter correctly and are translated in both English and Romanian; keep select options generated from the catalog rather than hard-coded in HTML or JavaScript.
- Keep JSON values as short as possible while preserving meaning, identity, accuracy and necessary uncertainty. Remove redundant words and repeated context; use concise prose and source labels. Do not shorten official names, URLs, contact details or standard codes in ways that change their meaning or function.
- Use short, readable, unique station IDs. Omit generic `radio-`, `-radio` and redundant band suffixes such as `-fm`; retain words that distinguish the station or belong to its brand. Use the current `radios.json` ID directly everywhere, including cards, favorites and fragment links. Do not add alias maps or compatibility migrations for renamed IDs unless explicitly requested.

## Catalog schema and language publishing

- `radios.json` uses schema version 2. Translatable fields use language maps such as `"description": { "en": "…", "ro": "…" }`. Keep both entries; missing or empty catalog translations fall back to English. Country/city names, categories, tags, frequency display text, descriptions, programming, historical text, addresses and source labels use this format. Canonical station/person names may remain strings or use language maps.
- `verified` is an ISO `YYYY-MM-DD` date, displayed through `Intl.DateTimeFormat` with UTC to avoid timezone shifts. Historical dates remain translated text because some have only year precision. Result counts use `Intl.PluralRules` and `Intl.NumberFormat`; Arabic requires `zero`, `one`, `two`, `few`, `many` and `other` forms.
- Keep station IDs independent of display language; `radios.json` is their single source of truth.
- Optional `source_note` is an English/Romanian translation map for provenance, imported classifications and supporting uncertainty. Render it as plain text under Sources, with the correct language and direction; omit the note when absent. Keep supporting URLs in `sources`.
- A station with several city frequencies uses a nonempty `frequencies` array instead of the singular `frequency`. Each entry has `city` (`slug`, translated `name`), `value`, translated `display`, and `band`; `county` is optional. The station's top-level `city` identifies its home location. Keep one station entry, include every frequency location in search and city filters, and give each copy control a city-specific accessible name. Existing singular-frequency entries remain supported.


## Large terrestrial frequency lists

- Preserve one station and the existing `frequencies` array. The legacy `city` field may identify an officially listed area or site; optional `location_type` (`region` or `transmitter`) qualifies those labels. Optional translated `licensed_site` records the regulator’s transmitter-site label, and translated `note` explains a material discrepancy. Do not infer reception coverage or turn license counties into city locations.
- Use optional `frequency_verification` with ISO `checked`, ISO `source_updated`, supporting source URLs in `sources`, and a translated `note`. Keep frequency checks separate from station/stream `verified`. Reconcile broadcaster labels with regulator sites; record historical conflicts and unavailable sources without claiming live RF verification. Keep source links in the station’s Sources list.
- Keep one frequency preview and the native closed disclosure. Show the dated verification context inside it. Lists longer than eight entries have a labeled local search with visible/total status and an empty state; match location, licensed site and frequency, tolerating accents and decimal commas. Hide the complete unmatched list item. Preserve its query and open state during language changes. Include licensed sites in global search and qualify region/site options in the location filter.
