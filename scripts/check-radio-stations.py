#!/usr/bin/env python3
"""Check selected, all, or commit-added stations without changing the catalog."""

import argparse
import concurrent.futures
import datetime
import json
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]


def added_stations(commit):
    def catalog(revision):
        return json.loads(
            subprocess.check_output(
                ["git", "show", f"{revision}:radios.json"], cwd=ROOT
            )
        )["stations"]

    old = {station["id"] for station in catalog(commit + "^")}
    return [station for station in catalog(commit) if station["id"] not in old]


def probe(url, timeout):
    if not url:
        return None
    with tempfile.TemporaryDirectory(prefix="radio-audit-") as directory:
        body = Path(directory) / "body"
        command = [
            "curl",
            "--silent",
            "--show-error",
            "--location",
            "--max-redirs",
            "5",
            "--connect-timeout",
            str(min(8, timeout)),
            "--max-time",
            str(timeout),
            "--range",
            "0-16383",
            "--max-filesize",
            "262144",
            "--output",
            str(body),
            "--write-out",
            "%{json}",
            url,
        ]
        result = subprocess.run(command, check=False, capture_output=True, text=True)
        try:
            info = json.loads(result.stdout)
        except json.JSONDecodeError:
            info = {}
        data = body.read_bytes() if body.exists() else b""
        final_url = info.get("url_effective")
        # Redirects may contain short-lived CDN signatures.
        # Do not archive their query strings.
        redacted = bool(final_url and final_url != url and urlsplit(final_url).query)
        if redacted:
            final_url = urlunsplit(urlsplit(final_url)._replace(query=""))
        return {
            "url": url,
            "final_url": final_url,
            "redirect_query_omitted": redacted,
            "status": info.get("http_code"),
            "content_type": info.get("content_type"),
            "bytes_received": len(data),
            "elapsed_seconds": info.get("time_total"),
            "curl_exit": result.returncode,
            "error": result.stderr.strip() or None,
            "looks_like_hls": data.lstrip().startswith(b"#EXTM3U"),
        }


def select_targets(current, *, commit=None, station_ids=None):
    if commit:
        originals = added_stations(commit)
    elif station_ids:
        by_id = {station["id"]: station for station in current}
        unknown = sorted(set(station_ids) - by_id.keys())
        if unknown:
            raise ValueError("Unknown station IDs: " + ", ".join(unknown))
        originals = [by_id[station_id] for station_id in dict.fromkeys(station_ids)]
    else:
        originals = current
    targets = []
    for original in originals:
        station = next((s for s in current if s["id"] == original["id"]), None)
        for field in ("stream", "name"):
            if station is not None:
                break
            matches = [
                s
                for s in current
                if (
                    s["listening"].get("stream") == original["listening"].get("stream")
                    if field == "stream"
                    else s["name"] == original["name"]
                )
                and (field != "stream" or original["listening"].get("stream"))
            ]
            if len(matches) > 1:
                raise ValueError(f"Ambiguous {field} match for {original['id']}")
            station = matches[0] if matches else None
        selected = station or original
        targets.append(
            {
                "original_id": original["id"],
                "current_id": station["id"] if station else None,
                "name": selected["name"],
                "stream": selected["listening"].get("stream"),
                "page": selected["listening"].get("page"),
            }
        )
    return targets


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--all", action="store_true", help="Check the full catalog.")
    selection.add_argument(
        "--station",
        nargs="+",
        action="extend",
        dest="station_ids",
        help="Check one or more exact catalog IDs; may be repeated.",
    )
    selection.add_argument("--commit", help="Check stations added by this Git commit.")
    parser.add_argument("--catalog", type=Path, default=ROOT / "radios.json")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(tempfile.gettempdir()) / "radio-http.json",
        help="Report path (default: system temporary directory/radio-http.json).",
    )
    parser.add_argument(
        "--browser-expression",
        type=Path,
        help="Also emit a function for Chrome MCP evaluate_script.",
    )
    parser.add_argument(
        "--prepare-only",
        action="store_true",
        help="Resolve targets and emit files without making HTTP requests.",
    )
    parser.add_argument("--timeout", type=int, default=15)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--browser-timeout", type=int, default=16, metavar="SECONDS")
    parser.add_argument("--browser-attempts", type=int, default=2)
    parser.add_argument("--browser-concurrency", type=int, default=3)
    args = parser.parse_args()
    if (
        min(
            args.timeout,
            args.workers,
            args.browser_timeout,
            args.browser_attempts,
            args.browser_concurrency,
        )
        < 1
    ):
        parser.error("Timeouts, attempts and worker counts must be positive")
    try:
        current = json.loads(args.catalog.read_text(encoding="utf-8"))["stations"]
        targets = select_targets(
            current, commit=args.commit, station_ids=args.station_ids
        )
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        parser.error(str(error))
    if not targets:
        parser.error("No stations selected")
    if args.browser_expression:
        source = (
            (ROOT / "scripts/check-radio-browser.js")
            .read_text(encoding="utf-8")
            .rstrip()
            .removesuffix(";")
        )
        args.browser_expression.parent.mkdir(parents=True, exist_ok=True)
        options = {
            "timeoutMs": args.browser_timeout * 1000,
            "attempts": args.browser_attempts,
            "concurrency": args.browser_concurrency,
        }
        args.browser_expression.write_text(
            "() => ("
            + source
            + ")("
            + json.dumps(targets, ensure_ascii=False)
            + ", "
            + json.dumps(options)
            + ")\n",
            encoding="utf-8",
        )

    def check(target):
        if args.prepare_only:
            return target
        target["http"] = {
            "stream": probe(target["stream"], args.timeout),
            "page": probe(target["page"], args.timeout),
        }
        print(
            f"{target['original_id']}: "
            f"stream={(target['http']['stream'] or {}).get('status')} "
            f"page={(target['http']['page'] or {}).get('status')}",
            flush=True,
        )
        return target

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        results = list(executor.map(check, targets))
    report = {
        "commit": args.commit,
        "catalog": str(args.catalog.resolve()),
        "http_checked": not args.prepare_only,
        "checked_at_utc": datetime.datetime.now(datetime.UTC).isoformat(),
        "method": (
            "Target preparation only; no HTTP checks."
            if args.prepare_only
            else "Bounded curl GET probes; HTTP success does not prove playback."
        ),
        "stations": results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(results)} stations to {args.output}")


if __name__ == "__main__":
    main()
