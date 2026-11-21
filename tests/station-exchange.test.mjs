import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../station-exchange.js", import.meta.url),
  "utf8",
);
const { parseStationList, matchStationList, exportStationList } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const frequency = (value, city = "city-a", band = "MHz FM") => ({
  value: String(value),
  band,
  city: { slug: city },
});
const stations = [
  {
    id: "one",
    name: { en: "Radio One", ro: "Rádio Unu" },
    frequencies: [frequency(90.1), frequency(95, "city-b"), frequency(90.1)],
  },
  {
    id: "two",
    name: { en: "Radio Two", ro: "Radio Doi" },
    frequencies: [frequency(90.1, "city-b"), frequency(94.5)],
  },
  {
    id: "am",
    name: { en: "AM" },
    frequencies: [frequency(100, "city-a", "kHz AM")],
  },
  { id: "outside", name: { en: "Outside" }, frequencies: [frequency(80)] },
];

test("read UndaSDR full configuration and station-only files without importing other settings", () => {
  assert.deepEqual(
    parseStationList(
      JSON.stringify({
        volume: 10,
        stations: [{ f: 90.1, n: " Radio One " }, { f: 94.5 }],
      }),
    ),
    [
      { f: 90.1, n: "Radio One" },
      { f: 94.5, n: "" },
    ],
  );
  assert.deepEqual(parseStationList('{"stations":[]}'), []);
});

test("reject malformed, oversized, duplicate and out-of-band imported lists", () => {
  for (const input of [
    "{",
    "null",
    "[]",
    "{}",
    '{"stations":{}}',
    JSON.stringify({ stations: [{ f: "90.1", n: "Radio One" }] }),
    JSON.stringify({ stations: [{ f: 90.1, n: {} }] }),
    JSON.stringify({ stations: [{ f: 86 }] }),
    JSON.stringify({ stations: [{ f: 109 }] }),
    JSON.stringify({ stations: [{ f: 90.1 }, { f: 90.1 }] }),
    JSON.stringify({ stations: [{ f: 90.1, n: "a".repeat(201) }] }),
    JSON.stringify({
      stations: Array.from({ length: 1001 }, () => ({ f: 90 })),
    }),
    " ".repeat(1048577),
  ])
    assert.throws(() => parseStationList(input));
});

test("match names across locales but require manual review for frequency-only and ambiguous matches", () => {
  const entries = [
    { f: 90.1, n: "radio unu" },
    { f: 94.5, n: "Custom name" },
    { f: 87.5, n: "Unknown" },
  ];
  const matched = matchStationList(entries, stations);
  assert.equal(matched[0].matchId, "one");
  assert.equal(matched[0].candidates.length, 2);
  assert.equal(matched[1].matchId, "");
  assert.equal(matched[1].candidates[0].id, "two");
  assert.equal(matched[2].candidates.length, 0);
  assert.equal(
    matchStationList(entries, stations, "city-a")[0].candidates.length,
    1,
  );
  assert.equal(
    matchStationList(entries, [
      ...stations,
      { ...stations[0], id: "duplicate" },
    ])[0].matchId,
    "",
  );
});

test("export local favorite FM frequencies only, deduplicate and round-trip to UndaSDR", () => {
  const favorites = new Set(stations.map((station) => station.id));
  const result = exportStationList(stations, favorites, "city-a", "ro");
  assert.deepEqual(result, {
    stations: [
      { f: 90.1, n: "Rádio Unu" },
      { f: 94.5, n: "Radio Doi" },
    ],
    conflicts: [],
  });
  assert.deepEqual(
    parseStationList(JSON.stringify({ stations: result.stations })),
    result.stations,
  );
  assert.deepEqual(exportStationList(stations, favorites, ""), {
    stations: [],
    conflicts: [],
  });
  assert.deepEqual(exportStationList(stations, new Set(), "city-a"), {
    stations: [],
    conflicts: [],
  });
  assert.deepEqual(
    exportStationList(stations, new Set(["one"]), "city-b").stations,
    [{ f: 95, n: "Radio One" }],
  );
});

test("expose frequency collisions rather than overwrite an UndaSDR preset", () => {
  const duplicate = {
    id: "duplicate",
    name: { en: "Other service" },
    frequencies: [frequency(90.1)],
  };
  const result = exportStationList(
    [...stations, duplicate],
    new Set(["one", "duplicate"]),
    "city-a",
  );
  assert.deepEqual(result, { stations: [], conflicts: [90.1] });
});
