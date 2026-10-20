"""Parse a module's `*_PROBLEM_SET.md` into techniques and problems.

A `## ` section is a technique when it names its source file in backticks
(`hashing_problems.py`) and lists at least one `### N. Title` problem.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

HEADING_RE = re.compile(r"^###\s+(\d+)\.\s+(.*)$")
LINK_RE = re.compile(r"^\[(.+)\]\((\S+)\)$")
SOURCE_RE = re.compile(r"`([A-Za-z0-9_]+\.py)`")
SYMBOL_RE = re.compile(r"`([A-Za-z_][A-Za-z0-9_]*)`")
LEETCODE_SLUG_RE = re.compile(r"leetcode\.com/problems/([a-z0-9-]+)")


@dataclass
class IndexedProblem:
    number: int
    title: str
    url: str | None
    slug: str
    symbols: list[str]
    pattern: str | None


@dataclass
class IndexedTechnique:
    number: int
    heading: str
    source_file: str
    problems: list[IndexedProblem] = field(default_factory=list)


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def problem_slug(title: str, url: str | None) -> str:
    if url:
        match = LEETCODE_SLUG_RE.search(url)
        if match:
            return match.group(1)
    return slugify(title)


def _parse_heading(number: str, rest: str) -> IndexedProblem:
    rest = rest.strip()
    link = LINK_RE.match(rest)
    title, url = (link.group(1), link.group(2)) if link else (rest, None)
    return IndexedProblem(int(number), title, url, problem_slug(title, url), [], None)


def parse_problem_set(md_text: str) -> list[IndexedTechnique]:
    sections: list[tuple[str, str | None, list[IndexedProblem]]] = []
    heading: str | None = None
    source: str | None = None
    problems: list[IndexedProblem] = []
    current: IndexedProblem | None = None

    def close() -> None:
        if heading is not None:
            sections.append((heading, source, problems))

    for line in md_text.splitlines():
        if line.startswith("## "):
            close()
            heading, source, problems, current = line[3:].strip(), None, [], None
            continue
        if heading is None:
            continue
        match = HEADING_RE.match(line)
        if match:
            current = _parse_heading(match.group(1), match.group(2))
            problems.append(current)
            continue
        stripped = line.strip()
        if current is None:
            found = SOURCE_RE.search(line)
            if source is None and found:
                source = found.group(1)
        elif stripped.startswith("- solves:"):
            current.symbols = SYMBOL_RE.findall(stripped)
        elif stripped.startswith("- Pattern:"):
            current.pattern = stripped.removeprefix("- Pattern:").strip()
    close()

    techniques: list[IndexedTechnique] = []
    for name, src, found_problems in sections:
        if src is None or not found_problems:
            continue
        techniques.append(IndexedTechnique(len(techniques) + 1, name, src, found_problems))
    return techniques
