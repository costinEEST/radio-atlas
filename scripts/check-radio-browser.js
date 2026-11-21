// Run this function in a Chrome MCP evaluate_script call on an HTTP(S) page.
// It returns immediately. Poll window.radioStationAudit until done is true.
// Source this file as a function expression and pass the HTTP report's stations.
(stations, { timeoutMs = 16000, attempts = 2, concurrency = 3 } = {}) => {
  if (!Array.isArray(stations) || !stations.length)
    throw new TypeError("Provide a nonempty station array.");
  if (
    ![timeoutMs, attempts, concurrency].every(
      (value) => Number.isInteger(value) && value > 0,
    )
  )
    throw new RangeError(
      "Timeout, attempts and concurrency must be positive integers.",
    );
  if (window.radioStationAudit && !window.radioStationAudit.done)
    throw new Error("An audit is already running in this tab.");
  const audit = (window.radioStationAudit = {
    startedAt: new Date().toISOString(),
    pageUrl: location.href,
    timeoutMs,
    attempts,
    concurrency,
    done: false,
    userAgent: navigator.userAgent,
    nativeHls: document
      .createElement("audio")
      .canPlayType("application/vnd.apple.mpegurl"),
    results: [],
  });
  async function check(station) {
    if (!station.stream)
      return {
        original_id: station.original_id,
        current_id: station.current_id,
        stream: null,
        runs: [],
        advancing: false,
        skipped: "No stream URL; inspect the listening page.",
      };
    const runs = [];
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const audio = document.createElement("audio");
      audio.muted = true;
      audio.preload = "none";
      document.body.append(audio);
      const run = {
        attempt,
        advancing: false,
        playingEvent: false,
        playResolved: false,
        error: null,
        samples: [],
      };
      audio.addEventListener("playing", () => {
        run.playingEvent = true;
      });
      let probing = true;
      try {
        audio.src = station.stream;
        audio
          .play()
          .then(() => {
            run.playResolved = true;
          })
          .catch((error) => {
            if (probing)
              run.error = { name: error.name, message: error.message };
          });
        const start = performance.now();
        let previous = null;
        while (performance.now() - start < timeoutMs) {
          await new Promise((resolve) => setTimeout(resolve, 750));
          run.samples.push({
            elapsedMs: Math.round(performance.now() - start),
            time: audio.currentTime,
            readyState: audio.readyState,
            paused: audio.paused,
          });
          if (
            previous !== null &&
            !audio.paused &&
            audio.currentTime - previous > 0.25 &&
            run.playingEvent
          ) {
            run.advancing = true;
            break;
          }
          previous = audio.currentTime;
          if (audio.error) {
            run.mediaError = {
              code: audio.error.code,
              message: audio.error.message,
            };
            break;
          }
          if (run.error) break;
        }
        run.timedOut = !run.advancing && !run.error && !audio.error;
      } catch (error) {
        run.error = { name: error.name, message: error.message };
      } finally {
        probing = false;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audio.remove();
      }
      runs.push(run);
      if (run.advancing) break;
    }
    return {
      original_id: station.original_id,
      current_id: station.current_id,
      stream: station.stream,
      runs,
      advancing: runs.some((run) => run.advancing),
    };
  }
  let index = 0;
  async function worker() {
    while (index < stations.length) {
      const station = stations[index++];
      audit.results.push(await check(station));
    }
  }
  Promise.all(Array.from({ length: concurrency }, worker))
    .then(() => {
      audit.done = true;
      audit.finishedAt = new Date().toISOString();
    })
    .catch((error) => {
      audit.done = true;
      audit.fatalError = String(error);
    });
  return {
    started: stations.length,
    timeoutMs,
    attempts,
    concurrency,
    nativeHls: audit.nativeHls,
  };
};
