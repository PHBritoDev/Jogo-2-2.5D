"""Behavior tests for real-module red/green verification."""
import hashlib
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

module = Path(__file__).with_name("a1-real-repair-verify.py")
spec = importlib.util.spec_from_file_location("a1_real_verify", module)
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


class RedGreenTests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root / "hearts3d.js"
        self.original = "export function hearts(x) { return Math.max(10, x); }\n"
        self.source.write_text(self.original, encoding="utf-8")
        self.tests = self.root / "hearts3d.test.mjs"
        self.tests.write_text(
            "import test from 'node:test';\n"
            "import assert from 'node:assert/strict';\n"
            "import { hearts } from './hearts3d.js';\n"
            "test('cap at 10', () => assert.equal(hearts(14), 10));\n",
            encoding="utf-8",
        )
        self.proposal = {
            "path": "hearts3d.js",
            "base_sha256": hashlib.sha256(self.original.encode()).hexdigest(),
            "before": "Math.max(10, x)",
            "after": "Math.min(10, x)",
        }

    def test_red_then_green_without_checkout_mutation(self):
        result = verify.verify(self.root, self.proposal)
        self.assertEqual(result, {
            "original_passes": False,
            "candidate_passes": True,
            "verified_red_green": True,
        })
        self.assertEqual(self.source.read_text(), self.original)

    def test_rejects_patch_that_does_not_fix_failure(self):
        self.proposal["after"] = "Math.max(11, x)"
        result = verify.verify(self.root, self.proposal)
        self.assertFalse(result["verified_red_green"])
        self.assertFalse(result["candidate_passes"])

    def test_rejects_when_original_already_passes(self):
        self.tests.write_text(
            "import test from 'node:test';\n"
            "import assert from 'node:assert/strict';\n"
            "import { hearts } from './hearts3d.js';\n"
            "test('unchanged', () => assert.equal(hearts(5), 10));\n",
            encoding="utf-8")
        result = verify.verify(self.root, self.proposal)
        self.assertFalse(result["verified_red_green"])
        self.assertTrue(result["original_passes"])


if __name__ == "__main__":
    unittest.main()
