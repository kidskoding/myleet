from solution import similar_pairs


def test_similar_pairs_example_one():
    assert similar_pairs(["aba", "aabb", "abcd", "bac", "aabc"]) == 2


def test_similar_pairs_all_similar():
    assert similar_pairs(["aabb", "ab", "ba"]) == 3


def test_similar_pairs_none():
    assert similar_pairs(["nba", "cba", "dba"]) == 0


def test_similar_pairs_single():
    assert similar_pairs(["abc"]) == 0


def test_similar_pairs_identical():
    assert similar_pairs(["aa", "aa", "aa"]) == 3
