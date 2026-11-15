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
        "samples": (({"current": 8, "heal": 5, "maximum": 10}, 10),
                    ({"current": 4, "heal": 2, "maximum": 10}, 6),
                    ({"current": 10, "heal": 2, "maximum": 10}, 10)),
    },
    {
        "id": "damage-floor",
        "source": "return hp - damage",
        "behavior": "Com 2 HP e 6 de dano, a vida final é 0, não pode ser negativa.",
        "expected": "return max(0, hp - damage)",
        "samples": (({"hp": 2, "damage": 6}, 0),
                    ({"hp": 10, "damage": 3}, 7),
                    ({"hp": 0, "damage": 2}, 0)),
    },
)


def restricted_value(expr, values):
    """Interpret an allowlisted numeric expression. NEVER exec/eval model Python."""
    if isinstance(expr, ast.Constant) and type(expr.value) in (int, float):
        if abs(expr.value) > 100000:
            raise ValueError("oversized numeric literal")
        return expr.value
    if isinstance(expr, ast.Name) and expr.id in values:
        return values[expr.id]
    if isinstance(expr, ast.UnaryOp) and isinstance(expr.op, ast.USub):
        return -restricted_value(expr.operand, values)
    if isinstance(expr, ast.BinOp) and isinstance(expr.op, (ast.Add, ast.Sub)):
        a = restricted_value(expr.left, values)
        b = restricted_value(expr.right, values)
        return a + b if isinstance(expr.op, ast.Add) else a - b
    if (isinstance(expr, ast.Call) and isinstance(expr.func, ast.Name)
            and expr.func.id in ("min", "max") and not expr.keywords
            and 1 <= len(expr.args) <= 3):
        args = [restricted_value(arg, values) for arg in expr.args]
        return min(args) if expr.func.id == "min" else max(args)
    raise ValueError("unsupported candidate expression")


def behaves_correctly(code, case):
    """Red/green behavioral validation of an expression-only candidate."""
    if not isinstance(code, str) or len(code) > 240 or not code.startswith("return "):
        return False
    if any(x in code for x in ("\\n", "\\r", ";", "#")):
        return False
    try:
        expr = ast.parse(code[7:], mode="eval").body
        return all(restricted_value(expr, values) == expected
                   for values, expected in case["samples"])
    except (ValueError, SyntaxError, TypeError, OverflowError, RecursionError):
        return False


def evaluate(proposer):
    results = []
    for case in CASES:
        if behaves_correctly(case["source"], case):
            raise RuntimeError("Benchmark fixture has no regression")
        if not behaves_correctly(case["expected"], case):
            raise RuntimeError("Benchmark reference correction is invalid")
        try:
            answer = proposer(case["source"], case["behavior"])
            ok = behaves_correctly(answer, case)
            error = "mismatch" if not ok else ""
            # Telemetry contains no raw prompt, code or arbitrary text.
            shape = "unchanged" if answer == case["source"] else "changed"
            try:
                if answer.startswith("return ") and len(answer) <= 240 and "\\n" not in answer:
                    expr = ast.parse(answer[7:], mode="eval").body
                    observed = [restricted_value(expr, values) for values, _ in case["samples"]]
                    shape += ":evaluated:" + ",".join(str(v)[:12] for v in observed)
                else:
                    shape += ":unsupported"
            except (ValueError, SyntaxError, TypeError, RecursionError, OverflowError):
                shape += ":unsupported"
            error = shape if not ok else ""
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
