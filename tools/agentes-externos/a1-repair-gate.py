#!/usr/bin/env python3
"""A1 repair pilot: stage one verified text replacement, never edit the repository."""
import argparse
import hashlib
import json
import re
import subprocess
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


def propose_replacement(llama_bin, model, source, behavior):
    """Ask the local model for one replacement; never execute its raw response."""
    if not isinstance(source, str) or not isinstance(behavior, str):
        raise ValueError("Invalid repair input")
    if len(source) > 800 or len(behavior) > 240:
        raise ValueError("Repair prompt exceeds pilot limits")
    prompt = (
        "<|im_start|system>\n"
        "Você corrige apenas uma linha Python de um exemplo sintético. "
        "Responda em UMA linha: PATCH: seguido de JSON válido com apenas a chave after. "
        "O valor after deve conter o código Python substituto, não texto explicativo. "
        "Nunca execute nada, não use markdown.\n"
        "<|im_end|>\n<|im_start|user>\n"
        + "Código original:\n" + source
        + "\nComportamento esperado:\n" + behavior
        + "\n<|im_end|>\n<|im_start|assistant>\n"
    )
    result = subprocess.run(
        [llama_bin, "-m", model, "-p", prompt, "-n", "180",
         "-c", "2048", "-t", "2", "--temp", "0.1",
         "--single-turn", "--no-display-prompt", "--simple-io"],
        capture_output=True, text=True, encoding="utf-8",
        errors="replace", timeout=160, check=True,
    )
    matches = re.findall(r"(?m)^PATCH:\s*(\{[^\n]{1,400}\})\s*$", result.stdout)
    if len(matches) != 1:
        raise ValueError("Model did not produce one isolated patch object")
    proposal = json.loads(matches[0])
    if not isinstance(proposal, dict) or set(proposal) != {"after"}:
        raise ValueError("Model patch has invalid fields")
    if not isinstance(proposal["after"], str) or not proposal["after"].strip():
        raise ValueError("Empty model replacement")
    return proposal["after"]


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
