#!/usr/bin/env python3
"""A1 repair pilot: stage one verified text replacement, never edit the repository."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path, PurePosixPath

PILOT_PREFIX = "tools/agentes-externos/fixtures/"
MAX_BYTES = 32768


def stage_candidate(root, output, candidate):
    """Return staged path; model-provided content is data, never executable commands."""
    if not isinstance(candidate, dict) or set(candidate) != {"path", "base_sha256", "before", "after"}:
        raise ValueError("Candidate must contain exactly four approved fields")
    name, digest, before, after = (candidate[k] for k in ("path", "base_sha256", "before", "after"))
    if not all(isinstance(x, str) for x in (name, digest, before, after)):
        raise ValueError("Candidate fields must be strings")
    p = PurePosixPath(name)
    if (not name.startswith(PILOT_PREFIX) or p.is_absolute()
            or ".." in p.parts or "." in p.parts or "\\" in name
            or p.suffix != ".py"):
        raise ValueError("Only pilot Python fixtures are allowed")
    if not before or not after or before == after or len(before) > 4096 or len(after) > 4096:
        raise ValueError("Candidate must make one small, nonempty change")
    if len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest):
        raise ValueError("Invalid SHA-256")
    root = Path(root).resolve()
    output = Path(output).resolve()
    if output == root or root in output.parents:
        raise ValueError("Staging must be outside the source checkout")
    source = root / name
    current = root
    for part in p.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("Symlinks are not allowed")
    if not source.is_file() or source.stat().st_size > MAX_BYTES:
        raise ValueError("Source fixture missing or too large")
    original = source.read_bytes()
    if hashlib.sha256(original).hexdigest() != digest:
        raise ValueError("Stale proposal: source checksum differs")
    text = original.decode("utf-8")
    if text.count(before) != 1:
        raise ValueError("Target must occur exactly once")
    modified = text.replace(before, after, 1)
    if len(modified.encode("utf-8")) > MAX_BYTES:
        raise ValueError("Result is too large")
    staged = output / name
    current = output
    for part in p.parts[:-1]:
        current = current / part
        if current.is_symlink():
            raise ValueError("Symlink in staging path")
    if staged.exists() or staged.is_symlink():
        raise ValueError("Refusing to overwrite staged content")
    staged.parent.mkdir(parents=True, exist_ok=True)
    staged.write_text(modified, encoding="utf-8")
    return staged


def propose_replacement(llama_bin, model, source, behavior, validator=None, examples=''):
    """Bounded repair loop: one proposal plus at most two test-driven retries.

    validator is a trusted local checker; no generated code is executed here.
    Its result is only a boolean. Never disclose raw model output in logs.
    """
    if not isinstance(source, str) or not isinstance(behavior, str):
        raise ValueError("Invalid repair input")
    if len(source) > 800 or len(behavior) > 240 or not isinstance(examples, str) or len(examples) > 650:
        raise ValueError("Repair prompt exceeds pilot limits")
    if validator is not None and not callable(validator):
        raise ValueError("Validator must be callable")
    system = (
        "Você corrige UM erro lógico de uma linha Python sintética. "
        "Preserve os nomes das variáveis existentes. "
        "NÃO devolva a linha original se ela contradiz o comportamento esperado. "
        "A saída é uma única linha: PATCH: seguido de um JSON válido com "
        'exatamente a chave "after". Exemplo: PATCH: {"after":"return score - spent"}. '
        "O código after começa com 'return ' e é uma expressão Python única, "
        "sem markdown, comentários, imports, execução ou explicações."
    )
    base_user = (
        "Linha original:\n" + source
        + "\nComportamento obrigatório:\n" + behavior
        + ("\nCasos de teste obrigatórios:\n" + examples if examples else "")
    )
    feedback = ""
    for attempt in range(3):
        prompt = (
            "<|im_start|system>\n" + system
            + "\n<|im_end|>\n<|im_start|user>\n"
            + base_user + feedback
            + "\n<|im_end|>\n<|im_start|assistant>\n"
        )
        result = subprocess.run(
            [llama_bin, "-m", model, "-p", prompt, "-n", "180",
             "-c", "2048", "-t", "2", "--temp", "0.1",
             "--single-turn", "--no-display-prompt", "--simple-io"],
            capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=160, check=True,
        )
        matches = re.findall(r"(?m)^PATCH:\s*(\{[^\n]{1,400}\})\s*$", result.stdout)
        if len(matches) != 1:
            feedback = "\nTentativa anterior rejeitada: formato incorreto. Gere somente uma linha PATCH: JSON."
            continue
        try:
            proposal = json.loads(matches[0])
        except json.JSONDecodeError:
            feedback = "\nTentativa anterior rejeitada: JSON inválido. Use aspas duplas e escape corretamente."
            continue
        if not isinstance(proposal, dict) or set(proposal) != {"after"}:
            raise ValueError("Model patch has invalid fields")
        after = proposal["after"]
        if not isinstance(after, str) or not after.strip():
            raise ValueError("Empty model replacement")
        if not after.startswith("return ") or len(after) > 240 or "\n" in after or "\r" in after:
            feedback = "\nTentativa anterior rejeitada: escreva somente uma linha Python 'return expressão'."
            continue
        if validator is None:
            return after
        if validator(after):
            return after
        feedback = (
            "\nA proposta anterior FALHOU nos testes automáticos de comportamento. "
            "Não a repita. Compare entradas e saídas esperadas dos testes e revise operadores. "
            "Responda com uma correção diferente no mesmo formato JSON."
        )
    raise ValueError("Model patch did not pass bounded validation")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--proposal", required=True)
    args = parser.parse_args()
    proposal = json.loads(Path(args.proposal).read_text(encoding="utf-8"))
    staged = stage_candidate(args.root, args.output, proposal)
    print("Pilot change staged for review:", staged.name)


if __name__ == "__main__":
    main()
