from pathlib import Path

import pytest

from tools.migrate.index import IndexedProblem, parse_problem_set

REPO = Path(__file__).resolve().parents[3]

FIXTURE = """# Demo Problem Set

## Goal

Some goal text mentioning `hashing_problems.py` after the heading? no.

## How To Use

`solves:` names the function.

## Hashing

`hashing_problems.py` — hash maps and sets.

### 1. [Two Sum](https://leetcode.com/problems/two-sum/)

- solves: `two_sum`
- Pattern: complement lookup in a hash map.

### 2. [Contains Duplicate](https://leetcode.com/problems/contains-duplicate/)

- solves: `contains_duplicate`
- Pattern: seen set membership check.

## Prefix Sum

`prefix_sum_problems.py` — running sums.

### 1. Range Sum Query

- solves: `NumArray`
"""


def test_parse_sections_and_problems() -> None:
    techniques = parse_problem_set(FIXTURE)
    assert [t.heading for t in techniques] == ["Hashing", "Prefix Sum"]
    assert [t.number for t in techniques] == [1, 2]
    assert techniques[0].source_file == "hashing_problems.py"
    assert techniques[0].problems[0] == IndexedProblem(
        1,
        "Two Sum",
        "https://leetcode.com/problems/two-sum/",
        "two-sum",
        ["two_sum"],
        "complement lookup in a hash map.",
    )
    assert len(techniques[0].problems) == 2


def test_multi_symbol_and_no_url() -> None:
    md = "## Codecs\n\n`codec_problems.py` — codecs.\n\n### 3. Encode Strings\n\n- solves: `Codec`, `encode`\n"
    problem = parse_problem_set(md)[0].problems[0]
    assert problem.number == 3
    assert problem.slug == "encode-strings"
    assert problem.symbols == ["Codec", "encode"]
    assert problem.url is None
    assert problem.pattern is None


def test_real_files_parse() -> None:
    files = sorted(REPO.glob("[0-9][0-9]_*/problem_set/*_PROBLEM_SET.md"))
    if not files:
        pytest.skip("old module tree already migrated")
    total = 0
    for path in files:
        for technique in parse_problem_set(path.read_text()):
            assert technique.source_file.endswith(".py"), (path, technique.heading)
            for problem in technique.problems:
                assert problem.symbols, (path, problem.title)
                total += 1
    assert 650 <= total <= 750
