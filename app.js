const filters = document.querySelector("#filters");
const stationsRoot = document.querySelector("#stations");
const template = document.querySelector("#station-template");
const emptyState = document.querySelector("#empty-state");
const resultCount = document.querySelector("#result-count");
const toast = document.querySelector("#toast");
const viewButtons = [...document.querySelectorAll("[data-view]")];
const favorites = readFavorites();
let activeView = "all";
let toastTimer;

const normalize = (value) => String(value).normalize("NFD").replaceAll(/\p{Diacritic}/gu, "").toLocaleLowerCase("ro");
const field = (root, name) => root.querySelector(`[data-field="${name}"]`);

function readFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem("radio-atlas:favorites") ?? "[]")); }
  catch { return new Set(); }
}

function saveFavorites() {
  try { localStorage.setItem("radio-atlas:favorites", JSON.stringify([...favorites])); }
  catch { notify("Preferința nu a putut fi salvată pe acest dispozitiv."); }
}

function setLink(link, href, text) {
  link.href = href;
  link.textContent = text;
  link.ariaLabel = `${text} — se deschide într-o filă nouă`;
}

function appendContact(address, station) {
  address.append(station.contact.address, document.createElement("br"));
  station.contact.phones.forEach((phone, index) => {
    if (index) address.append(" · ");
    const link = document.createElement("a");
    link.href = `tel:${phone.value}`;
    link.textContent = phone.display;
    address.append(link);
  });
  const email = document.createElement("a");
  email.href = `mailto:${station.contact.email}`;
  email.textContent = station.contact.email;
  address.append(document.createElement("br"), email);
}

function updateFavorite(button, name) {
  const selected = favorites.has(button.dataset.stationId);
  button.querySelector("span").textContent = selected ? "★" : "☆";
  button.ariaPressed = String(selected);
  button.ariaLabel = selected ? `Elimină ${name} din favorite` : `Adaugă ${name} la favorite`;
}

function createStation(station) {
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector(".station");
  Object.assign(article.dataset, {
    country: station.country.code,
    city: station.city.slug,
    categories: station.categories.join(" "),
    modes: station.modes.join(" "),
    search: normalize([station.name, station.city.name, station.country.name, station.county, station.description, station.frequency.value, station.frequency.display, station.tags, station.recommendation?.name ?? ""].join(" ")),
  });
  article.id = station.id;

  const values = {
    mark: station.mark,
    name: station.name,
    location: `${station.city.name} · ${station.country.name}`,
    description: station.description,
    frequency: station.frequency.display,
    band: station.frequency.band,
    "frequency-location": `${station.city.name} · ${station.county}`,
    programming: station.programming,
    "stream-url": station.listening.stream,
    "stream-note": station.listening.stream_note,
    history: `Prima emisie: ${station.history.first_broadcast}. Operator: ${station.history.operator}.`,
    verified: `Date reverificate la ${station.verified}.`,
  };
  for (const [name, value] of Object.entries(values)) field(article, name).textContent = value;
  if ([...station.mark].length > 2) field(article, "mark").dataset.compact = "";

  for (const tag of station.tags) {
    const item = document.createElement("li");
    item.textContent = tag;
    field(article, "tags").append(item);
  }

  const recommendation = field(article, "recommended-by");
  if (station.recommendation) setLink(recommendation, station.recommendation.url, station.recommendation.name);
  else recommendation.closest(".recommendation").remove();
  setLink(field(article, "stream"), station.listening.stream, "Deschide fluxul direct");
  setLink(field(article, "listen-page"), station.listening.page, "Ascultă pe MyRadioOnline");
  setLink(field(article, "official"), station.listening.official, "Site oficial");
  appendContact(field(article, "contact"), station);

  for (const source of station.sources) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    setLink(link, source.url, source.label);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    item.append(link);
    field(article, "sources").append(item);
  }

  const favorite = article.querySelector(".favorite");
  favorite.dataset.stationId = station.id;
  updateFavorite(favorite, station.name);
  article.querySelector('[data-action="copy-frequency"]').dataset.copy = station.frequency.value;
  article.querySelector('[data-action="copy-stream"]').dataset.copy = station.listening.stream;
  return fragment;
}

function populateSelect(select, entries) {
  for (const [value, label] of entries) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
}

function populateFilters(catalog) {
  populateSelect(filters.elements.country, new Map(catalog.stations.map((station) => [station.country.code, station.country.name])));
  populateSelect(filters.elements.city, new Map(catalog.stations.map((station) => [station.city.slug, station.city.name])));
  populateSelect(filters.elements.category, Object.entries(catalog.categories));
}

function render() {
  const data = new FormData(filters);
  const words = normalize(data.get("search").trim()).split(/\s+/).filter(Boolean);
  let count = 0;
  for (const article of stationsRoot.querySelectorAll(".station")) {
    const matchesSearch = words.every((word) => article.dataset.search.includes(word));
    const matchesFields = ["country", "city"].every((name) => !data.get(name) || article.dataset[name] === data.get(name));
    const matchesCategory = !data.get("category") || article.dataset.categories.split(" ").includes(data.get("category"));
    const matchesView = activeView === "all" || (activeView === "favorites" ? favorites.has(article.id) : article.dataset.modes.split(" ").includes(activeView));
    const visible = matchesSearch && matchesFields && matchesCategory && matchesView;
    article.closest(".station-item").hidden = !visible;
    if (visible) count += 1;
  }
  emptyState.hidden = count !== 0;
  resultCount.textContent = count === 1 ? "1 post" : `${count} posturi`;
}

function resetAll() {
  filters.reset();
  activeView = "all";
  for (const button of viewButtons) button.ariaPressed = String(button.dataset.view === activeView);
  render();
}

function notify(message) {
  clearTimeout(toastTimer);
  toast.value = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); notify(`Copiat: ${text}`); }
  catch { window.prompt("Copiază textul:", text); }
}

filters.addEventListener("input", render);
filters.addEventListener("reset", () => queueMicrotask(render));
document.querySelector("#show-all").addEventListener("click", resetAll);
for (const button of viewButtons) button.addEventListener("click", () => {
  activeView = button.dataset.view;
  for (const item of viewButtons) item.ariaPressed = String(item === button);
  render();
});

stationsRoot.addEventListener("click", (event) => {
  const favorite = event.target.closest(".favorite");
  if (favorite) {
    const id = favorite.dataset.stationId;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    saveFavorites();
    updateFavorite(favorite, field(favorite.closest(".station"), "name").textContent);
    render();
    return;
  }
  const copy = event.target.closest("[data-copy]");
  if (copy) copyText(copy.dataset.copy);
});

try {
  const response = await fetch("radios.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const catalog = await response.json();
  stationsRoot.replaceChildren(...catalog.stations.map(createStation));
  populateFilters(catalog);
  stationsRoot.ariaBusy = "false";
  render();
} catch (error) {
  console.error("Catalogul nu a putut fi încărcat.", error);
  stationsRoot.ariaBusy = "false";
  stationsRoot.textContent = "Catalogul nu a putut fi încărcat. Reîncearcă mai târziu.";
  resultCount.textContent = "Catalog indisponibil";
}
