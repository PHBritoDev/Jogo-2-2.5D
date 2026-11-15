"""Unit tests: semantic benchmark tests repairs without executing generated code."""
import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).with_name("a1-repair-benchmark.py")
spec = importlib.util.spec_from_file_location("a1_repair_benchmark", path)
bench = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bench)


class RepairBenchmarkTests(unittest.TestCase):
    def test_examples_are_red_before_green(self):
        for c in bench.CASES:
            self.assertFalse(bench.behaves_correctly(c["source"], c))
            self.assertTrue(bench.behaves_correctly(c["expected"], c))

    def test_correct_repairs_are_accepted(self):
        answers = {c["source"]: c["expected"] for c in bench.CASES}
        results = bench.evaluate(lambda source, behavior: answers[source])
        self.assertEqual(sum(r["pass"] for r in results), len(bench.CASES))

    def test_semantically_equivalent_replacement_is_accepted(self):
        cap = bench.CASES[0]
        self.assertTrue(bench.behaves_correctly("return min(maximum, current + heal)", cap))

    def test_multiline_candidate_rejected_even_if_semantically_correct(self):
        # Contrato do piloto: uma única linha de retorno; newline real não equivale a "\\n".
        c = bench.CASES[1]
        self.assertFalse(bench.behaves_correctly("return max(\\n    0, hp - damage\\n)", c))
        self.assertTrue(bench.behaves_correctly("return max(0, hp - damage)", c))

    def test_noop_is_rejected(self):
        results = bench.evaluate(lambda source, behavior: source)
        self.assertFalse(any(r["pass"] for r in results))

    def test_unsafe_constructs_cannot_run(self):
        c = bench.CASES[0]
        unsafe = (
            "return __import__('os').system('true')",
            "return open('/tmp/x').read()",
            "return (lambda: 10)()",
            "return current.__class__",
            "return min(maximum, current + heal); __import__('os')",
            "return max(current + heal, maximum)\nprint('run')",
        )
        self.assertTrue(all(not bench.behaves_correctly(x, c) for x in unsafe))

    def test_partial_benchmark_fails(self):
        first = bench.CASES[0]
        results = bench.evaluate(lambda source, behavior:
                                 first["expected"] if source == first["source"] else source)
        self.assertEqual(sum(r["pass"] for r in results), 1)

    def test_candidate_must_pass_all_cases(self):
        c = bench.CASES[1]
        self.assertFalse(bench.behaves_correctly("return hp - damage if hp > damage else 0", c))
        self.assertFalse(bench.behaves_correctly("return max(0, hp - damage + 1)", c))


if __name__ == "__main__":
    unittest.main()
