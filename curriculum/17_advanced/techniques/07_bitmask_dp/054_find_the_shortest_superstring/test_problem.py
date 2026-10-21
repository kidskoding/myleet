from solution import shortest_superstring


def _covers(super_s: str, words: list[str]) -> bool:
    return all(w in super_s for w in words)


def test_shortest_superstring_normal():
    words = ["alex", "loves", "leetcode"]
    ans = shortest_superstring(words)
    assert _covers(ans, words)
    assert len(ans) == len("alexlovesleetcode")


def test_shortest_superstring_overlap():
    words = ["catg", "ctaagt", "gcta", "ttca", "atgcatc"]
    ans = shortest_superstring(words)
    assert _covers(ans, words)
    assert len(ans) == 16


def test_shortest_superstring_single():
    assert shortest_superstring(["a"]) == "a"
