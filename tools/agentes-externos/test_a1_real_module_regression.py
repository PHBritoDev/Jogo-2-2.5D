"""A1 repairs an intentionally mutated EXISTING RPG function, not an appended toy.

The real hearts3d.js and its committed regressions are copied to a temporary
directory. A mocked model proposes a fix for a corrupted expression. Neither
the source file nor the production branch is modified.
"""
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import unittest

directory = Path(__file__).resolve().parent
repo = directory.parent.parent
spec = importlib.util.spec_from_file_location("a1_actual_module_pipeline",
                                               directory / "a1-repair-real-pilot.py")
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)


class ActualModuleRegression(unittest.TestCase):
    def test_real_hearts_timer_mutation_is_repaired_and_tests_turn_green(self):
        fixed_expression = "return Math.max(0, HEARTS.regenMs - Math.max(0, now - since))"
        broken_expression = "return Math.min(0, HEARTS.regenMs - Math.max(0, now - since))"
        actual = (repo / "hearts3d.js").read_text(encoding="utf-8")
        if actual.count(fixed_expression) != 1:
            self.fail("Real timer implementation changed; inspect the target, do not silently skip")
        with TemporaryDirectory(prefix="a1-real-module-") as tmp:
            root = Path(tmp)
            corrupted = actual.replace(fixed_expression, broken_expression, 1)
            (root / "hearts3d.js").write_text(corrupted, encoding="utf-8")
            (root / "hearts3d.test.mjs").write_bytes((repo / "hearts3d.test.mjs").read_bytes())
            with patch.object(pipeline.proposer, "propose_replacement",
                              return_value=fixed_expression) as model:
                result = pipeline.run(
                    root, broken_expression,
                    "Cronômetro nunca negativo. Com 1 minuto decorrido, faltam 2 minutos.",
                    "llama", "model",
                )
            self.assertEqual(result["result"], "verified_candidate")
            self.assertFalse(result["original_passes"])
            self.assertTrue(result["candidate_passes"])
            self.assertEqual((root / "hearts3d.js").read_text(), corrupted)
            self.assertIn("HEARTS.regenMs", model.call_args.args[2])
            self.assertEqual((repo / "hearts3d.js").read_text(), actual)

    def test_property_injection_is_rejected(self):
        for malicious in ("return HEARTS.constructor", "return state.__proto__",
                          "return state.hearts.toString()", "return HEARTS.newField"):
            with self.subTest(malicious=malicious):
                with self.assertRaises(ValueError):
                    pipeline.gate._safe_expression(malicious)


if __name__ == "__main__":
    unittest.main()
