// A single, user-started stream. The sequence number ignores obsolete play promises.
export function playbackSupport(stream, audio) {
  try {
    const url = new URL(stream);
    if (url.protocol !== "https:" || url.username || url.password) return "external";
    if (/\.(m3u|pls)$/i.test(url.pathname)) return "external";
    if (/\.m3u8$/i.test(url.pathname) && !audio.canPlayType("application/vnd.apple.mpegurl")) return "hls";
    return "native";
  } catch { return "external"; }
}

export function createPlayer(audio, onChange, { timeout = 20000 } = {}) {
  let station = null;
  let state = "idle";
  let sequence = 0;
  let timer;
  const publish = (next) => {
    state = next;
    onChange({ station, state });
  };
  const clearTimer = () => clearTimeout(timer);
  function release() {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  function fail() {
    ++sequence;
    clearTimer();
    publish("error");
    release();
  }
  function loading() {
    clearTimer();
    publish("loading");
    timer = setTimeout(() => {
      try { if (state === "loading") fail(); }
      catch (error) { console.error("Player timeout recovery failed.", error); }
    }, timeout);
  }
  function listen(event, callback) {
    audio.addEventListener(event, () => {
      try { if (station && !["error", "stopped"].includes(state)) callback(); }
      catch (error) {
        console.error("Player event failed.", error);
        try { fail(); } catch (recoveryError) { console.error("Player recovery failed.", recoveryError); }
      }
    });
  }
  listen("playing", () => {
    if (!audio.paused) { clearTimer(); publish("playing"); }
  });
  listen("pause", () => {
    if (audio.paused) { clearTimer(); publish("paused"); }
  });
  for (const event of ["waiting", "stalled"]) listen(event, () => {
    if (!audio.paused) loading();
  });
  listen("error", () => { if (audio.error) fail(); });
  listen("ended", () => { clearTimer(); publish("paused"); });
  // Native controls can resume the selected stream as well as card buttons.
  listen("play", () => { if (!audio.paused) loading(); });

  return {
    support: (stream) => playbackSupport(stream, audio),
    async toggle(next) {
      const request = ++sequence;
      clearTimer();
      try {
        if (station?.id === next.id && ["playing", "loading"].includes(state)) {
          if (state === "loading") { publish("paused"); release(); }
          else { audio.pause(); publish("paused"); }
          return;
        }
        if (playbackSupport(next.listening.stream, audio) !== "native") {
          throw new Error("This stream needs an external player.");
        }
        // Stop the old source before changing the station, including failed loads.
        if (station?.id !== next.id || !audio.getAttribute("src")) {
          release();
          station = next;
          audio.src = next.listening.stream;
        }
        loading();
        await audio.play();
        // The playing event, rather than promise resolution alone, confirms playback.
      } catch (error) {
        if (request !== sequence) return;
        if (error.name === "AbortError" && audio.paused) publish("paused");
        else { console.warn("Stream playback failed.", error); fail(); }
      }
    },
    stop() {
      ++sequence;
      clearTimer();
      publish("stopped");
      release();
    },
  };
}
