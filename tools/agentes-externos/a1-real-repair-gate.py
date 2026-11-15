#!/usr/bin/env python3
"""A1 real-module repair gate: stage a small JS fix outside checkout, never merge.

Candidate JSON is untrusted model output. This tool ONLY stages data; it does not
run model text, create PRs, push commits or touch controller/cave/shared modules.
"""
import argparse
import ast
import re
import hashlib
import json
from pathlib import Path, PurePosixPath

# Explicit ownership: only small standalone modules currently scoped to A1.
# Expand only after coordination in Issue #519 and new regression tests.
ALLOWED = frozenset(("hearts3d.js",))
MAX_SOURCE = 65536
MAX_FRAGMENT = 2048



# Only a bounded, expression-only subset may reach a test runner. The Qwen
# cannot introduce calls, properties, identifiers, strings or statement syntax.
_ALLOWED_PROPERTIES = frozenset(("regenMs", "max", "hearts", "since"))
_RESERVED = frozenset(("constructor", "prototype", "__proto__", "eval", "Function", "require",
                       "import", "process", "globalThis", "window", "document", "fetch"))


def _safe_expression(fragment):
    code = fragment.strip()
    if code.startswith("return "):
        code = code[7:].strip()
    if not code or len(code) > 240 or "\n" in code or "\r" in code:
        raise ValueError("Expected one bounded JS expression")
    # Only Math.min/max, identifiers, arithmetic and numeric literals are legal.
    tokens = re.findall(r"Math\.(?:min|max)|[A-Za-z_][A-Za-z_0-9]*|\d+(?:\.\d+)?|[+*/(),.\s-]", code)
    if "".join(tokens) != code:
        raise ValueError("Unexpected JS syntax")
    names = set()
    translated = code.replace("Math.min(", "min(").replace("Math.max(", "max(")
    try:
        tree = ast.parse(translated, mode="eval")
    except SyntaxError as exc:
        raise ValueError("Invalid arithmetic expression") from exc

    def check(node):
        if isinstance(node, ast.Expression):
            check(node.body)
        elif isinstance(node, ast.Constant):
            if type(node.value) not in (int, float) or abs(node.value) > 1000000:
                raise ValueError("Invalid numeric literal")
        elif isinstance(node, ast.Name):
            if node.id in _RESERVED or node.id.startswith("__"):
                raise ValueError("Forbidden identifier")
            names.add(node.id)
        elif isinstance(node, ast.Attribute):
            if (not isinstance(node.value, ast.Name)
                    or node.attr not in _ALLOWED_PROPERTIES
                    or node.value.id in _RESERVED):
                raise ValueError("Forbidden property access")
            names.add(node.value.id + "." + node.attr)
        elif isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
            check(node.operand)
        elif isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
            check(node.left)
            check(node.right)
        elif (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
              and node.func.id in ("min", "max") and not node.keywords
              and 1 <= len(node.args) <= 3):
            for arg in node.args:
                check(arg)
        else:
            raise ValueError("Unsupported JS expression node")

    check(tree)
    return names


def _check_patch_expression(before, after):
    old_names = _safe_expression(before)
    new_names = _safe_expression(after)
    if not new_names.issubset(old_names):
        raise ValueError("New variable names forbidden")
    if before.lstrip().startswith("return ") != after.lstrip().startswith("return "):
        raise ValueError("Return statement must be preserved")


def stage(root, staging, candidate):
    if not isinstance(candidate, dict) or set(candidate) != {"path", "base_sha256", "before", "after"}:
        raise ValueError("Unexpected candidate schema")
    name, sha, before, after = (candidate[k] for k in ("path", "base_sha256", "before", "after"))
    if not all(isinstance(value, str) for value in (name, sha, before, after)):
        raise ValueError("Invalid candidate field types")
    if name not in ALLOWED or PurePosixPath(name).is_absolute() or "\\" in name:
        raise ValueError("File not owned by A1")
    if len(sha) != 64 or any(char not in "0123456789abcdef" for char in sha):
        raise ValueError("Invalid baseline sha256")
    if not before or before == after or not after or len(before) > MAX_FRAGMENT or len(after) > MAX_FRAGMENT:
        raise ValueError("Invalid or oversized patch")
    if "\x00" in before or "\x00" in after:
        raise ValueError("NUL bytes forbidden")
    _check_patch_expression(before, after)
    root = Path(root).resolve(strict=True)
    staging = Path(staging).resolve()
    if staging == root or root in staging.parents:
        raise ValueError("Staging must be outside the checkout")
    source = root / name
    if source.is_symlink() or not source.is_file():
        raise ValueError("Source is not a regular file")
    original = source.read_bytes()
    if len(original) > MAX_SOURCE or hashlib.sha256(original).hexdigest() != sha:
        raise ValueError("Stale or oversized source")
    text = original.decode("utf-8")
    if text.count(before) != 1:
        raise ValueError("Patch anchor must be unique")
    revised = text.replace(before, after, 1)
    if len(revised.encode("utf-8")) > MAX_SOURCE:
        raise ValueError("Modified source exceeds size limit")
    if staging.exists() and staging.is_symlink():
        raise ValueError("Symlinked staging directory")
    staging.mkdir(parents=True, exist_ok=True)
    target = staging / name
    if target.exists() or target.is_symlink():
        raise ValueError("Refusing to overwrite existing staged change")
    target.write_text(revised, encoding="utf-8")
    return target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--staging", required=True)
    parser.add_argument("--proposal", required=True)
    args = parser.parse_args()
    candidate = json.loads(Path(args.proposal).read_text("utf-8"))
    output = stage(args.root, args.staging, candidate)
    print("A1 candidate staged, NOT accepted as a fix:", output.name)
    print("Next: independently test staged code, compare gameplay tests, review PR.")


if __name__ == "__main__":
    main()
