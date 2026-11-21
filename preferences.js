// Store only stable station IDs and audio settings, never stream addresses.
const KEY = "radio-atlas:listening";
const defaults = () => ({
  version: 1,
  stationId: null,
  volume: 1,
  muted: false,
});

function validate(value) {
  if (
    !value ||
    value.version !== 1 ||
    !(value.stationId === null || typeof value.stationId === "string") ||
    typeof value.volume !== "number" ||
    !Number.isFinite(value.volume) ||
    value.volume < 0 ||
    value.volume > 1 ||
    typeof value.muted !== "boolean"
  ) {
    throw new TypeError("Invalid listening preferences.");
  }
  return {
    version: 1,
    stationId: value.stationId,
    volume: value.volume,
    muted: value.muted,
  };
}

export function readPreferences(storage) {
  const stored = storage.getItem(KEY);
  return stored === null ? defaults() : validate(JSON.parse(stored));
}

export function writePreferences(storage, settings) {
  storage.setItem(KEY, JSON.stringify(validate({ ...settings, version: 1 })));
}
