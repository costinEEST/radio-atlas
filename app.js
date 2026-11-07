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
  const { createPlayer } = await import("./player.js");

  const filters = document.querySelector("#filters");
  const stationsRoot = document.querySelector("#stations");
  const template = document.querySelector("#station-template");
  const emptyState = document.querySelector("#empty-state");
  const resultCount = document.querySelector("#result-count");
  const toast = document.querySelector("#toast");
  const viewButtons = [...document.querySelectorAll("[data-view]")];
  const stationFrequencies = new WeakMap();
  const stationsById = new Map();
  const favoritesFilter = document.querySelector("#favorites-only");
  const playerPanel = document.querySelector("#player");
  const miniPlayer = document.querySelector("#mini-player");
  const audio = document.querySelector("#radio-audio");
  const player = createPlayer(audio, updatePlayer);
  let selectedStation;
  let playbackState = "idle";
  let compactFrame;
  const favorites = readFavorites();
  let activeView = "all";
  let favoritesOnly = false;
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

  function updatePlayer({ station: currentStation, state }) {
    const station = stationsById.get(currentStation?.id) ?? currentStation;
    const focused = document.activeElement;
    selectedStation = station;
    playbackState = state;
    playerPanel.hidden = false;
    document.querySelector("#player-station").textContent = station?.name ?? "";
    const status = document.querySelector("#player-status");
    const message = t(`player.${state}`, { name: station?.name ?? "" });
    if (status.textContent !== message) status.textContent = message;
    status.lang = messagesLanguage(`player.${state}`);
    audio.hidden = ["error", "stopped"].includes(state);
    const retry = document.querySelector("#player-retry");
    retry.hidden = !["error", "stopped"].includes(state);
    const retryKey = state === "error" ? "player.retry" : "player.play";
    retry.textContent = t(retryKey);
    retry.ariaLabel = `${t(retryKey)} · ${station?.name ?? ""}`;
    retry.lang = messagesLanguage(retryKey);
    if (retry.hidden && focused === retry) document.querySelector("#player-stop").focus();
    else if (audio.hidden && focused === audio && !retry.hidden) retry.focus();
    const fallback = document.querySelector("#player-fallback");
    const href = station?.listening.page;
    fallback.hidden = !/^https?:\/\//i.test(href ?? "");
    if (!fallback.hidden) {
      fallback.href = href;
      fallback.ariaLabel = t("link.newTab", {
        text: `${t("listen")} · ${station.name}`,
      });
    }
    for (const button of stationsRoot.querySelectorAll('[data-action="play"]')) {
      const active = button.dataset.stationId === station?.id;
      const key = active && state === "playing"
        ? "player.pause"
        : active && state === "loading" ? "player.cancel" : "player.play";
      button.textContent = t(key);
      button.ariaLabel = `${t(key)} · ${stationsById.get(button.dataset.stationId).name}`;
      button.lang = messagesLanguage(key);
    }
    document.querySelector("#mini-station").textContent = station?.name ?? "";
    const compactKey = state === "playing" ? "player.pause"
      : state === "loading" ? "player.cancel"
      : "player.play";
    const compactToggle = document.querySelector("#mini-toggle");
    compactToggle.textContent = t(compactKey);
    compactToggle.ariaLabel = `${t(compactKey)} · ${station?.name ?? ""}`;
    compactToggle.lang = messagesLanguage(compactKey);
    document.querySelector("#mini-stop").ariaLabel = `${t("player.stop")} · ${station?.name ?? ""}`;
    scheduleCompactPlayer();
  }

  function expandPlayer() {
    document.querySelector("#player-title").focus({ preventScroll: true });
    playerPanel.scrollIntoView({ block: "center", behavior: "instant" });
  }

  function syncCompactPlayer() {
    const viewportHeight = Math.min(innerHeight, window.visualViewport?.height ?? innerHeight);
    const panel = playerPanel.getBoundingClientRect();
    const bar = miniPlayer.getBoundingClientRect();
    const active = selectedStation && !["idle", "stopped"].includes(playbackState);
    const offscreen = panel.bottom <= 0 || panel.top >= viewportHeight;
    const fits = bar.height <= viewportHeight * 0.12 && miniPlayer.scrollWidth <= miniPlayer.clientWidth;
    const show = Boolean(active && offscreen && fits);
    // Never leave focus inside a hidden bar after Stop or a viewport change.
    if (!show && miniPlayer.contains(document.activeElement)) {
      const visibleAction = [...stationsRoot.querySelectorAll('[data-action="play"]')].find((button) => {
        const rect = button.getBoundingClientRect();
        return button.getClientRects().length && rect.top >= 0 && rect.bottom <= viewportHeight;
      });
      if (visibleAction) visibleAction.focus({ preventScroll: true });
      else expandPlayer();
    }
    miniPlayer.toggleAttribute("data-visible", show);
    miniPlayer.inert = !show;
    document.documentElement.classList.toggle("has-mini-player", show);
    const focused = document.activeElement;
    if (show && focused !== document.body && !miniPlayer.contains(focused)) {
      const rect = focused.getBoundingClientRect();
      if (rect.bottom > bar.top && rect.top < viewportHeight && rect.bottom > 0) {
        focused.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    }
  }

  function scheduleCompactPlayer() {
    if (compactFrame) return;
    compactFrame = requestAnimationFrame(handleAction(() => {
      compactFrame = 0;
      syncCompactPlayer();
    }));
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
      rawFrequency.location_type ? t(`frequency.${rawFrequency.location_type}`) : null,
    ]);
  }

  function filterFrequencies(article) {
    const query = normalize(article.querySelector('[data-action="filter-frequencies"]').value).replaceAll(",", ".");
    const rows = [...field(article, "frequencies").children];
    for (const row of rows) row.hidden = !row.dataset.search.includes(query);
    const visible = rows.filter((row) => !row.hidden).length;
    field(article, "frequency-results").textContent = t("frequency.results", { visible: new Intl.NumberFormat(currentLocale()).format(visible), total: new Intl.NumberFormat(currentLocale()).format(rows.length) });
    field(article, "frequency-empty").hidden = visible !== 0;
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
    const verification = rawStation.frequency_verification;
    if (verification) {
      const date = (value) => new Intl.DateTimeFormat(currentLocale(), { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
      const context = field(article, "frequency-verification");
      context.hidden = false;
      context.textContent = t("frequency.checked", { updated: date(verification.source_updated), checked: date(verification.checked) });
      const note = field(article, "frequency-context");
      note.hidden = false;
      note.textContent = localize(verification.note);
    }
    const search = article.querySelector('[data-action="filter-frequencies"]');
    search.id = `${rawStation.id}-frequency-search`;
    search.ariaLabel = `${t("frequency.search")} · ${localize(rawStation.name)}`;
    field(article, "frequency-search-label").htmlFor = search.id;
    field(article, "frequency-search-tools").hidden = frequencies.length <= 8;
    for (const rawFrequency of frequencies) {
      const fragment = document
        .querySelector("#frequency-template")
        .content.cloneNode(true);
      translateDOM(fragment);
      const row = fragment.querySelector(".frequency");
      setFrequency(row, rawFrequency);
      const site = field(row, "frequency-site");
      site.hidden = !rawFrequency.licensed_site;
      if (!site.hidden) site.textContent = t("frequency.site", { site: localize(rawFrequency.licensed_site) });
      const note = field(row, "frequency-note");
      note.hidden = !rawFrequency.note;
      if (!note.hidden) note.textContent = localize(rawFrequency.note);
      fragment.querySelector("li").dataset.search = normalize([localize(rawFrequency.city.name), localize(rawFrequency.licensed_site ?? ""), rawFrequency.value, localize(rawFrequency.display), rawFrequency.band].join(" ")).replaceAll(",", ".");
      const copy = row.querySelector('[data-action="copy-frequency"]');
      copy.dataset.copy = rawFrequency.value ?? "";
      copy.hidden = !rawFrequency.value;
      copy.ariaLabel = t("copy.frequencyLocation", {
        city: localize(rawFrequency.city.name),
      });
      copy.lang = messagesLanguage("copy.frequencyLocation");
      field(article, "frequencies").append(fragment);
    }
    filterFrequencies(article);
  }

  function createStation(rawStation) {
    const station = localize(rawStation);
    stationsById.set(station.id, station);
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
            frequency.licensed_site ?? "",
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
    const play = article.querySelector('[data-action="play"]');
    play.dataset.stationId = station.id;
    play.ariaLabel = `${t("player.play")} · ${station.name}`;
    const support = player.support(station.listening.stream);
    if (support !== "native") {
      play.hidden = true;
      const listeningPage = field(article, "listen-page");
      if (listeningPage) listeningPage.classList.add("primary-action");
      const note = field(article, "playback-note");
      const key = support === "hls" ? "player.hls" : "player.external";
      note.textContent = t(key);
      note.lang = messagesLanguage(key);
      note.hidden = false;
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

  function sortedEntries(entries) {
    const collator = new Intl.Collator(currentLocale(), { sensitivity: "base", numeric: true });
    return [...entries].sort((a, b) => collator.compare(localize(a[1]), localize(b[1])));
  }

  function populateSelect(select, entries) {
    for (const [value, label, language] of sortedEntries(entries)) {
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
    populateLocations(catalog);
    populateSelect(
      filters.elements.category,
      Object.entries(catalog.categories),
    );
  }

  let locationCountry = "";

  function populateLocations(catalog) {
    const select = filters.elements.city;
    const previous = select.value;
    locationCountry = filters.elements.country.value;
    const groups = new Map();
    for (const station of catalog.stations) {
      const { country } = station;
      if (locationCountry && country.code !== locationCountry) continue;
      if (!groups.has(country.code)) groups.set(country.code, { country, cities: new Map() });
      const cities = groups.get(country.code).cities;
      for (const city of [station.city, ...frequenciesFor(station).map(
        (frequency) => ({ ...frequency.city, location_type: frequency.location_type }),
      )]) cities.set(city.slug, city);
    }
    select.replaceChildren(select.firstElementChild);
    const countries = sortedEntries([...groups].map(([code, group]) => [code, group.country.name]));
    for (const [code, name] of countries) {
      const group = document.createElement("optgroup");
      group.label = localize(name);
      group.lang = contentLanguage(name) ?? currentLocale();
      group.dir = "auto";
      populateSelect(group, [...groups.get(code).cities].map(([slug, city]) => [
        slug,
        `${localize(city.name)}${city.location_type ? ` (${t(`frequency.${city.location_type}`)})` : ""}`,
        contentLanguage(city.name),
      ]));
      select.append(group);
    }
    select.value = previous;
    if (select.selectedIndex === -1) select.value = "";
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
        article.dataset.modes.split(" ").includes(activeView);
      const visible =
        matchesSearch && matchesFields && matchesCategory && matchesView &&
        (!favoritesOnly || favorites.has(article.id));
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
    resetViews();
    render();
  }

  function resetViews() {
    activeView = "all";
    favoritesOnly = false;
    favoritesFilter.ariaPressed = "false";
    for (const button of viewButtons)
      button.ariaPressed = String(button.dataset.view === activeView);
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

  const filterNames = ["search", "country", "city", "category"];

  function restoreUrlFilters() {
    if (!catalogLoaded) return;
    const params = new URL(location.href).searchParams;
    for (const name of filterNames.filter((name) => name !== "city")) {
      const control = filters.elements[name];
      control.value = params.get(name) ?? "";
      // Unknown select values must behave like the unfiltered option.
      if (control.selectedIndex === -1) control.value = "";
    }
    populateLocations(catalog);
    filters.elements.city.value = params.get("city") ?? "";
    if (filters.elements.city.selectedIndex === -1) filters.elements.city.value = "";
    render();
  }

  function updateFilterUrl() {
    // Rebuild only when the country changes, preserving a compatible location.
    if (locationCountry !== filters.elements.country.value) populateLocations(catalog);
    // Filtering must remain usable when history updates are unavailable.
    render();
    try {
      const url = new URL(location.href);
      for (const name of filterNames) {
        const value = filters.elements[name].value;
        if (value) url.searchParams.set(name, value);
        else url.searchParams.delete(name);
      }
      if (url.href !== location.href) history.replaceState(history.state, "", url);
    } catch (error) {
      console.warn("Filter URL could not be updated.", error);
      notify(t("action.error"));
    }
  }

  filters.addEventListener("input", handleAction(updateFilterUrl));
  filters.addEventListener("submit", handleAction((event) => {
    event.preventDefault();
    updateFilterUrl();
  }));
  window.addEventListener("popstate", handleAction(restoreUrlFilters));
  function revealGuide() {
    if (["#guide-title", "#listening-guide"].includes(location.hash)) {
      document.querySelector("#listening-guide").open = true;
    }
  }
  document.querySelector('.page-nav a[href="#guide-title"]').addEventListener(
    "click", handleAction(() => { document.querySelector("#listening-guide").open = true; }),
  );
  window.addEventListener("hashchange", handleAction(revealGuide));
  revealGuide();
  filters.addEventListener(
    "reset",
    handleAction(() => {
      resetViews();
      requestAnimationFrame(handleAction(updateFilterUrl));
    }),
  );
  favoritesFilter.addEventListener("click", handleAction(() => {
    favoritesOnly = !favoritesOnly;
    favoritesFilter.ariaPressed = String(favoritesOnly);
    render();
  }));
  document.querySelector("#player-stop").addEventListener(
    "click", handleAction(() => player.stop()),
  );
  document.querySelector("#player-retry").addEventListener(
    "click", handleAction(async () => {
      if (selectedStation) await player.toggle(selectedStation);
    }),
  );
  document.querySelector("#mini-toggle").addEventListener("click", handleAction(async () => {
    if (selectedStation) await player.toggle(selectedStation);
  }));
  document.querySelector("#mini-stop").addEventListener("click", handleAction(() => player.stop()));
  document.querySelector("#mini-expand").addEventListener("click", handleAction((event) => {
    event.preventDefault();
    expandPlayer();
    scheduleCompactPlayer();
  }));
  for (const event of ["scroll", "resize"]) {
    window.addEventListener(event, handleAction(scheduleCompactPlayer), { passive: true });
  }
  window.visualViewport?.addEventListener("resize", handleAction(scheduleCompactPlayer), { passive: true });
  document.addEventListener("focusin", handleAction(scheduleCompactPlayer));
  // Observe text-size and content changes too, without measuring on every scroll tick.
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(handleAction(scheduleCompactPlayer));
    for (const node of [miniPlayer, playerPanel, document.documentElement]) observer.observe(node);
  }
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
      const play = event.target.closest('[data-action="play"]');
      if (play) {
        await player.toggle(stationsById.get(play.dataset.stationId));
        return;
      }
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
        if (favoritesOnly && !favorites.has(id)) favoritesFilter.focus();
        return;
      }
      const copy = event.target.closest("[data-copy]");
      if (copy) await copyText(copy.dataset.copy);
    }),
  );

  stationsRoot.addEventListener("input", handleAction((event) => {
    if (event.target.matches('[data-action="filter-frequencies"]')) filterFrequencies(event.target.closest(".station"));
  }));

  function refreshLocale() {
    if (!catalogLoaded) return;
    const values = new FormData(filters);
    const frequencyQueries = new Map([...stationsRoot.querySelectorAll(".station")].map((card) => [card.id, card.querySelector('[data-action="filter-frequencies"]').value]));
    const disclosures = new Map([...stationsRoot.querySelectorAll(".station")].map((article) => [
      article.id, [...article.querySelectorAll("details")].map((details) => details.open),
    ]));
    const focused = document.activeElement;
    const focusedCard = focused.closest(".station");
    const focusIndex = focusedCard
      ? [...focusedCard.querySelectorAll("a,button,summary,input")].indexOf(focused) : -1;
    // Only rebuild catalog nodes: the shared audio and player containers stay mounted.
    const cards = catalog.stations.map(createStation);
    stationsRoot.replaceChildren(...cards);
    for (const name of ["country", "city", "category"]) {
      const select = filters.elements[name];
      select.replaceChildren(select.firstElementChild);
    }
    populateFilters(catalog);
    for (const [name, value] of values) {
      if (name !== "city") filters.elements[name].value = value;
    }
    populateLocations(catalog);
    filters.elements.city.value = values.get("city");
    if (filters.elements.city.selectedIndex === -1) filters.elements.city.value = "";
    for (const article of stationsRoot.querySelectorAll(".station")) {
      article.querySelector('[data-action="filter-frequencies"]').value = frequencyQueries.get(article.id) ?? "";
      filterFrequencies(article);
      article.querySelectorAll("details").forEach((details, index) => {
        details.open = disclosures.get(article.id)?.[index] ?? false;
      });
    }
    document.querySelector("#mini-expand").ariaLabel = t("player.expandLabel");
    if (selectedStation) {
      updatePlayer({ station: stationsById.get(selectedStation.id), state: playbackState });
    }
    render();
    if (focusIndex >= 0) {
      const card = document.getElementById(focusedCard.id);
      const target = card.querySelectorAll("a,button,summary,input")[focusIndex];
      if (target?.getClientRects().length) target.focus({ preventScroll: true });
      else filters.elements.search.focus({ preventScroll: true });
    }
    clearTimeout(toastTimer);
    toast.hidden = true;
    scheduleCompactPlayer();
  }

  await initI18n({ onChange: refreshLocale });
  document.querySelector("#mini-expand").ariaLabel = t("player.expandLabel");
  const response = await fetch("radios.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const catalog = await response.json();
  stationsRoot.replaceChildren(...catalog.stations.map(createStation));
  populateFilters(catalog);
  stationsRoot.ariaBusy = "false";
  catalogLoaded = true;
  restoreUrlFilters();
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
