"""Bounded fallback test against independent synthetic red cases."""
import importlib.util
from pathlib import Path
import unittest

folder = Path(__file__).parent


def load(file, name):
    spec = importlib.util.spec_from_file_location(name, folder / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


fallback = load("a1-arithmetic-fallback.py", "a1_fallback_test")
bench = load("a1-repair-benchmark.py", "a1_bench_test")


class FallbackTests(unittest.TestCase):
    def test_python_fallback_repairs_both_synthetic_cases(self):
        for case in bench.CASES:
            with self.subTest(case=case["id"]):
                self.assertFalse(bench.behaves_correctly(case["source"], case))
                possible = fallback.python_variants(case["source"])
                self.assertTrue(any(bench.behaves_correctly(item, case) for item in possible))
                self.assertLessEqual(len(possible), 12)

    def test_js_fallback_is_bounded(self):
        candidates = fallback.variants("return Math.max(10, x)", limit=8)
        self.assertIn("return Math.min(10, x)", candidates)
        self.assertLessEqual(len(candidates), 8)

    def test_no_executable_syntax_added_to_python_candidates(self):
        for item in fallback.python_variants("return max(hp + heal, cap)"):
            self.assertNotIn("exec(", item)
            self.assertNotIn("import ", item)
            self.assertNotIn(";", item)


if __name__ == "__main__":
    unittest.main()
