import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../preferences.js", import.meta.url),
  "utf8",
);
const { readPreferences, writePreferences } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

test("listening preferences round trip stable IDs and audio settings without stream URLs", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.deepEqual(readPreferences(storage), {
    version: 1,
    stationId: null,
    volume: 1,
    muted: false,
  });
  writePreferences(storage, {
    stationId: "rock",
    volume: 0.25,
    muted: true,
    stream: "https://example.test/live",
  });
  assert.deepEqual(readPreferences(storage), {
    version: 1,
    stationId: "rock",
    volume: 0.25,
    muted: true,
  });
  assert.ok(![...values.values()][0].includes("https:"));
});

test("malformed, unsupported and out-of-range preferences reach the recovery boundary", () => {
  for (const data of [
    "{",
    "null",
    "[]",
    '{"version":99}',
    JSON.stringify({ version: 1, stationId: {}, volume: 1, muted: false }),
    JSON.stringify({ version: 1, stationId: "rock", volume: -1, muted: false }),
    JSON.stringify({ version: 1, stationId: "rock", volume: 2, muted: false }),
    JSON.stringify({
      version: 1,
      stationId: "rock",
      volume: "0.5",
      muted: false,
    }),
    JSON.stringify({
      version: 1,
      stationId: "rock",
      volume: 0.5,
      muted: "false",
    }),
  ]) {
    assert.throws(() => readPreferences({ getItem: () => data }));
  }
  assert.throws(
    () =>
      readPreferences({
        getItem() {
          throw new Error("denied");
        },
      }),
    /denied/,
  );
  assert.throws(
    () =>
      writePreferences(
        {
          setItem() {
            throw new Error("quota");
          },
        },
        { stationId: null, volume: 1, muted: false },
      ),
    /quota/,
  );
});
