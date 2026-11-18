#!/usr/bin/env python3
"""Watchdog health checks for InvestEdge, Plotted and MarketLens.

Deterministic and cheap: the agent only spends judgment when something fails.
Each check returns {id, app, ok, severity, summary, evidence}. Prints JSON.

Usage: python3 watchdog/checks.py [--now 2026-11-18T12:00:00Z]
"""
import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone

UTC = timezone.utc
INVESTEDGE = "https://anaypatel-p.github.io/investedge/"
PLOTTED = "https://plotted-cyan.vercel.app"
MARKETLENS = "https://marketlens-live.fly.dev"
# InvestEdge's pages.yml runs at 22:30 UTC on weekdays and takes up to ~150 min.
PIPELINE_HOUR, PIPELINE_MIN, PIPELINE_GRACE = 22, 30, timedelta(hours=4)


def get(url: str, timeout: int = 25) -> tuple[int, str, float]:
    t = time.monotonic()
    p = subprocess.run(
        ["curl", "-sS", "-L", "--max-time", str(timeout), "-w", "\n%{http_code}", url],
        capture_output=True, text=True,
    )
    secs = round(time.monotonic() - t, 2)
    body, _, code = p.stdout.rpartition("\n")
    return (int(code) if code.isdigit() else 0), (body if body else p.stderr.strip()), secs


def result(cid, app, ok, summary, evidence=None, severity="high"):
    return {"id": cid, "app": app, "ok": ok, "severity": "ok" if ok else severity,
            "summary": summary, "evidence": evidence or {}}


def check_up(app: str, url: str) -> dict:
    code, body, secs = get(url)
    ok = 200 <= code < 300 and len(body) > 200
    return result(f"{app.lower()}-up", app, ok,
                  f"{url} → HTTP {code} in {secs}s" + ("" if ok else f": {body[:160]}"),
                  {"http": code, "seconds": secs, "bytes": len(body)})


def last_expected_run(now: datetime) -> datetime:
    """Most recent weekday 22:30 UTC run that should have finished by now."""
    d = now - PIPELINE_GRACE
    cand = d.replace(hour=PIPELINE_HOUR, minute=PIPELINE_MIN, second=0, microsecond=0)
    if cand > d:
        cand -= timedelta(days=1)
    while cand.weekday() >= 5:  # Sat, Sun
        cand -= timedelta(days=1)
    return cand


def check_investedge_data(now: datetime) -> list[dict]:
    code, body, _ = get(INVESTEDGE + "data/runs/latest.json")
    if code != 200:
        return [result("investedge-data", "InvestEdge", False, f"runs/latest.json → HTTP {code}")]
    try:
        run = json.loads(body)
    except json.JSONDecodeError:
        return [result("investedge-data", "InvestEdge", False, "runs/latest.json is not valid JSON",
                       {"head": body[:200]})]
    out = []
    finished = datetime.fromisoformat(run["finished"]).replace(tzinfo=UTC)
    expected = last_expected_run(now)
    fresh = finished >= expected - timedelta(minutes=5)
    out.append(result("investedge-fresh", "InvestEdge", fresh,
                      f"last pipeline run finished {run['finished']}Z; expected one after {expected:%Y-%m-%d %H:%M}Z",
                      {"finished": run["finished"], "expected_after": expected.isoformat()}))
    n = run.get("symbols") or run.get("universe_size") or 0
    weak = {m: c for m, c in (run.get("forecast_ok") or {}).items() if n and c < 0.95 * n}
    failed = run.get("prices_failed") or []
    ok = not weak and len(failed) <= 5
    out.append(result("investedge-quality", "InvestEdge", ok,
                      "forecasts and prices complete" if ok else
                      f"models under 95% of {n} symbols: {weak or 'none'}; price failures: {len(failed)}",
                      {"symbols": n, "forecast_ok": run.get("forecast_ok"), "prices_failed": failed[:20],
                       "forecast_errors": (run.get("forecast_errors") or [])[:10]},
                      severity="medium"))
    return out


def check_marketlens() -> list[dict]:
    out = []
    code, body, _ = get(MARKETLENS + "/api/health")
    try:
        h = json.loads(body) if code == 200 else {}
    except json.JSONDecodeError:
        h = {}
    out.append(result("marketlens-health", "MarketLens", h.get("status") == "ok",
                      f"/api/health → HTTP {code} {body[:120]}", {"health": h or body[:200]}))
    code, body, _ = get(MARKETLENS + "/api/quote/AAPL")
    try:
        q = json.loads(body) if code == 200 else {}
    except json.JSONDecodeError:
        q = {}
    price_ok = isinstance(q.get("price"), (int, float)) and q["price"] > 0
    out.append(result("marketlens-quote", "MarketLens", price_ok,
                      f"/api/quote/AAPL → HTTP {code}, price {q.get('price')}",
                      {"quote": {k: q.get(k) for k in ("price", "as_of")} if q else body[:200]}))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--now", help="override current time (ISO, UTC) for testing")
    a = ap.parse_args()
    now = datetime.fromisoformat(a.now.replace("Z", "+00:00")) if a.now else datetime.now(UTC)
    checks = [check_up("InvestEdge", INVESTEDGE), check_up("Plotted", PLOTTED), check_up("MarketLens", MARKETLENS)]
    checks += check_investedge_data(now)
    checks += check_marketlens()
    json.dump({"checked_at": now.isoformat(), "checks": checks,
               "failing": [c["id"] for c in checks if not c["ok"]]}, sys.stdout, indent=2)
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
