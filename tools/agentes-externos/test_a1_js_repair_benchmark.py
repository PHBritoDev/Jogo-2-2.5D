"""Unit tests for safe synthetic JavaScript expression repair checks."""
import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).with_name("a1-js-repair-benchmark.py")
spec = importlib.util.spec_from_file_location("a1_js_repair_benchmark", path)
bench = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bench)


class JsRepairTests(unittest.TestCase):
    def test_original_cases_reproduce_failures(self):
        self.assertTrue(all(not bench.accepts(c["source"], c) for c in bench.CASES))

    def test_trusted_corrections_satisfy_every_case(self):
        solutions = (
            "return Math.min(mana + regen, maxMana)",
            "return Math.max(0, cooldown - dt)",
        )
        self.assertTrue(all(bench.accepts(sol, case)
                            for sol, case in zip(solutions, bench.CASES)))

    def test_rejects_python_min_max_as_javascript(self):
        c = bench.CASES[0]
        self.assertFalse(bench.accepts("return min(mana + regen, maxMana)", c))
        self.assertTrue(bench.accepts("return Math.min(mana + regen, maxMana)", c))

    def test_noop_does_not_count_as_repair(self):
        results = bench.evaluate(lambda case: case["source"])
        self.assertFalse(any(r["pass"] for r in results))

    def test_model_code_cannot_use_imports_or_execute_arbitrary_calls(self):
        c = bench.CASES[0]
        for code in (
            "return process.exit(0)",
            "return require('fs').readFileSync('x')",
            "return globalThis.constructor.constructor('return 1')()",
            "return Math.max(1, 2); alert(1)",
            "return Math.max(1, 2)\nalert(1)",
        ):
            with self.subTest(code=code):
                self.assertFalse(bench.accepts(code, c))


if __name__ == "__main__":
    unittest.main()
