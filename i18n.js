let locale = "en";
let defaultLocale = "en";
let manifest;
let fallback = {};
let messages = {};

async function readJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) { throw new Error(`Could not load ${url}.`, { cause: error }); }
}

async function readMessages(url) {
  const data = await readJSON(url);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError(`Expected a message dictionary in ${url}.`);
  }
  return data;
}

export const currentLocale = () => locale;
const validMessage = (message) => typeof message === "string" ? message.length > 0 :
  message !== null && typeof message === "object" && typeof message.other === "string";
export const messagesLanguage = (key) => validMessage(messages[key]) ? locale : defaultLocale;

// Translation maps contain BCP 47 language tags; structural objects do not.
export function isTranslation(value) {
  return value && !Array.isArray(value) && typeof value === "object" &&
    Object.hasOwn(value, defaultLocale) && typeof value[defaultLocale] === "string";
}

export function contentLanguage(value) {
  if (!isTranslation(value)) return null;
  return Object.hasOwn(value, locale) && value[locale] !== "" ? locale : defaultLocale;
}

export function localize(value) {
  if (isTranslation(value)) return value[contentLanguage(value)];
  if (Array.isArray(value)) return value.map(localize);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, localize(item)]),
  );
  return value;
}

export function t(key, values = {}) {
  const language = messagesLanguage(key);
  try { return formatMessage(language === locale ? messages[key] : fallback[key], language, values); }
  catch (error) {
    console.warn(`Could not format message ${key}; using English.`, error);
    try { return formatMessage(fallback[key], defaultLocale, values); }
    catch (fallbackError) {
      console.error(`No usable message for ${key}.`, fallbackError);
      return key;
    }
  }
}

function formatMessage(message, language, values) {
  if (typeof message === "object") {
    message = message[new Intl.PluralRules(language).select(values.count)] ?? message.other;
  }
  return message.replace(/\{(\w+)\}/g, (token, name) => {
    if (name === "count" && typeof values.count === "number") return new Intl.NumberFormat(locale).format(values.count);
    return String(values[name] ?? token);
  });
}

export function formatDate(value) {
  try {
    // Catalog dates are date-only values. UTC prevents a date shift by timezone.
    return new Intl.DateTimeFormat(locale, {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  } catch (error) {
    console.warn("Date could not be formatted; retaining its source value.", error);
    return String(value ?? "");
  }
}

export function translateDOM(root = document) {
  if (!Object.keys(fallback).length) return;
  for (const element of root.querySelectorAll("[data-i18n]")) {
    const key = element.dataset.i18n;
    const language = messagesLanguage(key);
    element.lang = language;
    element.dir = manifest.locales[language].dir;
    // Slots keep links and emphasis semantic, and let translators reorder them.
    const slots = new Map([...element.querySelectorAll("[data-i18n-slot]")]
      .map((node) => [node.dataset.i18nSlot, node]));
    const parts = t(key).split(/(\{\w+\})/g);
    element.replaceChildren(...parts.map((part) => slots.get(part.slice(1, -1)) ?? document.createTextNode(part)));
  }
  for (const attribute of ["aria-label", "placeholder", "content"]) {
    for (const element of root.querySelectorAll(`[data-i18n-${attribute}]`)) {
      const key = element.getAttribute(`data-i18n-${attribute}`);
      element.setAttribute(attribute, t(key));
      if (attribute !== "content") element.lang = messagesLanguage(key);
    }
  }
}

export async function initI18n() {
  manifest = await readJSON("locales/index.json");
  defaultLocale = manifest.default_locale;
  const enabled = Object.entries(manifest.locales).filter(([, config]) => config.enabled);
  const requested = new URL(location.href).searchParams.get("lang") ?? defaultLocale;
  const base = requested.toLowerCase().split("-")[0];
  locale = [requested, base].find((code) => manifest.locales[code]?.enabled) ?? defaultLocale;
  fallback = await readMessages(manifest.locales[defaultLocale].messages);
  if (locale !== defaultLocale) {
    try { messages = await readMessages(manifest.locales[locale].messages); }
    catch (error) { console.warn("Locale unavailable; using the default language.", error); locale = defaultLocale; }
  }
  if (locale === defaultLocale) messages = fallback;
  document.documentElement.lang = locale;
  document.documentElement.dir = manifest.locales[locale].dir;
  translateDOM();
  // The URL owns language state, including navigation back to the home page.
  try {
    const home = document.querySelector(".brand");
    if (home) {
      const url = new URL(home.getAttribute("href"), location.href);
      if (locale !== defaultLocale) url.searchParams.set("lang", locale);
      home.href = url;
    }
  } catch (error) { console.warn("Localized home link could not be set.", error); }
  // Metadata is optional; malformed structured data must not block station loading.
  try {
    document.querySelector('meta[property="og:locale"]').content = manifest.locales[locale].og_locale;
    const structured = document.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(structured.textContent);
    for (const item of data["@graph"]) {
      item.inLanguage = locale;
      item.description = t(item["@type"] === "WebSite" ? "meta.structuredDescription" : "meta.socialDescription");
      if (item["@type"] === "CollectionPage") { item.name = t("meta.title"); item.about.name = t("meta.about"); }
    }
    structured.textContent = JSON.stringify(data);
  } catch (error) { console.warn("Localized metadata could not be updated.", error); }
  const select = document.querySelector("#locale");
  for (const [code, config] of enabled) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = config.name;
    option.lang = code;
    option.dir = config.dir;
    select.append(option);
  }
  select.value = locale;
  select.closest("label").hidden = enabled.length < 2;
  select.addEventListener("change", () => {
    try {
      select.setCustomValidity("");
      const url = new URL(location.href);
      url.searchParams.set("lang", select.value);
      location.assign(url);
    } catch (error) {
      console.error("Language navigation failed.", error);
      try {
        select.value = locale;
        select.setCustomValidity(t("language.error"));
        select.reportValidity();
      } catch (displayError) { console.error("Language error could not be displayed.", displayError); }
    }
  });
}
