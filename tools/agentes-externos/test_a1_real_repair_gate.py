"""Tests for A1 real game repair staging; no untrusted generated code is executed."""
import hashlib
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

path = Path(__file__).with_name("a1-real-repair-gate.py")
spec = importlib.util.spec_from_file_location("a1_real_gate", path)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class RealRepairGateTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        base = Path(self.temp.name)
        self.root = base / "repo"
        self.root.mkdir()
        self.staging = base / "out"
        self.source = self.root / "hearts3d.js"
        self.original = "export function capHearts(value) { return Math.max(10, value); }\n"
        self.source.write_text(self.original, encoding="utf-8")
        self.proposal = {
            "path": "hearts3d.js",
            "base_sha256": hashlib.sha256(self.original.encode()).hexdigest(),
            "before": "Math.max(10, value)",
            "after": "Math.min(10, value)",
        }

    def test_stage_real_module_without_modifying_checkout(self):
        target = gate.stage(self.root, self.staging, self.proposal)
        self.assertIn("Math.min(10, value)", target.read_text())
        self.assertEqual(self.source.read_text(), self.original)

    def test_deny_shared_controller_cave_and_nonallowlisted_modules(self):
        for name in ("mundo-3d-prototype.js", "ascension-cave3d.js",
                     "act1-flow.js", "audio3d.js", "../hearts3d.js"):
            with self.subTest(name=name):
                self.proposal["path"] = name
                with self.assertRaisesRegex(ValueError, "not owned"):
                    gate.stage(self.root, self.staging, self.proposal)

    def test_reject_stale_sha(self):
        self.proposal["base_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "Stale"):
            gate.stage(self.root, self.staging, self.proposal)

    def test_reject_ambiguous_anchor_and_noop(self):
        self.proposal["before"] = "return"
        self.source.write_text(self.original.replace("return", "return return"))
        self.proposal["base_sha256"] = hashlib.sha256(self.source.read_bytes()).hexdigest()
        with self.assertRaisesRegex(ValueError, "unique"):
            gate.stage(self.root, self.staging, self.proposal)
        self.proposal["after"] = self.proposal["before"]
        with self.assertRaisesRegex(ValueError, "Invalid or oversized"):
            gate.stage(self.root, self.staging, self.proposal)

    def test_reject_staging_inside_checkout(self):
        with self.assertRaisesRegex(ValueError, "outside"):
            gate.stage(self.root, self.root / "output", self.proposal)

    def test_reject_symlinked_source(self):
        self.source.unlink()
        external = Path(self.temp.name) / "external.js"
        external.write_text(self.original)
        self.source.symlink_to(external)
        with self.assertRaisesRegex(ValueError, "regular file"):
            gate.stage(self.root, self.staging, self.proposal)

    def test_reject_second_candidate_overwrite(self):
        gate.stage(self.root, self.staging, self.proposal)
        with self.assertRaisesRegex(ValueError, "overwrite"):
            gate.stage(self.root, self.staging, self.proposal)


if __name__ == "__main__":
    unittest.main()
