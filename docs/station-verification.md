# Station playback verification

Audit the stations introduced by a commit before changing the catalog. Keep HTTP reachability, browser playback and external listening separate: a successful HTTP response or HLS playlist does not prove that audio plays.

## Repeat the checks

Use the [station verification reference](../.agents/skills/maintain-radio-atlas/references/station-verification.md) in the maintenance skill for individual stations, the full catalog, or stations added by any commit. Reports and generated browser expressions belong in a temporary directory unless explicitly requested as deliverables.

## Results on 21 November 2026

Commit `23fdbf56340aca697f270b11e3f2c8a4b4b2214f` added 16 stations. All 16 were still present under current or renamed IDs before this audit. After checking all streams, retain 14 and remove 2. The overall catalog changes from 31 to 29 stations.

| Current ID          | Station                   | Browser result and action                                                                                                                                                                             |
| ------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saudi-quran`       | Saudi Quran Radio         | Advancing audio from HTTP and HTTPS audit pages; retain.                                                                                                                                              |
| `holy-quran-cairo`  | Holy Quran Radio Cairo    | Advancing audio from both origins; retain. Curl's redirect reached HTTP, so keep browser compatibility distinct from the HTTP probe.                                                                  |
| `sharjah-quran`     | Sharjah Quran Radio       | Advancing audio from both origins; retain.                                                                                                                                                            |
| `bahrain-quran`     | Bahrain Quran Radio 106.1 | Advancing native HLS audio from both origins; retain.                                                                                                                                                 |
| `jordan-quran`      | Jordan Quran Radio        | Playlist and a sampled segment download, but both origins stayed at time 0 and readyState 0 for two attempts. The provided listening page used the same stream and also stayed at time 0. Remove.     |
| `algerian-quran`    | Algerian Quran Radio      | Advancing audio from both origins; retain.                                                                                                                                                            |
| `sout-ul-quran`     | Sout-ul-Quran 93.4        | Advancing audio from both origins; retain.                                                                                                                                                            |
| `oman-quran`        | Oman Quran Radio          | Advancing native HLS audio from both origins; retain.                                                                                                                                                 |
| `quran-beirut`      | Quran Radio 93.3          | Advancing audio from both origins; retain.                                                                                                                                                            |
| `irtiqaa-way-quran` | Irtiqaa Way Quran         | Advancing audio from both origins; retain.                                                                                                                                                            |
| `nablus-quran`      | Nablus Quran Radio        | Old HTTP source rejected twice. Official page supplies a working HTTPS source, verified there, from the HTTPS audit page, and through Radio Atlas's shared player. Retain and correct the stream.     |
| `almunir-benghazi`  | Almunir Radio Benghazi    | Advancing audio from both origins; retain.                                                                                                                                                            |
| `almunir-tripoli`   | Almunir Radio Tripoli     | Advancing audio from both origins; retain.                                                                                                                                                            |
| `peaceradio-quran`  | PeaceRadio Quran          | HTTP source advances from the local HTTP page and in a direct browser media tab, but fails when embedded in HTTPS. Retain as external-only; point the listening link directly to the verified stream. |
| `sayang-quran`      | Radio Sayang Quran        | Both configured URLs fail DNS resolution. Browser stream attempts fail twice and the listening page reports `ERR_NAME_NOT_RESOLVED`. Remove.                                                          |
| `al-husnaa-quran`   | Al Husnaa Quran Radio     | Advancing audio from both origins; retain.                                                                                                                                                            |

Nablus's replacement comes from the source element of [its official listening page](https://quran-radio.com/): `https://quran-radio.org:8080/;?type=http&nocache=29`. Its official player advanced beyond one minute, the HTTPS-origin recheck advanced from 0 to 0.657448 seconds, and Radio Atlas's shared player later reached 30.454157 seconds while playing. Only the stream URL and bilingual listening note change; station facts are not re-dated.

PeaceRadio's direct HTTP browser media tab advanced from 12.014597 to 25.110435 seconds while unpaused, with readyState 4 and no media error. [Its official homepage](https://www.peaceradio.com/) links to a desktop player whose HTTP navigation was blocked by the test browser and whose HTTPS version failed certificate validation. The catalog's listening action now opens the confirmed direct HTTP stream; the official website remains separately linked. It remains unavailable for playback inside the HTTPS page.

Jordan's provided [listening page](https://surahquran.com/Radio-Quran-Jordan.html) rendered after the navigation timeout and exposed the same native audio source. A later playback check still showed time 0, readyState 0 and the connecting status. A downloaded TS segment contained H.264 video and AAC audio according to ffprobe; downloading that segment did not establish playable browser radio. Removal records this browser failure, not a claim that the broadcaster has stopped operating.

## Evidence retention

The temporary audit JSON files were deleted after the review. The findings above preserve the decisions and material playback observations; rerun the scripts for current availability. The tested browser reported native HLS support as `maybe`, so other browsers may require an external listening page.
