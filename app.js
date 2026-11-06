let translateError;
let catalogLoaded = false;

try {
  const {
    initI18n,
    currentLocale,
    localize,
    contentLanguage,
    messagesLanguage,
    t,
    formatDate,
    translateDOM,
  } = await import("./i18n.js");
  translateError = translateDOM;

  const filters = document.querySelector("#filters");
  const stationsRoot = document.querySelector("#stations");
  const template = document.querySelector("#station-template");
  const emptyState = document.querySelector("#empty-state");
  const resultCount = document.querySelector("#result-count");
  const toast = document.querySelector("#toast");
  const viewButtons = [...document.querySelectorAll("[data-view]")];
  const stationFrequencies = new WeakMap();
  const favorites = readFavorites();
  let activeView = "all";
  let toastTimer;

  const normalize = (value) =>
    String(value)
      .normalize("NFD")
      .replaceAll(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase(currentLocale());
  const field = (root, name) => root.querySelector(`[data-field="${name}"]`);

  function readFavorites() {
    try {
      const stored = JSON.parse(
        localStorage.getItem("radio-atlas:favorites") ?? "[]",
      );
      if (
        !Array.isArray(stored) ||
        stored.some((id) => typeof id !== "string")
      ) {
        throw new TypeError("Favorites must be an array of station IDs.");
      }
      return new Set(stored);
    } catch (error) {
      console.warn("Favorites could not be read; using an empty set.", error);
      return new Set();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(
        "radio-atlas:favorites",
        JSON.stringify([...favorites]),
      );
    } catch {
      notify(t("favorites.error"));
    }
  }

  function setLink(link, href, text) {
    if (!href || !/^https?:\/\//i.test(href)) {
      link.remove();
      return;
    }
    link.href = href;
    link.textContent = text;
    link.ariaLabel = t("link.newTab", { text });
  }

  function appendContact(address, station, rawContact) {
    if (station.contact.address) {
      const text = document.createElement("bdi");
      text.textContent = station.contact.address;
      const language = contentLanguage(rawContact.address);
      if (language) text.lang = language;
      address.append(text, document.createElement("br"));
    }
    station.contact.phones.forEach((phone, index) => {
      if (index) address.append(" · ");
      const link = document.createElement("a");
      link.href = `tel:${phone.value}`;
      link.textContent = phone.display;
      link.dir = "ltr";
      address.append(link);
    });
    if (!station.contact.email) {
      if (!address.hasChildNodes()) address.textContent = t("contact.unknown");
      return;
    }
    const email = document.createElement("a");
    email.href = `mailto:${station.contact.email}`;
    email.textContent = station.contact.email;
    email.dir = "ltr";
    address.append(document.createElement("br"), email);
  }

  function updateFavorite(button, name) {
    const selected = favorites.has(button.dataset.stationId);
    button.querySelector("span").textContent = selected ? "★" : "☆";
    button.ariaPressed = String(selected);
    const key = selected ? "favorite.remove" : "favorite.add";
    button.ariaLabel = t(key, { name });
    button.lang = messagesLanguage(key);
  }

  function frequenciesFor(station) {
    return (
      station.frequencies ?? [
        { ...station.frequency, city: station.city, county: station.county },
      ]
    );
  }

  function setLocation(node, values) {
    node.dir = "auto";
    node.replaceChildren();
    for (const value of values.filter(Boolean)) {
      if (node.hasChildNodes()) node.append(" · ");
      const span = document.createElement("bdi");
      span.textContent = localize(value);
      const language = contentLanguage(value);
      if (language) span.lang = language;
      node.append(span);
    }
  }

  function setFrequency(row, rawFrequency) {
    const frequency = localize(rawFrequency);
    field(row, "frequency").textContent = frequency.display;
    field(row, "frequency").lang =
      contentLanguage(rawFrequency.display) ?? currentLocale();
    field(row, "frequency").dir = "auto";
    field(row, "band").textContent = frequency.band;
    setLocation(field(row, "frequency-location"), [
      rawFrequency.city.name,
      rawFrequency.county,
    ]);
  }

  function appendFrequencies(article, rawStation) {
    const frequencies = frequenciesFor(rawStation);
    stationFrequencies.set(article, frequencies);
    setFrequency(field(article, "primary-frequency"), frequencies[0]);
    const options = article.querySelector(".frequency-options");
    options.hidden = !frequencies.some((frequency) => frequency.value);
    const summary = field(article, "frequency-summary");
    summary.textContent = t(
      frequencies.length > 1 ? "frequency.other" : "frequency.options",
    );
    summary.lang = messagesLanguage(
      frequencies.length > 1 ? "frequency.other" : "frequency.options",
    );
    for (const rawFrequency of frequencies) {
      const fragment = document
        .querySelector("#frequency-template")
        .content.cloneNode(true);
      translateDOM(fragment);
      const row = fragment.querySelector(".frequency");
      setFrequency(row, rawFrequency);
      const copy = row.querySelector('[data-action="copy-frequency"]');
      copy.dataset.copy = rawFrequency.value ?? "";
      copy.hidden = !rawFrequency.value;
      copy.ariaLabel = t("copy.frequencyLocation", {
        city: localize(rawFrequency.city.name),
      });
      copy.lang = messagesLanguage("copy.frequencyLocation");
      field(article, "frequencies").append(fragment);
    }
  }

  function createStation(rawStation) {
    const station = localize(rawStation);
    const frequencies = frequenciesFor(station);
    const fragment = template.content.cloneNode(true);
    translateDOM(fragment);
    const article = fragment.querySelector(".station");
    Object.assign(article.dataset, {
      country: station.country.code,
      city: [
        ...new Set([
          station.city.slug,
          ...frequencies.map((frequency) => frequency.city.slug),
        ]),
      ].join(" "),
      categories: station.categories.join(" "),
      modes: station.modes.join(" "),
      search: normalize(
        [
          station.name,
          station.native_name ?? "",
          station.language,
          station.city.name,
          station.country.name,
          station.county,
          station.description,
          ...frequencies.flatMap((frequency) => [
            frequency.city.name,
            frequency.value,
            frequency.display,
            frequency.band,
          ]),
          ...station.modes,
          station.tags,
          station.recommendation?.name ?? "",
        ].join(" "),
      ),
    });
    article.id = station.id;

    const values = {
      mark: station.mark,
      name: station.name,
      description: station.description,
      programming: station.programming,
      "stream-url": station.listening.stream,
      "stream-note": station.listening.stream_note,
      verified: t("verified", { date: formatDate(station.verified) }),
    };
    for (const [name, value] of Object.entries(values))
      field(article, name).textContent = value;
    field(article, "verified").lang = messagesLanguage("verified");
    const translatedFields = {
      name: rawStation.name,
      description: rawStation.description,
      programming: rawStation.programming,
      "stream-note": rawStation.listening.stream_note,
    };
    for (const [name, value] of Object.entries(translatedFields)) {
      const node = field(article, name);
      node.lang = contentLanguage(value) ?? currentLocale();
      node.dir = "auto";
    }
    for (const name of ["name", "history"]) field(article, name).dir = "auto";
    setLocation(field(article, "location"), [
      rawStation.city.name,
      rawStation.country.name,
    ]);
    appendFrequencies(article, rawStation);
    const history = field(article, "history");
    history.replaceChildren();
    for (const [value, key, parameter] of [
      [rawStation.history.first_broadcast, "history.first", "date"],
      [rawStation.history.operator, "history.operator", "operator"],
    ]) {
      if (!value) continue;
      const span = document.createElement("span");
      span.lang = messagesLanguage(key);
      const content = document.createElement("bdi");
      content.textContent = localize(value);
      const language = contentLanguage(value);
      if (language) content.lang = language;
      const token = `{${parameter}}`;
      const [before, after] = t(key).split(token);
      span.append(before, content, after ?? "");
      history.append(span, " ");
    }
    if (!history.hasChildNodes()) {
      history.textContent = t("history.unknown");
      history.lang = messagesLanguage("history.unknown");
    }
    if (station.native_name) {
      const nativeName = document.createElement("bdi");
      nativeName.lang = station.native_language;
      nativeName.dir = "auto";
      nativeName.textContent = station.native_name;
      field(article, "name").append(document.createElement("br"), nativeName);
    }
    if ([...station.mark].length > 2)
      field(article, "mark").dataset.compact = "";

    for (const tag of rawStation.tags) {
      const item = document.createElement("li");
      item.textContent = localize(tag);
      item.lang = contentLanguage(tag) ?? currentLocale();
      item.dir = "auto";
      field(article, "tags").append(item);
    }
    field(article, "tags").hidden = rawStation.tags.length === 0;

    if (rawStation.source_note) {
      const note = field(article, "source-note");
      note.textContent = localize(rawStation.source_note);
      note.lang = contentLanguage(rawStation.source_note) ?? currentLocale();
      note.dir = "auto";
      note.hidden = false;
    }

    const recommendation = field(article, "recommended-by");
    if (station.recommendation)
      setLink(
        recommendation,
        station.recommendation.url,
        station.recommendation.name,
      );
    else recommendation.closest(".recommendation").remove();
    for (const [name, url, key] of [
      ["stream", station.listening.stream, "stream.open"],
      ["listen-page", station.listening.page, "listen"],
      ["official", station.listening.official, "official"],
    ]) {
      const link = field(article, name);
      setLink(link, url, t(key));
      link.lang = messagesLanguage(key);
    }
    appendContact(field(article, "contact"), station, rawStation.contact);

    for (const source of rawStation.sources) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      setLink(link, source.url, localize(source.label));
      link.lang = contentLanguage(source.label) ?? currentLocale();
      link.dir = "auto";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.append(link);
      field(article, "sources").append(item);
    }

    const favorite = article.querySelector(".favorite");
    favorite.dataset.stationId = station.id;
    updateFavorite(favorite, station.name);
    article.querySelector('[data-action="copy-stream"]').dataset.copy =
      station.listening.stream;
    return fragment;
  }

  function populateSelect(select, entries) {
    for (const [value, label, language] of entries) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = localize(label);
      option.lang = language ?? contentLanguage(label) ?? currentLocale();
      option.dir = "auto";
      select.append(option);
    }
  }

  function populateFilters(catalog) {
    populateSelect(
      filters.elements.country,
      new Map(
        catalog.stations.map((station) => [
          station.country.code,
          station.country.name,
        ]),
      ),
    );
    const cities = new Map(
      catalog.stations.flatMap((station) =>
        [
          station.city,
          ...frequenciesFor(station).map((frequency) => frequency.city),
        ].map((city) => [city.slug, { city, country: station.country }]),
      ),
    );
    populateSelect(
      filters.elements.city,
      [...cities].map(([slug, location]) => [
        slug,
        `${localize(location.city.name)} · ${localize(location.country.name)}`,
        contentLanguage(location.city.name),
      ]),
    );
    populateSelect(
      filters.elements.category,
      Object.entries(catalog.categories),
    );
  }

  function render() {
    if (!catalogLoaded) return;
    const data = new FormData(filters);
    const words = normalize(data.get("search").trim())
      .split(/\s+/)
      .filter(Boolean);
    let count = 0;
    for (const article of stationsRoot.querySelectorAll(".station")) {
      const matchesSearch = words.every((word) =>
        article.dataset.search.includes(word),
      );
      const matchesFields = ["country", "city"].every(
        (name) =>
          !data.get(name) ||
          article.dataset[name].split(" ").includes(data.get(name)),
      );
      const matchesCategory =
        !data.get("category") ||
        article.dataset.categories.split(" ").includes(data.get("category"));
      const matchesView =
        activeView === "all" ||
        (activeView === "favorites"
          ? favorites.has(article.id)
          : article.dataset.modes.split(" ").includes(activeView));
      const visible =
        matchesSearch && matchesFields && matchesCategory && matchesView;
      article.closest(".station-item").hidden = !visible;
      if (visible) {
        const frequencies = stationFrequencies.get(article);
        const selected =
          frequencies.find(
            (frequency) => frequency.city.slug === data.get("city"),
          ) ?? frequencies[0];
        setFrequency(field(article, "primary-frequency"), selected);
      }
      if (visible) count += 1;
    }
    emptyState.hidden = count !== 0;
    resultCount.textContent = t("results", { count });
    resultCount.lang = messagesLanguage("results");
  }

  function resetAll() {
    filters.reset();
    activeView = "all";
    for (const button of viewButtons)
      button.ariaPressed = String(button.dataset.view === activeView);
    render();
  }

  function notify(message) {
    try {
      clearTimeout(toastTimer);
      toast.value = message;
      toast.hidden = false;
      toastTimer = setTimeout(
        handleAction(() => {
          toast.hidden = true;
        }),
        2600,
      );
    } catch (error) {
      console.error("Notification could not be displayed.", error);
    }
  }

  // Each callback runs after startup's catch has finished, so it owns its errors.
  function handleAction(action) {
    return async (...args) => {
      try {
        return await action(...args);
      } catch (error) {
        console.error("Station action failed.", error);
        notify(t("action.error"));
      }
    };
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      notify(t("copy.success", { text }));
    } catch (error) {
      console.warn("Clipboard unavailable; offering manual copy.", error);
      try {
        window.prompt(t("copy.prompt"), text);
      } catch (fallbackError) {
        console.error("Manual copy unavailable.", fallbackError);
        notify(t("copy.error"));
      }
    }
  }

  filters.addEventListener("input", handleAction(render));
  filters.addEventListener(
    "reset",
    handleAction(() => requestAnimationFrame(handleAction(render))),
  );
  document
    .querySelector("#show-all")
    .addEventListener("click", handleAction(resetAll));
  for (const button of viewButtons)
    button.addEventListener(
      "click",
      handleAction(() => {
        activeView = button.dataset.view;
        for (const item of viewButtons)
          item.ariaPressed = String(item === button);
        render();
      }),
    );

  stationsRoot.addEventListener(
    "click",
    handleAction(async (event) => {
      const favorite = event.target.closest(".favorite");
      if (favorite) {
        const id = favorite.dataset.stationId;
        favorites.has(id) ? favorites.delete(id) : favorites.add(id);
        saveFavorites();
        updateFavorite(
          favorite,
          field(favorite.closest(".station"), "name").textContent,
        );
        render();
        return;
      }
      const copy = event.target.closest("[data-copy]");
      if (copy) await copyText(copy.dataset.copy);
    }),
  );

  await initI18n();
  const response = await fetch("radios.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const catalog = await response.json();
  stationsRoot.replaceChildren(...catalog.stations.map(createStation));
  populateFilters(catalog);
  stationsRoot.ariaBusy = "false";
  catalogLoaded = true;
  render();
} catch (error) {
  catalogLoaded = false;
  console.error("Catalog startup failed.", error);
  try {
    const root = document.querySelector("#stations");
    const count = document.querySelector("#result-count");
    const template = document.querySelector("#catalog-error");
    let content = template.content.cloneNode(true);
    try {
      translateError?.(content);
    } catch (translationError) {
      console.error(
        "Error translation failed; keeping static English text.",
        translationError,
      );
      content = template.content.cloneNode(true);
    }
    const message = content.querySelector('[data-field="error-count"]');
    count.textContent = message.textContent;
    count.lang = message.lang || "en";
    message.remove();
    root.ariaBusy = "false";
    root.replaceChildren(content);
  } catch (displayError) {
    console.error(
      "Catalog error could not be displayed; retaining existing HTML.",
      displayError,
    );
  }
}
