"""Unit tests: benchmark distinguishes genuine repairs without executing generated code."""
import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).with_name("a1-repair-benchmark.py")
spec = importlib.util.spec_from_file_location("a1_repair_benchmark", path)
bench = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bench)


class RepairBenchmarkTests(unittest.TestCase):
    def test_examples_require_real_changes(self):
        self.assertTrue(all(not bench.same_python_code(c["source"], c["expected"])
                            for c in bench.CASES))

    def test_benchmark_accepts_correct_changes(self):
        answers = {c["source"]: c["expected"] for c in bench.CASES}
        results = bench.evaluate(lambda source, behavior: answers[source])
        self.assertEqual(sum(r["pass"] for r in results), len(bench.CASES))

    def test_benchmark_rejects_noop(self):
        results = bench.evaluate(lambda source, behavior: source)
        self.assertFalse(any(r["pass"] for r in results))

    def test_benchmark_rejects_unsafe_syntax_without_executing(self):
        self.assertFalse(bench.same_python_code("return __import__('os').system('true')",
                                                 "return min(1, 2)"))
        results = bench.evaluate(lambda source, behavior: "return 0")
        self.assertFalse(any(r["pass"] for r in results))

    def test_partial_benchmark_is_not_reported_as_total_success(self):
        first = bench.CASES[0]
        results = bench.evaluate(lambda source, behavior:
                                 first["expected"] if source == first["source"] else source)
        self.assertEqual(sum(r["pass"] for r in results), 1)


if __name__ == "__main__":
    unittest.main()
