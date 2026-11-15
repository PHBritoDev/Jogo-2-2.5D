#!/usr/bin/env python3
"""A1 bounded real game repair experiment; ALWAYS fail closed.

Usage (human-curated, trusted test already committed):
 python3 tools/agentes-externos/a1-repair-real-pilot.py --root . \
   --llama /path/to/llama-cli --model /path/to/model.gguf \
   --before 'return Math.max(0, hearts - 1)' \
   --behavior 'Never increase hearts after taking damage'

The model receives an expression, not an entire file. Its output cannot add
identifiers or side effects, is staged outside checkout, and is only considered
a viable candidate if the committed tests fail on the baseline and pass after.
No writing to repository, GitHub, Issues or PRs; no automatic approval/merge.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path


def _load(filename, name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


gate = _load("a1-real-repair-gate.py", "a1_real_pilot_gate")
verify = _load("a1-real-repair-verify.py", "a1_real_pilot_verify")
proposer = _load("a1-repair-gate.py", "a1_synthetic_proposer")


def run(root, before, behavior, llama, model, examples=""):
    root = Path(root).resolve(strict=True)
    source = root / "hearts3d.js"
    original = source.read_bytes()
    if original.decode("utf-8").count(before) != 1:
        raise ValueError("Trusted source expression not unique")
    # Reject invalid anchors BEFORE contacting the model.
    gate._safe_expression(before)
    if not isinstance(behavior, str) or not 10 <= len(behavior) <= 240:
        raise ValueError("Trusted behavioral requirement out of bounds")
    after = proposer.propose_replacement(
        llama, model, before, behavior, examples=examples, language="JavaScript"
    )
    candidate = {
        "path": "hearts3d.js",
        "base_sha256": hashlib.sha256(original).hexdigest(),
        "before": before,
        "after": after,
    }
    # Validate model output before ANY execution, then use trusted regressions.
    gate._check_patch_expression(before, after)
    outcome = verify.verify(root, candidate)
    return {
        "path": candidate["path"],
        "baseline_sha256": candidate["base_sha256"],
        "result": "verified_candidate" if outcome["verified_red_green"] else "rejected",
        **outcome,
        "candidate": candidate if outcome["verified_red_green"] else None,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--llama", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--before", required=True)
    parser.add_argument("--behavior", required=True)
    parser.add_argument("--examples", default="")
    parser.add_argument("--output", help="Optional patch JSON destination OUTSIDE checkout")
    args = parser.parse_args()
    outcome = run(args.root, args.before, args.behavior,
                  args.llama, args.model, examples=args.examples)
    if args.output and outcome["result"] == "verified_candidate":
        checkout = Path(args.root).resolve(strict=True)
        target = Path(args.output).resolve()
        if target == checkout or checkout in target.parents or target.exists() or target.is_symlink():
            raise ValueError("Patch destination must be new and outside checkout")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(outcome["candidate"], sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in outcome.items() if key != "candidate"}, sort_keys=True))
    if outcome["result"] != "verified_candidate":
        raise SystemExit("A1: model candidate failed trusted red/green validation")


if __name__ == "__main__":
    main()
