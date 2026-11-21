// UndaSDR station-list compatibility, implemented from its documented JSON shape.
// No SDR, DSP or desktop application code is used here.
const frequencies = (station) =>
  station.frequencies ?? [{ ...station.frequency, city: station.city }];
const names = (station) =>
  typeof station.name === "string"
    ? [station.name]
    : Object.values(station.name);
const normalizeName = (name) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
const fm = (frequency) =>
  frequency.band.endsWith("FM") &&
  Number(frequency.value) >= 87.5 &&
  Number(frequency.value) <= 108;
const sameFrequency = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;

export function parseStationList(text) {
  if (text.length > 1048576) throw new RangeError("Station list is too large.");
  const config = JSON.parse(text);
  if (
    !config ||
    !Array.isArray(config.stations) ||
    config.stations.length > 1000
  )
    throw new TypeError("Expected an UndaSDR stations list.");
  const seen = new Set();
  return config.stations.map((entry) => {
    if (
      !entry ||
      typeof entry.f !== "number" ||
      !Number.isFinite(entry.f) ||
      entry.f < 87.5 ||
      entry.f > 108 ||
      (entry.n !== undefined && typeof entry.n !== "string") ||
      (entry.n?.length ?? 0) > 200
    )
      throw new TypeError("Invalid FM station entry.");
    const frequency = Math.round(entry.f * 100) / 100;
    if (seen.has(frequency)) throw new TypeError("Duplicate FM frequency.");
    seen.add(frequency);
    return { f: frequency, n: (entry.n ?? "").trim() };
  });
}

export function matchStationList(entries, stations, city = "") {
  return entries.map((entry) => {
    const candidates = stations.filter((station) =>
      frequencies(station).some(
        (frequency) =>
          fm(frequency) &&
          (!city || frequency.city.slug === city) &&
          sameFrequency(frequency.value, entry.f),
      ),
    );
    const exact = candidates.filter((station) =>
      names(station).some(
        (name) => normalizeName(name) === normalizeName(entry.n),
      ),
    );
    return {
      entry,
      candidates,
      matchId: exact.length === 1 ? exact[0].id : "",
    };
  });
}

export function exportStationList(stations, favorites, city, locale = "en") {
  const byFrequency = new Map();
  if (city)
    for (const station of stations) {
      if (!favorites.has(station.id)) continue;
      for (const frequency of frequencies(station)) {
        if (!fm(frequency) || frequency.city.slug !== city) continue;
        const f = Math.round(Number(frequency.value) * 100) / 100;
        if (!byFrequency.has(f)) byFrequency.set(f, new Map());
        const n =
          typeof station.name === "string"
            ? station.name
            : (station.name[locale] ?? station.name.en);
        byFrequency.get(f).set(station.id, { f, n });
      }
    }
  const conflicts = [...byFrequency]
    .filter(([, records]) => records.size > 1)
    .map(([f]) => f)
    .sort((a, b) => a - b);
  const records = [...byFrequency.values()]
    .filter((group) => group.size === 1)
    .map((group) => [...group.values()][0])
    .sort((a, b) => a.f - b.f);
  return { stations: records, conflicts };
}
