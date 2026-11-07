import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = async (file) =>
  JSON.parse(await readFile(new URL(file, root), "utf8"));
const source = await readFile(new URL("i18n.js", root), "utf8");
let instance = 0;

async function setup(
  lang,
  overrides = {},
  missing = false,
  enableLocales = true,
  onChange = () => {},
) {
  const manifest = await read("locales/index.json");
  if (enableLocales)
    for (const config of Object.values(manifest.locales)) config.enabled = true;
  const en = await read("locales/en.json");
  const ro = await read("locales/ro.json");
  globalThis.fetch = async (url) => {
    const data =
      url === "locales/index.json"
        ? manifest
        : url === "locales/en.json"
          ? en
          : url === "locales/ro.json"
            ? ro
            : overrides;
    return {
      ok: !(
        missing &&
        url !== "locales/index.json" &&
        url !== "locales/en.json"
      ),
      status: 404,
      json: async () => data,
    };
  };
  let destination;
  globalThis.location = {
    href: `https://example.test/${lang === undefined ? "" : `?lang=${lang}`}`,
    assign(url) {
      destination = String(url);
    },
  };
  globalThis.history = {
    state: null,
    pushState(state, unused, url) {
      destination = String(url);
      location.href = String(url);
    },
    replaceState(state, unused, url) { location.href = String(url); },
  };
  const historyListeners = {};
  globalThis.window = {
    addEventListener(name, callback) { historyListeners[name] = callback; },
  };
  const listeners = {};
  const picker = {
    append() {},
    closest: () => ({ hidden: true }),
    setCustomValidity(message) {
      this.validationMessage = message;
    },
    reportValidity() {
      return false;
    },
    addEventListener(name, callback) {
      listeners[name] = callback;
    },
  };
  const home = { getAttribute: () => "./" };
  const structured = {
    textContent: JSON.stringify({
      "@graph": [{ "@type": "CollectionPage", about: {} }],
    }),
  };
  globalThis.document = {
    documentElement: {},
    querySelectorAll: () => [],
    createElement: () => ({}),
    querySelector: (selector) =>
      selector === ".brand"
        ? home
        : selector === "#locale"
          ? picker
          : selector.startsWith("script")
            ? structured
            : {},
  };
  const module = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${instance++}`
  );
  await module.initI18n({ onChange });
  return { ...module, picker, home, listeners, historyListeners, destination: () => destination };
}

test("Romanian plural categories, UTC dates, catalog language maps and stable identifiers", async () => {
  const i18n = await setup("ro");
  assert.equal(i18n.t("results", { count: 1 }), "1 post");
  assert.equal(i18n.t("results", { count: 2 }), "2 posturi");
  assert.equal(i18n.t("results", { count: 20 }), "20 de posturi");
  assert.equal(i18n.formatDate("2026-11-06"), "6 noiembrie 2026");
  const catalog = await read("radios.json");
  const localized = i18n.localize(catalog);
  assert.equal(catalog.schema_version, 2);
  assert.equal(
    new Set(localized.stations.map((s) => s.id)).size,
    localized.stations.length,
  );
  for (const station of localized.stations) {
    assert.equal(typeof station.description, "string");
    assert.equal(typeof station.city.name, "string");
    assert.match(station.verified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(station.categories.every((key) => key in localized.categories));
    const frequencies = station.frequencies ?? [
      { ...station.frequency, city: station.city },
    ];
    assert.ok(Array.isArray(frequencies) && frequencies.length > 0, station.id);
    assert.ok(
      !(station.frequencies && station.frequency),
      `Duplicated frequency data: ${station.id}`,
    );
    for (const frequency of frequencies) {
      assert.equal(typeof frequency.city.slug, "string");
      assert.equal(typeof frequency.city.name, "string");
      assert.equal(typeof frequency.display, "string");
      assert.ok(
        frequency.value === null || /^\d+(\.\d+)?$/.test(frequency.value),
        station.id,
      );
    }
  }
});

test("region tags, English messages and per-field English fallback", async () => {
  const i18n = await setup("en-GB", {
    "favorite.add": "Add {name} to favorites",
    results: { one: "{count} station", other: "{count} stations" },
  });
  assert.equal(i18n.currentLocale(), "en");
  assert.equal(
    i18n.t("favorite.add", { name: "Radio Atlas" }),
    "Add Radio Atlas to favorites",
  );
  assert.equal(i18n.t("results", { count: 2 }), "2 stations");
  assert.equal(i18n.localize({ ro: "Cultură", en: "Culture" }), "Culture");
  assert.equal(i18n.localize({ ro: "", en: "Culture" }), "Culture");
  assert.equal(i18n.contentLanguage({ ro: "Cultură", en: "Culture" }), "en");
  assert.equal(i18n.messagesLanguage("official"), "en");
  assert.equal(
    i18n.localize({ id: "fixed", url: "https://example.test" }).id,
    "fixed",
  );
});

test("Hungarian locale and unknown locale fallback", async () => {
  let i18n = await setup("hu", { official: "Hivatalos weboldal" });
  assert.equal(i18n.t("official"), "Hivatalos weboldal");
  assert.equal(document.documentElement.lang, "hu");
  i18n = await setup("unknown");
  assert.equal(i18n.currentLocale(), "en");
});

test("Arabic direction, all six plural forms and localized numbers", async () => {
  const forms = Object.fromEntries(
    ["zero", "one", "two", "few", "many", "other"].map((key) => [
      key,
      `${key}: {count}`,
    ]),
  );
  const i18n = await setup("ar", { results: forms });
  assert.equal(document.documentElement.dir, "rtl");
  for (const [count, category] of [
    [0, "zero"],
    [1, "one"],
    [2, "two"],
    [3, "few"],
    [11, "many"],
    [100, "other"],
  ]) {
    assert.equal(
      i18n.t("results", { count }),
      `${category}: ${new Intl.NumberFormat("ar").format(count)}`,
    );
  }
});

test("unavailable translation file restores the default language", async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    const i18n = await setup("ar", {}, true);
    assert.equal(i18n.currentLocale(), "en");
    assert.equal(document.documentElement.dir, "ltr");
  } finally {
    console.warn = warn;
  }
});

test("unpublished languages stay unavailable until enabled", async () => {
  const i18n = await setup("ar", {}, false, false);
  assert.equal(i18n.currentLocale(), "en");
  assert.equal(document.documentElement.dir, "ltr");
});

test("HTML and template translation keys exist in the default dictionary", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const messages = await read("locales/en.json");
  for (const [, key] of html.matchAll(
    /data-i18n(?:-aria-label|-placeholder|-content)?="([^"]+)"/g,
  )) {
    assert.ok(Object.hasOwn(messages, key), `Missing default message: ${key}`);
  }
  for (const slot of ["garden", "frequency", "person"]) {
    assert.ok(html.includes(`data-i18n-slot="${slot}"`));
  }
});

test("English is the default, and Romanian selection is persisted in URLs and home links", async () => {
  let i18n = await setup(undefined);
  assert.equal(i18n.currentLocale(), "en");
  assert.equal(i18n.t("results", { count: 20 }), "20 stations");
  i18n.picker.value = "ro";
  await i18n.listeners.change();
  assert.equal(new URL(i18n.destination()).searchParams.get("lang"), "ro");
  i18n = await setup("ro");
  assert.equal(new URL(i18n.home.href).searchParams.get("lang"), "ro");
  assert.equal(i18n.localize({ en: "Culture", ro: "" }), "Culture");
  assert.equal(i18n.contentLanguage({ en: "Culture", ro: "" }), "en");
});

test("all catalog translations have English and Romanian, with English category keys", async () => {
  const catalog = await read("radios.json");
  assert.equal(catalog.default_locale, "en");
  function visit(value, path = "catalog") {
    if (Array.isArray(value))
      return value.forEach((item, i) => visit(item, `${path}[${i}]`));
    if (!value || typeof value !== "object") return;
    if (Object.hasOwn(value, "ro") || Object.hasOwn(value, "en")) {
      assert.ok(
        typeof value.en === "string" && value.en.length > 0,
        `Missing English: ${path}`,
      );
      assert.ok(
        typeof value.ro === "string" && value.ro.length > 0,
        `Missing Romanian: ${path}`,
      );
    }
    for (const [key, item] of Object.entries(value)) {
      assert.match(
        key,
        /^[a-z][a-z0-9_]*$/,
        `Non-English structural key: ${path}.${key}`,
      );
      visit(item, `${path}.${key}`);
    }
  }
  visit(catalog);
  for (const oldKey of ["stiri", "muzica", "clasica", "cultura"])
    assert.ok(!(oldKey in catalog.categories));
});

test("enabled UI translations cover the English keys and preserve interpolation slots", async () => {
  const manifest = await read("locales/index.json");
  const english = await read("locales/en.json");
  const slots = (value) =>
    [...new Set(JSON.stringify(value).match(/\{\w+\}/g) ?? [])].sort();
  for (const config of Object.values(manifest.locales).filter(
    (config) => config.enabled,
  )) {
    const messages = await read(config.messages);
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(english).sort());
    for (const key of Object.keys(english))
      assert.deepEqual(slots(messages[key]), slots(english[key]), key);
  }
});

test("blocked history updates restore selection and report a localized error", async () => {
  const i18n = await setup("ro");
  const error = console.error;
  console.error = () => {};
  try {
    globalThis.history.pushState = () => {
      throw new Error("Navigation denied");
    };
    i18n.picker.value = "en";
    await assert.doesNotReject(i18n.listeners.change());
    assert.equal(i18n.picker.value, "ro");
    assert.equal(i18n.picker.validationMessage, i18n.t("language.error"));
  } finally {
    console.error = error;
  }
});

test("malformed messages and invalid dates fall back without throwing", async () => {
  const i18n = await setup("hu", { official: 42, results: { one: "broken" } });
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(i18n.t("official"), "Official website");
    assert.equal(i18n.messagesLanguage("official"), "en");
    assert.equal(i18n.t("results", { count: 2 }), "2 stations");
    assert.equal(i18n.formatDate("invalid-date"), "invalid-date");
  } finally {
    console.warn = warn;
  }
});

test("malformed optional metadata does not prevent locale initialization", async () => {
  const i18n = await setup("ro");
  document.querySelector('script[type="application/ld+json"]').textContent =
    "{";
  const warn = console.warn;
  console.warn = () => {};
  try {
    await assert.doesNotReject(i18n.initI18n());
    assert.equal(i18n.currentLocale(), "ro");
  } finally {
    console.warn = warn;
  }
});

test("JSON parse failures propagate with resource context for the startup catch", async () => {
  const i18n = await setup("en");
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => {
      throw new SyntaxError("Invalid JSON");
    },
  });
  await assert.rejects(i18n.initI18n(), (error) => {
    assert.match(error.message, /Could not load locales\/index.json/);
    assert.ok(error.cause instanceof SyntaxError);
    return true;
  });
});

test("language changes update the URL and interface without document navigation", async () => {
  let updates = 0;
  const i18n = await setup(undefined, {}, false, true, () => { updates += 1; });
  location.href = 'https://example.test/?country=ro#guerrilla';
  location.assign = () => { throw new Error('A language switch must not navigate'); };
  i18n.picker.value = 'ro';
  await i18n.listeners.change();
  assert.equal(i18n.currentLocale(), 'ro');
  assert.equal(document.documentElement.lang, 'ro');
  assert.equal(new URL(location.href).searchParams.get('lang'), 'ro');
  assert.equal(new URL(location.href).searchParams.get('country'), 'ro');
  assert.equal(new URL(location.href).hash, '#guerrilla');
  assert.equal(updates, 1);
});

test("Back and Forward restore the URL language through the same document", async () => {
  const i18n = await setup('en');
  i18n.picker.value = 'ro';
  await i18n.listeners.change();
  location.href = 'https://example.test/?lang=en';
  await i18n.historyListeners.popstate();
  assert.equal(i18n.currentLocale(), 'en');
  assert.equal(i18n.picker.value, 'en');
  assert.equal(new URL(i18n.home.href).searchParams.get('lang'), 'en');
  location.href = 'https://example.test/?lang=ro';
  await i18n.historyListeners.popstate();
  assert.equal(i18n.currentLocale(), 'ro');
  assert.equal(i18n.picker.value, 'ro');
});

test("a late dictionary response cannot overwrite the most recent language choice", async () => {
  const i18n = await setup('en');
  let resolve;
  globalThis.fetch = () => new Promise(done => { resolve = done; });
  i18n.picker.value = 'ro';
  const pending = i18n.listeners.change();
  i18n.picker.value = 'en';
  await i18n.listeners.change();
  resolve({ ok: true, json: async () => await read('locales/ro.json') });
  await pending;
  assert.equal(i18n.currentLocale(), 'en');
  assert.equal(i18n.picker.value, 'en');
  assert.equal(new URL(location.href).searchParams.get('lang'), 'en');
});

test("failed dictionary loads preserve the current URL and working language", async () => {
  const i18n = await setup('en');
  const before = location.href;
  globalThis.fetch = async () => { throw new Error('Offline'); };
  const log = console.error;
  console.error = () => {};
  try {
    i18n.picker.value = 'ro';
    await assert.doesNotReject(i18n.listeners.change());
    assert.equal(i18n.currentLocale(), 'en');
    assert.equal(location.href, before);
    assert.equal(i18n.picker.value, 'en');
    assert.equal(i18n.picker.validationMessage, i18n.t('language.error'));
  } finally { console.error = log; }
});

test("a rendering failure rolls back language and URL without document navigation", async () => {
  let updates = 0;
  const i18n = await setup('en', {}, false, true, () => {
    if (++updates === 1) throw new Error('Rendering failed');
  });
  const before = location.href;
  const log = console.error;
  console.error = () => {};
  try {
    i18n.picker.value = 'ro';
    await i18n.listeners.change();
    assert.equal(i18n.currentLocale(), 'en');
    assert.equal(location.href, before);
    assert.equal(document.documentElement.lang, 'en');
    assert.equal(i18n.picker.value, 'en');
    assert.equal(updates, 2);
  } finally { console.error = log; }
});

test("broadcast languages use explicit codes and preserve multilingual and unknown entries", async () => {
  const catalog = await read("radios.json");
  const stations = new Map(catalog.stations.map(station => [station.id, station]));
  for (const station of catalog.stations) {
    assert.ok(Array.isArray(station.broadcast_languages), station.id);
    assert.equal(new Set(station.broadcast_languages).size, station.broadcast_languages.length);
    for (const code of station.broadcast_languages) {
      assert.equal(Intl.getCanonicalLocales(code)[0], code);
      for (const locale of ["en", "ro"]) {
        const label = new Intl.DisplayNames(locale, { type: "language", fallback: "none" }).of(code);
        assert.ok(label && label !== code, `${locale}: ${code}`);
      }
    }
  }
  assert.deepEqual(stations.get("marosvasarhelyi").broadcast_languages, ["hu", "de", "rom"]);
  assert.deepEqual(stations.get("algerian-quran").broadcast_languages, ["ar", "fr"]);
  assert.deepEqual(stations.get("peaceradio-quran").broadcast_languages, ["ar", "ml"]);
  assert.deepEqual(stations.get("sayang-quran").broadcast_languages, []);
  assert.deepEqual(stations.get("sout-ul-quran").broadcast_languages, ["ar"]);
});
