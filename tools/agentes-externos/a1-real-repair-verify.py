#!/usr/bin/env python3
"""A1 red/green repair verification for owned game module.

No user/model supplied commands, shell, tokens, repository mutation or PR merge.
A candidate is eligible for review only if trusted regression tests FAIL on
original source and PASS on staged candidate. This is not an auto-merge gate.
"""
import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import importlib.util

_spec = importlib.util.spec_from_file_location(
    "a1_real_gate", Path(__file__).with_name("a1-real-repair-gate.py"))
_gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_gate)

TEST_FILE = "hearts3d.test.mjs"


def _test_code(module_file, regression_file, node="node"):
    with tempfile.TemporaryDirectory(prefix="a1-test-") as temp:
        work = Path(temp)
        shutil.copyfile(module_file, work / "hearts3d.js")
        shutil.copyfile(regression_file, work / TEST_FILE)
        (work / "package.json").write_text('{"type":"module"}\n', encoding="utf-8")
        cmd = [node, "--test", TEST_FILE]
        try:
            result = subprocess.run(cmd, cwd=work, capture_output=True,
                                    text=True, timeout=35, check=False)
        except (subprocess.TimeoutExpired, OSError) as exc:
            raise RuntimeError("Regression tests did not complete") from exc
        # Do not print model-generated sources or arbitrary test stdout.
        return result.returncode == 0


def verify(root, candidate, node="node"):
    root = Path(root).resolve(strict=True)
    source = root / "hearts3d.js"
    regression = root / TEST_FILE
    if regression.is_symlink() or not regression.is_file():
        raise ValueError("Trusted committed regression file missing")
    with tempfile.TemporaryDirectory(prefix="a1-stage-") as temp:
        staged = _gate.stage(root, Path(temp) / "patch", candidate)
        original_passes = _test_code(source, regression, node)
        fixed_passes = _test_code(staged, regression, node)
        return {
            "original_passes": original_passes,
            "candidate_passes": fixed_passes,
            "verified_red_green": not original_passes and fixed_passes,
        }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--proposal", required=True)
    args = parser.parse_args()
    proposal = json.loads(Path(args.proposal).read_text(encoding="utf-8"))
    result = verify(args.root, proposal)
    print(json.dumps(result, sort_keys=True))
    if not result["verified_red_green"]:
        raise SystemExit("A1: candidate not eligible; red/green gate failed")


if __name__ == "__main__":
    main()
