#!/usr/bin/env python3
"""A1 real-module repair gate: stage a small JS fix outside checkout, never merge.

Candidate JSON is untrusted model output. This tool ONLY stages data; it does not
run model text, create PRs, push commits or touch controller/cave/shared modules.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath

# Explicit ownership: only small standalone modules currently scoped to A1.
# Expand only after coordination in Issue #519 and new regression tests.
ALLOWED = frozenset(("hearts3d.js",))
MAX_SOURCE = 65536
MAX_FRAGMENT = 2048


def stage(root, staging, candidate):
    if not isinstance(candidate, dict) or set(candidate) != {"path", "base_sha256", "before", "after"}:
        raise ValueError("Unexpected candidate schema")
    name, sha, before, after = (candidate[k] for k in ("path", "base_sha256", "before", "after"))
    if not all(isinstance(value, str) for value in (name, sha, before, after)):
        raise ValueError("Invalid candidate field types")
    if name not in ALLOWED or PurePosixPath(name).is_absolute() or "\\" in name:
        raise ValueError("File not owned by A1")
    if len(sha) != 64 or any(char not in "0123456789abcdef" for char in sha):
        raise ValueError("Invalid baseline sha256")
    if not before or before == after or not after or len(before) > MAX_FRAGMENT or len(after) > MAX_FRAGMENT:
        raise ValueError("Invalid or oversized patch")
    if "\x00" in before or "\x00" in after:
        raise ValueError("NUL bytes forbidden")
    root = Path(root).resolve(strict=True)
    staging = Path(staging).resolve()
    if staging == root or root in staging.parents:
        raise ValueError("Staging must be outside the checkout")
    source = root / name
    if source.is_symlink() or not source.is_file():
        raise ValueError("Source is not a regular file")
    original = source.read_bytes()
    if len(original) > MAX_SOURCE or hashlib.sha256(original).hexdigest() != sha:
        raise ValueError("Stale or oversized source")
    text = original.decode("utf-8")
    if text.count(before) != 1:
        raise ValueError("Patch anchor must be unique")
    revised = text.replace(before, after, 1)
    if len(revised.encode("utf-8")) > MAX_SOURCE:
        raise ValueError("Modified source exceeds size limit")
    if staging.exists() and staging.is_symlink():
        raise ValueError("Symlinked staging directory")
    staging.mkdir(parents=True, exist_ok=True)
    target = staging / name
    if target.exists() or target.is_symlink():
        raise ValueError("Refusing to overwrite existing staged change")
    target.write_text(revised, encoding="utf-8")
    return target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--staging", required=True)
    parser.add_argument("--proposal", required=True)
    args = parser.parse_args()
    candidate = json.loads(Path(args.proposal).read_text("utf-8"))
    output = stage(args.root, args.staging, candidate)
    print("A1 candidate staged, NOT accepted as a fix:", output.name)
    print("Next: independently test staged code, compare gameplay tests, review PR.")


if __name__ == "__main__":
    main()
