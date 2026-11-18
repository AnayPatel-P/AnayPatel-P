#!/usr/bin/env python3
"""Catalog drift check for Plotted.

Fetches the live catalog pages that Plotted's scrapers depend on, parses them
with the repo's current parsers, and compares with the committed snapshots in
scraper/tests/snapshots/. A parse crash, an empty result or a changed
requirement structure means the catalog moved and the data may be stale.

Run from the Plotted repo's scraper/ directory:
  uv run python <path>/watchdog/plotted_drift.py            # live catalog pages
  uv run python <path>/watchdog/plotted_drift.py --fixtures # saved pages (self-test)

The catalog servers may refuse cloud IPs. A fetch failure is reported as
"skipped", not as a failure, so it never opens an issue on its own.
"""
import gzip
import json
import sys
import urllib.request
from dataclasses import asdict, is_dataclass
from pathlib import Path

from plotted_scraper import tamu, ut_program

PAGES = {
    "ut-cs-bs": ("https://catalog.utexas.edu/undergraduate/programs/computer-science-computer-science-option-bscompsci/",
                 ut_program.parse_program_page),
    "ut-math-bs": ("https://catalog.utexas.edu/undergraduate/programs/mathematics-math-option-bsmath/",
                   ut_program.parse_program_page),
    "tamu-daen-bs": ("https://catalog.tamu.edu/undergraduate/engineering/industrial-systems/data-engineering-bs/",
                     tamu.parse_program_page),
}
SNAP = Path("tests/snapshots")


def norm(v):
    return json.loads(json.dumps(asdict(v) if is_dataclass(v) else v, sort_keys=True, default=str))


def shape(v, depth=0):
    """Small structural summary so the diff in the report stays readable."""
    if isinstance(v, dict):
        return {k: shape(x, depth + 1) for k, x in v.items()} if depth < 2 else f"dict({len(v)})"
    if isinstance(v, list):
        return f"list({len(v)})"
    return v if isinstance(v, (int, float, bool)) or v is None else str(v)[:60]


def diff(a, b, path="", out=None, limit=15):
    out = [] if out is None else out
    if len(out) >= limit:
        return out
    if type(a) is not type(b):
        out.append(f"{path or '/'}: {type(a).__name__} → {type(b).__name__}")
    elif isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                out.append(f"{path}/{k}: added")
            elif k not in b:
                out.append(f"{path}/{k}: removed")
            else:
                diff(a[k], b[k], f"{path}/{k}", out, limit)
    elif isinstance(a, list):
        if len(a) != len(b):
            out.append(f"{path}: {len(a)} → {len(b)} items")
        for i, (x, y) in enumerate(zip(a, b)):
            diff(x, y, f"{path}[{i}]", out, limit)
    elif a != b:
        out.append(f"{path}: {str(a)[:50]!r} → {str(b)[:50]!r}")
    return out


def fetch(url: str, name: str, fixtures: bool) -> str:
    if fixtures:
        return gzip.decompress(Path(f"tests/fixtures/{name}.html.gz").read_bytes()).decode("utf-8")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (plotted-watchdog)"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


def main() -> int:
    fixtures = "--fixtures" in sys.argv
    checks = []
    for name, (url, parse) in PAGES.items():
        cid = f"plotted-catalog-{name}"
        try:
            html = fetch(url, name, fixtures)
        except Exception as e:  # noqa: BLE001
            checks.append({"id": cid, "app": "Plotted", "ok": True, "severity": "skipped",
                           "summary": f"skipped: couldn't fetch {url} ({e})", "evidence": {"url": url}})
            continue
        try:
            live = norm(parse(html))
        except Exception as e:  # noqa: BLE001
            checks.append({"id": cid, "app": "Plotted", "ok": False, "severity": "high",
                           "summary": f"parser crashed on live page: {type(e).__name__}: {e}",
                           "evidence": {"url": url}})
            continue
        snap = json.loads((SNAP / f"{name}.json").read_text())
        changes = diff(snap, live)
        empty = not live or all(not v for v in live.values()) if isinstance(live, dict) else not live
        ok = not changes and not empty
        checks.append({
            "id": cid, "app": "Plotted", "ok": ok, "severity": "ok" if ok else ("high" if empty else "medium"),
            "summary": "live catalog parses identically to the snapshot" if ok else
                       ("parser returned nothing" if empty else f"live catalog differs from snapshot ({len(changes)}+ changes)"),
            "evidence": {"url": url, "changes": changes, "live_shape": shape(live)},
        })
    json.dump({"checks": checks, "failing": [c["id"] for c in checks if not c["ok"]]}, sys.stdout, indent=2)
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
