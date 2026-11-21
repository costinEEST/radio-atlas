"""Offline regression checks for station selection and report preparation."""

import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from typing import TypedDict
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/check-radio-stations.py"
SPEC = importlib.util.spec_from_file_location("station_checks", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise ImportError(f"Could not load the station verification script: {SCRIPT}")
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


class ListeningFixture(TypedDict):
    stream: str | None
    page: str | None


class StationFixture(TypedDict):
    id: str
    name: str
    listening: ListeningFixture


def station(
    station_id: str,
    *,
    stream: str | None = "https://example.test/live",
    name: str = "Example",
) -> StationFixture:
    return {
        "id": station_id,
        "name": name,
        "listening": {"stream": stream, "page": "https://example.test/"},
    }


class StationChecksTest(unittest.TestCase):
    def test_select_ids_deduplicates_and_rejects_unknown_ids(self):
        current = [station("one"), station("two")]
        result = audit.select_targets(current, station_ids=["two", "one", "two"])
        self.assertEqual([entry["current_id"] for entry in result], ["two", "one"])
        with self.assertRaisesRegex(ValueError, "Unknown station IDs: missing"):
            audit.select_targets(current, station_ids=["missing"])

    def test_all_selection_does_not_require_git_history(self):
        with patch.object(audit, "added_stations") as added:
            result = audit.select_targets([station("one"), station("two")])
        added.assert_not_called()
        self.assertEqual(len(result), 2)

    def test_commit_resolves_renames_corrected_streams_and_removed_records(self):
        old = [
            station("old"),
            station("fixed", stream="https://old-fixed.test/", name="Fixed"),
            station("gone"),
        ]
        current = [
            station("new"),
            station("new-fixed", stream="https://new.test/", name="Fixed"),
        ]
        # Give the absent station an identity distinct from the retained stations.
        old[2] = station("gone", stream="https://gone.test/", name="Gone")
        with patch.object(audit, "added_stations", return_value=old):
            result = audit.select_targets(current, commit="revision")
        self.assertEqual(
            [entry["current_id"] for entry in result], ["new", "new-fixed", None]
        )
        self.assertEqual(result[2]["stream"], "https://gone.test/")

    def test_ambiguous_historical_matches_are_not_silently_selected(self):
        with (
            patch.object(audit, "added_stations", return_value=[station("old")]),
            self.assertRaisesRegex(ValueError, "Ambiguous stream"),
        ):
            audit.select_targets([station("one"), station("two")], commit="revision")

    def test_prepare_custom_catalog_never_probes_network(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog, report, expression = (
                root / name for name in ("catalog.json", "report.json", "browser.js")
            )
            catalog.write_text(
                json.dumps({"stations": [station("custom", stream=None)]})
            )
            argv = [
                str(SCRIPT),
                "--all",
                "--catalog",
                str(catalog),
                "--prepare-only",
                "--output",
                str(report),
                "--browser-expression",
                str(expression),
                "--browser-timeout",
                "5",
                "--browser-attempts",
                "1",
                "--browser-concurrency",
                "2",
            ]
            with (
                patch.object(sys, "argv", argv),
                patch.object(audit, "probe") as probe,
                contextlib.redirect_stdout(io.StringIO()),
            ):
                audit.main()
            probe.assert_not_called()
            result = json.loads(report.read_text())
            self.assertFalse(result["http_checked"])
            self.assertIsNone(result["stations"][0]["stream"])
            self.assertNotIn("http", result["stations"][0])
            self.assertIn('"timeoutMs": 5000', expression.read_text())
            self.assertIn('"attempts": 1', expression.read_text())
            self.assertIn('"concurrency": 2', expression.read_text())

    def test_missing_stream_and_page_are_reported_without_crashing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog, report = root / "catalog.json", root / "report.json"
            entry = station("empty", stream=None)
            entry["listening"]["page"] = None
            catalog.write_text(json.dumps({"stations": [entry]}))
            argv = [
                str(SCRIPT),
                "--station",
                "empty",
                "--catalog",
                str(catalog),
                "--output",
                str(report),
            ]
            with (
                patch.object(sys, "argv", argv),
                patch.object(audit.subprocess, "run") as run,
                contextlib.redirect_stdout(io.StringIO()),
            ):
                audit.main()
            run.assert_not_called()
            self.assertEqual(
                json.loads(report.read_text())["stations"][0]["http"],
                {"stream": None, "page": None},
            )

    def test_scope_is_required_and_modes_are_mutually_exclusive(self):
        for arguments in (
            [],
            ["--all", "--station", "one"],
            ["--all", "--browser-attempts", "0"],
        ):
            with (
                self.subTest(arguments=arguments),
                patch.object(sys, "argv", [str(SCRIPT), *arguments]),
                contextlib.redirect_stderr(io.StringIO()),
                self.assertRaises(SystemExit) as error,
            ):
                audit.main()
            self.assertEqual(error.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
