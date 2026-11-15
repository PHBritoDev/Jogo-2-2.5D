#!/usr/bin/env python3
"""Bounded deterministic repair candidates for arithmetic mistakes in game JS.

No model, external commands, repository writes or evaluation of arbitrary
expressions. Suggestions must pass the same AST gate and *trusted* red/green
regressions before they can become reviewable patches.
"""
import re


def variants(before, limit=16):
    if not isinstance(before, str) or not before.strip() or len(before) > 240:
        raise ValueError("Invalid trusted expression")
    if not isinstance(limit, int) or limit < 1 or limit > 32:
        raise ValueError("Invalid search bound")
    options = []
    seen = {before}

    def add(text):
        if text not in seen and len(text) <= 240:
            seen.add(text)
            options.append(text)

    # One operator flip at a time; preserve existing identifiers.
    for a, b in (("Math.max(", "Math.min("), ("Math.min(", "Math.max(")):
        for match in re.finditer(re.escape(a), before):
            add(before[:match.start()] + b + before[match.end():])
    # Arithmetic mutation is limited to spaces around binary operators;
    # minus signs inside number literals are not guessed.
    for match in re.finditer(r"(?<=\w)\s([+-])\s(?=\w)", before):
        op = "-" if match.group(1) == "+" else "+"
        add(before[:match.start(1)] + op + before[match.end(1):])
    if before.startswith("return "):
        expression = before[7:]
        add("return Math.max(0, " + expression + ")")
        add("return Math.min(10, " + expression + ")")
    return options[:limit]
