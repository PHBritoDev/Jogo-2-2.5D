#!/usr/bin/env python3
"""Benchmark synthetic Three.js-style expression repairs without JS execution."""
import argparse
import ast
import re
import importlib.util
from pathlib import Path

root = Path(__file__).parent
spec = importlib.util.spec_from_file_location("a1_py_bench", root / "a1-repair-benchmark.py")
bench = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bench)

CASES = (
    {
        "id": "mana-cap-js",
        "source": "return Math.max(mana + regen, maxMana)",
        "behavior": "Regenerar 5 com 8 mana e máximo 10 dá 10; regenerar 2 com 3 mana dá 5.",
        "samples": (({"mana": 8, "regen": 5, "maxMana": 10}, 10),
                    ({"mana": 3, "regen": 2, "maxMana": 10}, 5),
                    ({"mana": 10, "regen": 4, "maxMana": 10}, 10)),
    },
    {
        "id": "dash-cooldown-js",
        "source": "return cooldown + dt",
        "behavior": "Um cooldown diminui com o tempo e nunca fica negativo.",
        "samples": (({"cooldown": 0.4, "dt": 0.1}, 0.3),
                    ({"cooldown": 0.1, "dt": 0.2}, 0),
                    ({"cooldown": 0, "dt": 0.1}, 0)),
    },
)


def safe_js_value(code, values):
    """Parse only return-expression with Math.min/max and arithmetic."""
    if not isinstance(code, str) or len(code) > 240 or not code.startswith("return "):
        raise ValueError("Invalid JavaScript statement")
    if any(x in code for x in (";", "\n", "\r", "#", "{", "}", "[", "]")):
        raise ValueError("Unexpected JavaScript syntax")
    expr = code[7:]
    # Rejeitar min/max globais: Python válido não é necessariamente JavaScript válido.
    if re.search(r"(?<![\w.])(?:min|max)\s*\(", expr):
        raise ValueError("Global min/max is not valid JavaScript")
    expr = expr.replace("Math.min(", "min(").replace("Math.max(", "max(")
    tree = ast.parse(expr, mode="eval").body
    return bench.restricted_value(tree, values)


def accepts(code, case):
    try:
        return all(abs(safe_js_value(code, values) - target) < 1e-8
                   for values, target in case["samples"])
    except (ValueError, TypeError, SyntaxError, RecursionError, OverflowError):
        return False


def evaluate(proposer):
    results = []
    for case in CASES:
        if accepts(case["source"], case):
            raise ValueError("Benchmark invalid: original already correct")
        try:
            answer = proposer(case)
            ok = accepts(answer, case)
        except (ValueError, TimeoutError):
            ok = False
        results.append({"id": case["id"], "pass": ok})
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--llama", required=True)
    parser.add_argument("--model", required=True)
    args = parser.parse_args()
    results = evaluate(lambda case: bench.gate.propose_replacement(
        args.llama, args.model, case["source"], case["behavior"],
        validator=lambda answer: accepts(answer, case),
        language="JavaScript",
        examples="\n".join(
            "Entradas " + ", ".join(f"{key}={val}" for key, val in inputs.items())
            + f" -> retorno esperado {target}"
            for inputs, target in case["samples"]
        ),
    ))
    for result in results:
        print("JS BENCHMARK", result["id"], "PASS" if result["pass"] else "FAIL")
    score = sum(result["pass"] for result in results)
    print(f"JS BENCHMARK TOTAL: {score}/{len(results)}")
    if score != len(results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
