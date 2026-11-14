# Localization behavior

## Internationalization and naming

- Always use English for JSON property/message/category keys and HTML markup identifiers, including IDs, classes, `name`, `data-*` attribute names and their structural values. Use standard BCP 47 language tags (`en`, `ro`, `hu`, `ar`) for translation-map keys. Canonical station names, place names, existing stable station IDs and external URLs are not translated identifiers.
- English is the default and fallback language, including static HTML text, accessible labels and metadata. Romanian is a supported selectable language. Every translatable catalog field must contain both `en` and `ro` values; add other languages alongside them. Preserve the existing facts and uncertainty when translating.
- Keep UI translations in `locales/<language>.json`, locale configuration in `locales/index.json`, and station translations in `radios.json`. All enabled UI dictionaries must cover the English message keys and interpolation slots. Keep IDs, links, filter values, telephone values and ISO verification dates independent of display language.
- Persist language selection in the URL (`?lang=ro` for Romanian, `?lang=en` for English). With no selected language, or an unsupported/disabled locale, use English. The URL is the single source of truth; do not add sessionStorage or IndexedDB language state. Preserve the selected language on internal home links and reloads; browser Back/Forward must restore the URL-selected language.
- Switch languages in the current document using the History API, not `location.assign` or a page reload. Load messages before committing the change, ignore obsolete language requests, and handle `popstate` for Back/Forward. Translation-load or history failures must leave the working interface and playback intact, with a localized error. Preserve other query parameters and the fragment.
- Keep the shared audio element mounted and its source, volume, mute, playback position and paused/loading state unchanged during translation. Rebuild only catalog content, preserving filter values, favorites mode, open disclosures and relevant focus. Refresh dynamic full/compact-player labels, catalog data, dates, counts, document language/direction, metadata and the home link. Test a language switch immediately after Play, while paused, and through Back/Forward; confirm a single stream load and advancing audio without document navigation.
- Set document `lang` and `dir` for the selected locale, annotate fallback text with its actual language, and isolate mixed-direction content. Use locale-aware dates, numbers and plural rules. Register future languages without enabling incomplete translations.
- Validate English/default and Romanian URLs, translation coverage, stable catalog identities, selector persistence, metadata, fallback and RTL behavior. Use the catalog schema and language publishing workflow below.

## Publish a language

To publish a language:

1. Copy `locales/en.json` to the locale’s configured message path. Translate all messages without changing their English keys or interpolation placeholders. Add catalog translations alongside `en` and `ro`.
2. Preserve the `{garden}`, `{frequency}` and `{person}` slots in their respective messages. Translators may reorder them; they retain semantic links and emphasis. Translation strings are plain text, never HTML.
3. Configure the locale in `locales/index.json` using its BCP 47 tag, native `name`, `dir` (`ltr` or `rtl`), `og_locale`, `messages` path and `enabled`. English and Romanian are enabled; Hungarian and Arabic remain disabled until complete. The native language picker appears when at least two languages are enabled.
4. Test URL selection and fallback. Region tags such as `en-GB` fall back to their enabled base language. Unknown/disabled languages and unavailable message files fall back to English. New URLs without `lang` use English, independently of other tabs.
5. Verify translated metadata, language annotations, interpolation slots, plural forms, missing translations, keyboard use, RTL, 320px reflow and 200% text size. Arabic uses document `dir="rtl"`; use logical CSS properties and bidi isolation, while URLs, telephone numbers and email remain LTR.

Client-selected translations update page and social metadata at runtime. Static HTML and the canonical URL remain English defaults. Full multilingual search indexing would require separately rendered language URLs and `hreflang` links.
