#!/usr/bin/env python3
"""Detect which projects changed since the public copy was last synced.

Deterministic, so the agent only spends judgment on projects that really moved.

Usage:
  python3 ship-sync/detect.py --projects ship-sync/projects.json \
      --state ship-sync/state.json --workdir <dir with one clone per project>

Each project is expected at <workdir>/<repo name, lowercased>. Prints JSON.
"""
import argparse
import fnmatch
import json
import subprocess
import sys
from pathlib import Path

# Changes that never affect what a visitor sees or what the copy claims.
INTERNAL_DIRS = {"test", "tests", "__tests__", "e2e", ".github", ".impeccable", ".claude"}
INTERNAL_FILES = ["*.test.*", "*.spec.*", "test_*", "*_test.py", "*.lock", "package-lock.json",
                  ".gitignore", ".dockerignore", "makefile", "license"]
DIFF_CAP = 6000  # characters per diff passed on to the reader


def git(repo: Path, *args: str) -> tuple[int, str]:
    p = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    return p.returncode, p.stdout.strip()


def is_internal(path: str) -> bool:
    *dirs, name = path.lower().split("/")
    return bool(INTERNAL_DIRS & set(dirs)) or any(fnmatch.fnmatch(name, p) for p in INTERNAL_FILES)


def live_status(url: str) -> dict:
    p = subprocess.run(
        ["curl", "-sS", "-L", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "25", url],
        capture_output=True, text=True,
    )
    code = p.stdout.strip() or "000"
    return {"url": url, "http": int(code) if code.isdigit() else 0,
            "ok": code.startswith("2"), "error": p.stderr.strip()[:200] or None}


def capped(text: str) -> str:
    return text if len(text) <= DIFF_CAP else text[:DIFF_CAP] + f"\n… [truncated, {len(text)} chars]"


def detect(project: dict, synced: str | None, workdir: Path) -> dict:
    repo = workdir / project["repo"].split("/")[1].lower()
    out = {"name": project["name"], "repo_path": str(repo), "synced_sha": synced}
    if not (repo / ".git").exists():
        return {**out, "status": "error", "reason": f"no clone at {repo}"}
    _, head = git(repo, "rev-parse", "HEAD")
    out["head_sha"] = head
    out["live"] = live_status(project["live_url"])
    if synced == head:
        return {**out, "status": "unchanged"}
    if not synced or git(repo, "cat-file", "-e", f"{synced}^{{commit}}")[0] != 0:
        return {**out, "status": "error",
                "reason": "synced SHA not in clone; fetch more history (git fetch --depth=500)"}

    _, log = git(repo, "log", "--format=%h%x09%ad%x09%s", "--date=short", f"{synced}..{head}")
    _, names = git(repo, "diff", "--name-only", synced, head)
    files = [f for f in names.splitlines() if f]
    visible = [f for f in files if not is_internal(f)]
    _, bodies = git(repo, "log", "--format=--- %h %s%n%b", f"{synced}..{head}")

    def diff_of(path: str) -> str:
        return capped(git(repo, "diff", synced, head, "--", path)[1])

    images = [f for f in visible if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif"))]
    return {
        **out,
        "status": "changed" if visible else "internal_only",
        "commits": log.splitlines(),
        "commit_messages": capped(bodies),
        "files_changed": len(files),
        "visible_files": visible[:80],
        "changed_images": images,
        "readme_diff": diff_of("README.md"),
        "status_md_diff": diff_of("docs/pm/STATUS.md"),
        "product_md_diff": diff_of("PRODUCT.md"),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--projects", required=True)
    ap.add_argument("--state", required=True)
    ap.add_argument("--workdir", required=True)
    a = ap.parse_args()
    projects = json.loads(Path(a.projects).read_text())["projects"]
    state = json.loads(Path(a.state).read_text()).get("projects", {})
    results = [detect(p, state.get(p["name"], {}).get("synced_sha"), Path(a.workdir)) for p in projects]
    json.dump({"projects": results}, sys.stdout, indent=2)
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
