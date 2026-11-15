import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import collect  # noqa: E402


def test_match_needs_lc_context_and_exact_titles():
    P = {
        "a": {"id": "a", "lc": 146, "slug": "lru-cache", "title": "LRU Cache"},
        "b": {"id": "b", "lc": 2, "slug": "add-two-numbers", "title": "Add Two Numbers"},
    }
    assert collect.match("they asked LC 146", P) == {"a"}
    assert collect.match("1. 2. 3. question 2 and #2", P) == set()
    assert collect.match("I got the add two numbers problem", P) == {"b"}


def test_about_needs_interview_word_and_company():
    c = {"aliases": ["amazon"]}
    assert collect.about(c, "My Amazon OA", "")
    assert not collect.about(c, "Amazon is big", "")
