#!/usr/bin/env python3
"""A1 repair pilot: stage one verified text replacement, never edit the repository."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath

PILOT_PREFIX = "tools/agentes-externos/fixtures/"
MAX_BYTES = 32768


def stage_candidate(root, output, candidate):
    """Return staged path; model-provided content is data, never executable commands."""
    if not isinstance(candidate, dict) or set(candidate) != {"path", "base_sha256", "before", "after"}:
        raise ValueError("Candidate must contain exactly four approved fields")
    name, digest, before, after = (candidate[k] for k in ("path", "base_sha256", "before", "after"))
    if not all(isinstance(x, str) for x in (name, digest, before, after)):
        raise ValueError("Candidate fields must be strings")
    p = PurePosixPath(name)
    if (not name.startswith(PILOT_PREFIX) or p.is_absolute()
            or ".." in p.parts or "." in p.parts or "\\" in name
            or p.suffix != ".py"):
        raise ValueError("Only pilot Python fixtures are allowed")
    if not before or not after or before == after or len(before) > 4096 or len(after) > 4096:
        raise ValueError("Candidate must make one small, nonempty change")
    if len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest):
        raise ValueError("Invalid SHA-256")
    root = Path(root).resolve()
    output = Path(output).resolve()
    if output == root or root in output.parents:
        raise ValueError("Staging must be outside the source checkout")
    source = root / name
    current = root
    for part in p.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("Symlinks are not allowed")
    if not source.is_file() or source.stat().st_size > MAX_BYTES:
        raise ValueError("Source fixture missing or too large")
    original = source.read_bytes()
    if hashlib.sha256(original).hexdigest() != digest:
        raise ValueError("Stale proposal: source checksum differs")
    text = original.decode("utf-8")
    if text.count(before) != 1:
        raise ValueError("Target must occur exactly once")
    modified = text.replace(before, after, 1)
    if len(modified.encode("utf-8")) > MAX_BYTES:
        raise ValueError("Result is too large")
    staged = output / name
    current = output
    for part in p.parts[:-1]:
        current = current / part
        if current.is_symlink():
            raise ValueError("Symlink in staging path")
    if staged.exists() or staged.is_symlink():
        raise ValueError("Refusing to overwrite staged content")
    staged.parent.mkdir(parents=True, exist_ok=True)
    staged.write_text(modified, encoding="utf-8")
    return staged


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--proposal", required=True)
    args = parser.parse_args()
    proposal = json.loads(Path(args.proposal).read_text(encoding="utf-8"))
    staged = stage_candidate(args.root, args.output, proposal)
    print("Pilot change staged for review:", staged.name)


if __name__ == "__main__":
    main()
