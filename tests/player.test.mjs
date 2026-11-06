import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../player.js", import.meta.url), "utf8");
const { createPlayer, playbackSupport } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const station = (id) => ({ id, name: id, listening: { stream: `https://radio.example/${id}.mp3` } });

class Audio extends EventTarget {
  paused = true;
  error = null;
  src = "";
  requests = [];
  canPlayType() { return ""; }
  getAttribute() { return this.src || null; }
  removeAttribute() { this.src = ""; }
  load() { this.error = null; }
  pause() { this.paused = true; this.dispatchEvent(new Event("pause")); }
  play() {
    this.paused = false;
    return new Promise((resolve, reject) => this.requests.push({ resolve, reject }));
  }
}

test("HTTP, invalid URLs and unsupported HLS use an external listening fallback", () => {
  const audio = new Audio();
  assert.equal(playbackSupport("http://radio.example/live", audio), "external");
  assert.equal(playbackSupport("javascript:alert(1)", audio), "external");
  assert.equal(playbackSupport("https://user:password@radio.example/live", audio), "external");
  assert.equal(playbackSupport("not a URL", audio), "external");
  assert.equal(playbackSupport("https://radio.example/live.pls", audio), "external");
  assert.equal(playbackSupport("https://radio.example/live.m3u8?token=abc", audio), "hls");
  audio.canPlayType = () => "maybe";
  assert.equal(playbackSupport("https://radio.example/live.m3u8", audio), "native");
});

test("no source is loaded before a user starts playback; stop releases the stream", async () => {
  const audio = new Audio();
  const changes = [];
  const player = createPlayer(audio, (value) => changes.push(value));
  assert.equal(audio.src, "");
  assert.equal(changes.length, 0);
  const pending = player.toggle(station("first"));
  assert.equal(audio.src, "https://radio.example/first.mp3");
  assert.equal(changes.at(-1).state, "loading");
  audio.dispatchEvent(new Event("playing"));
  assert.equal(changes.at(-1).state, "playing");
  audio.requests[0].resolve();
  await pending;
  player.stop();
  assert.equal(audio.src, "");
  assert.equal(audio.paused, true);
  assert.equal(changes.at(-1).state, "stopped");
});

test("rapid station switching ignores a rejected promise from the previous stream", async () => {
  const audio = new Audio();
  let latest;
  const player = createPlayer(audio, (value) => { latest = value; });
  const first = player.toggle(station("first"));
  const second = player.toggle(station("second"));
  audio.requests[0].reject(new Error("old stream failed"));
  await first;
  assert.equal(latest.station.id, "second");
  assert.equal(latest.state, "loading");
  assert.equal(audio.src, "https://radio.example/second.mp3");
  audio.dispatchEvent(new Event("playing"));
  audio.requests[1].resolve();
  await second;
  assert.equal(latest.state, "playing");
  player.stop();
});

test("cancelling a pending stream and late media errors cannot restart stopped audio", async () => {
  const audio = new Audio();
  let latest;
  const player = createPlayer(audio, (value) => { latest = value; });
  const pending = player.toggle(station("first"));
  await player.toggle(station("first"));
  audio.requests[0].reject(Object.assign(new Error("cancelled"), { name: "AbortError" }));
  await pending;
  assert.equal(latest.state, "paused");
  assert.equal(audio.src, "");
  player.stop();
  audio.error = { code: 4 };
  audio.dispatchEvent(new Event("error"));
  assert.equal(latest.state, "stopped");
});

test("native pause and resume update state; a stalled connection times out and releases audio", async () => {
  const audio = new Audio();
  let latest;
  const player = createPlayer(audio, (value) => { latest = value; }, { timeout: 20 });
  const pending = player.toggle(station("first"));
  audio.dispatchEvent(new Event("playing"));
  audio.requests[0].resolve();
  await pending;
  audio.pause();
  assert.equal(latest.state, "paused");
  audio.paused = false;
  audio.dispatchEvent(new Event("play"));
  audio.dispatchEvent(new Event("playing"));
  assert.equal(latest.state, "playing");
  audio.dispatchEvent(new Event("waiting"));
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(latest.state, "error");
  assert.equal(audio.src, "");
  assert.equal(audio.paused, true);
});
