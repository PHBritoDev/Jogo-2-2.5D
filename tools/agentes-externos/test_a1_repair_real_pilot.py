"""End-to-end A1 pipeline tests with mocked model, real JS regression runner."""
import hashlib
import json
import sys
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import unittest

path = Path(__file__).with_name("a1-repair-real-pilot.py")
spec = importlib.util.spec_from_file_location("a1_pipeline", path)
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.work = TemporaryDirectory()
        self.addCleanup(self.work.cleanup)
        self.root = Path(self.work.name)
        self.bad = "return Math.max(10, x)"
        self.good = "return Math.min(10, x)"
        self.original = "export function cap(x) { " + self.bad + "; }\n"
        (self.root / "hearts3d.js").write_text(self.original)
        (self.root / "hearts3d.test.mjs").write_text(
            "import test from 'node:test';\n"
            "import assert from 'node:assert/strict';\n"
            "import { cap } from './hearts3d.js';\n"
            "test('caps to 10', () => assert.equal(cap(14), 10));\n"
        )

    def test_model_fix_passes_red_green_without_modifying_repository(self):
        with patch.object(pipeline.proposer, "propose_replacement", return_value=self.good) as model:
            result = pipeline.run(self.root, self.bad, "Cap to ten", "llama", "model")
        self.assertEqual(result["result"], "verified_candidate")
        self.assertFalse(result["original_passes"])
        self.assertTrue(result["candidate_passes"])
        self.assertEqual((self.root / "hearts3d.js").read_text(), self.original)
        self.assertEqual(result["baseline_sha256"], hashlib.sha256(self.original.encode()).hexdigest())
        self.assertEqual(model.call_args.kwargs["language"], "JavaScript")

    def test_cli_exports_reviewable_patch_outside_checkout(self):
        from io import StringIO
        from contextlib import redirect_stdout
        destination = self.root.parent / "review-patch.json"
        with patch.object(pipeline.proposer, "propose_replacement", return_value=self.good):
            with patch.object(sys, "argv", [
                "a1-repair-real-pilot.py", "--root", str(self.root),
                "--llama", "llama", "--model", "model",
                "--before", self.bad, "--behavior", "Cap to ten",
                "--output", str(destination),
            ]):
                with redirect_stdout(StringIO()):
                    pipeline.main()
        proposal = json.loads(destination.read_text(encoding="utf-8"))
        self.assertEqual(proposal["after"], self.good)
        self.assertEqual(proposal["path"], "hearts3d.js")
        self.assertEqual((self.root / "hearts3d.js").read_text(), self.original)

    def test_cli_does_not_export_patch_into_repository(self):
        from io import StringIO
        from contextlib import redirect_stdout
        destination = self.root / "unsafe-patch.json"
        with patch.object(pipeline.proposer, "propose_replacement", return_value=self.good):
            with patch.object(sys, "argv", [
                "a1-repair-real-pilot.py", "--root", str(self.root),
                "--llama", "llama", "--model", "model",
                "--before", self.bad, "--behavior", "Cap to ten",
                "--output", str(destination),
            ]):
                with redirect_stdout(StringIO()):
                    with self.assertRaisesRegex(ValueError, "outside checkout"):
                        pipeline.main()
        self.assertFalse(destination.exists())

    def test_dangerous_model_patch_rejected_before_node_execution(self):
        with patch.object(pipeline.proposer, "propose_replacement",
                          return_value="return process.exit(0)"):
            with patch.object(pipeline.verify, "verify") as verifier:
                with self.assertRaises(ValueError):
                    pipeline.run(self.root, self.bad, "Cap to ten", "llama", "model")
                verifier.assert_not_called()

    def test_cannot_apply_fix_when_no_red_baseline(self):
        (self.root / "hearts3d.test.mjs").write_text(
            "import test from 'node:test';\n"
            "import assert from 'node:assert/strict';\n"
            "import { cap } from './hearts3d.js';\n"
            "test('baseline passes', () => assert.equal(cap(5), 10));\n"
        )
        with patch.object(pipeline.proposer, "propose_replacement", return_value=self.good):
            result = pipeline.run(self.root, self.bad, "Cap to ten", "llama", "model")
        self.assertEqual(result["result"], "rejected")
        self.assertTrue(result["original_passes"])

    def test_untrusted_anchor_rejected_before_model(self):
        with patch.object(pipeline.proposer, "propose_replacement") as model:
            with self.assertRaises(ValueError):
                pipeline.run(self.root, "return process.exit(0)", "Cap to ten", "llama", "model")
            model.assert_not_called()


if __name__ == "__main__":
    unittest.main()
