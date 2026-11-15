"""Security and behavior tests for the A1 staged repair pilot (no model/API)."""
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

module_path = Path(__file__).with_name("a1-repair-gate.py")
spec = importlib.util.spec_from_file_location("a1_repair_gate", module_path)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class RepairGateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "repo"
        self.output = Path(self.tmp.name) / "staging"
        self.file = self.root / "tools/agentes-externos/fixtures/damage_math.py"
        self.file.parent.mkdir(parents=True)
        self.original = "def remaining_hp(hp, damage):\n    return hp + damage\n"
        self.file.write_text(self.original)
        self.candidate = {
            "path": "tools/agentes-externos/fixtures/damage_math.py",
            "base_sha256": hashlib.sha256(self.original.encode()).hexdigest(),
            "before": "return hp + damage",
            "after": "return hp - damage",
        }

    def test_repair_is_staged_and_reproduced_without_touching_source(self):
        staged = gate.stage_candidate(self.root, self.output, self.candidate)
        self.assertEqual(self.file.read_text(), self.original)
        namespace = {}
        exec(compile(staged.read_text(), str(staged), "exec"), namespace)
        self.assertEqual(namespace["remaining_hp"](10, 3), 7)
        self.assertIn("return hp - damage", staged.read_text())

    def test_model_replacement_is_data_not_executable(self):
        from unittest.mock import patch
        fake = type("Result", (), {"stdout": (
            "available commands:\\n> PATCH: schema\\n"
            "PATCH: {\\"after\\": \\"return hp - damage\\"}\\n"
        )})()
        with patch.object(gate.subprocess, "run", return_value=fake) as run:
            after = gate.propose_replacement("/tmp/llama", "/tmp/model.gguf",
                                             self.original, "10 HP - 3 = 7")
        self.candidate["after"] = after
        staged = gate.stage_candidate(self.root, self.output, self.candidate)
        self.assertIn("return hp - damage", staged.read_text())
        self.assertNotIn("PATCH:", staged.read_text())
        self.assertEqual(run.call_args.args[0][0], "/tmp/llama")

    def test_rejects_model_patch_with_unexpected_fields(self):
        from unittest.mock import patch
        fake = type("Result", (), {"stdout": (
            'PATCH: {"after":"return hp - damage","command":"delete files"}\\n'
        )})()
        with patch.object(gate.subprocess, "run", return_value=fake):
            with self.assertRaisesRegex(ValueError, "invalid fields"):
                gate.propose_replacement("llama", "model", self.original, "10 - 3 = 7")

    def test_rejects_stale_checksum(self):
        self.candidate["base_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "checksum"):
            gate.stage_candidate(self.root, self.output, self.candidate)

    def test_rejects_gameplay_or_cave_paths(self):
        for path in ("eldoria-cave.js", "combat-rig3d.js", "tools/agentes-externos/fixtures/../../world3d-terrain.js"):
            with self.subTest(path=path):
                self.candidate["path"] = path
                with self.assertRaises(ValueError):
                    gate.stage_candidate(self.root, self.output, self.candidate)

    def test_rejects_multiple_occurrences(self):
        self.file.write_text(self.original + self.original)
        self.candidate["base_sha256"] = hashlib.sha256(self.file.read_bytes()).hexdigest()
        with self.assertRaisesRegex(ValueError, "exactly once"):
            gate.stage_candidate(self.root, self.output, self.candidate)

    def test_rejects_noop_and_extra_fields(self):
        self.candidate["after"] = self.candidate["before"]
        with self.assertRaises(ValueError):
            gate.stage_candidate(self.root, self.output, self.candidate)
        self.candidate["after"] = "return hp - damage"
        self.candidate["command"] = "rm -rf ."
        with self.assertRaises(ValueError):
            gate.stage_candidate(self.root, self.output, self.candidate)

    def test_rejects_staging_inside_checkout(self):
        with self.assertRaisesRegex(ValueError, "outside"):
            gate.stage_candidate(self.root, self.root / "stage", self.candidate)

    def test_rejects_symlinked_fixture(self):
        self.file.unlink()
        other = Path(self.tmp.name) / "outside.py"
        other.write_text(self.original)
        self.file.symlink_to(other)
        with self.assertRaisesRegex(ValueError, "Symlinks"):
            gate.stage_candidate(self.root, self.output, self.candidate)


if __name__ == "__main__":
    unittest.main()
