#!/usr/bin/env python3
"""A1 evaluation: compare Qwen repair proposals with independently defined Python ASTs.

Only synthetic fixtures. No repository write, no execution of generated code,
no permissions to create PRs or access production issues.
"""
import argparse
import ast
import importlib.util
import os
from pathlib import Path

gate_path = Path(__file__).with_name("a1-repair-gate.py")
spec = importlib.util.spec_from_file_location("a1_repair_gate_bench", gate_path)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


CASES = (
    {
        "id": "heal-cap",
        "source": "return max(current + heal, maximum)",
        "behavior": "Curar 5 com vida atual 8 e máximo 10 resulta em 10, nunca acima do máximo.",
        "expected": "return min(current + heal, maximum)",
    },
    {
        "id": "damage-floor",
        "source": "return hp - damage",
        "behavior": "Com 2 HP e 6 de dano, a vida final é 0, não pode ser negativa.",
        "expected": "return max(0, hp - damage)",
    },
)


def same_python_code(actual, expected):
    """Compile-free shape check: do not run model output under any circumstances."""
    try:
        a = ast.parse("def repair_probe(current=0, heal=0, maximum=0, hp=0, damage=0):\n    " + actual + "\n")
        b = ast.parse("def repair_probe(current=0, heal=0, maximum=0, hp=0, damage=0):\n    " + expected + "\n")
    except SyntaxError:
        return False
    return ast.dump(a, include_attributes=False) == ast.dump(b, include_attributes=False)


def evaluate(proposer):
    results = []
    for case in CASES:
        if same_python_code(case["source"], case["expected"]):
            raise RuntimeError("Benchmark fixture has no regression")
        try:
            answer = proposer(case["source"], case["behavior"])
            ok = same_python_code(answer, case["expected"])
            error = "mismatch" if not ok else ""
        except (ValueError, TimeoutError) as exc:
            ok, error = False, type(exc).__name__
        results.append({"id": case["id"], "pass": ok, "reason": error})
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--llama", required=True)
    parser.add_argument("--model", required=True)
    args = parser.parse_args()
    results = evaluate(lambda source, behavior: gate.propose_replacement(
        args.llama, args.model, source, behavior
    ))
    for r in results:
        print("BENCHMARK", r["id"], "PASS" if r["pass"] else "FAIL", r["reason"])
    successful = sum(r["pass"] for r in results)
    print(f"BENCHMARK TOTAL: {successful}/{len(results)}")
    if successful != len(results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
