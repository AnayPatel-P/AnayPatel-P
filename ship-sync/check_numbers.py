#!/usr/bin/env python3
"""Number-fidelity check for edited public copy.

Every number that appears in new or changed lines must already be in the old
file or in one of the evidence files (reader reports, project READMEs, PM docs).
Anything else is a number the agent made up, and the run must not ship it.

Usage:
  python3 ship-sync/check_numbers.py --old OLD --new NEW --evidence E1 [E2 ...]
Exit 0 = clean, 1 = untraced numbers (printed).
"""
import argparse
import difflib
import html
import re
import sys
from pathlib import Path

NUM = re.compile(r"\d[\d,]*(?:\.\d+)?\s?(?:%|×|x\b|k\b|M\b)?")


def plain(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\b(?:href|src|width|height|style|class|id)=\"[^\"]*\"", " ", text)
    return html.unescape(text).replace(" ", " ")


def numbers(text: str) -> set[str]:
    out = set()
    for m in NUM.finditer(plain(text)):
        n = m.group(0).strip().replace(",", "").rstrip("x×kM% ").strip()
        if n and not re.fullmatch(r"\d", n):  # single digits are mostly list counters / "Fig. 2"
            out.add(n)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--old", required=True)
    ap.add_argument("--new", required=True)
    ap.add_argument("--evidence", nargs="+", required=True)
    a = ap.parse_args()
    old = Path(a.old).read_text(encoding="utf-8")
    new = Path(a.new).read_text(encoding="utf-8")
    added = [l[1:] for l in difflib.unified_diff(old.splitlines(), new.splitlines(), lineterm="", n=0)
             if l.startswith("+") and not l.startswith("+++")]
    known = numbers(old)
    for e in a.evidence:
        known |= numbers(Path(e).read_text(encoding="utf-8", errors="replace"))
    # strip URLs from added lines: commit SHAs and paths aren't claims
    bad = sorted({n for line in added for n in numbers(re.sub(r"https?://\S+", " ", line))} - known)
    if bad:
        print("Untraced numbers in new copy (not in old file or evidence):")
        for n in bad:
            ctx = next(l.strip() for l in added if n in plain(l).replace(",", ""))
            print(f"  {n}  ←  {plain(ctx)[:140]}")
        return 1
    print(f"OK: {len(added)} changed line(s), every number traced.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
