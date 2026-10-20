from solution import shortest_common_supersequence


def is_subsequence(small, big):
    it = iter(big)
    return all(ch in it for ch in small)


def check(str1, str2, length):
    result = shortest_common_supersequence(str1, str2)
    assert len(result) == length
    assert is_subsequence(str1, result)
    assert is_subsequence(str2, result)


def test_shortest_common_supersequence_example():
    check("abac", "cab", 5)


def test_shortest_common_supersequence_identical():
    check("aaaaaaaa", "aaaaaaaa", 8)


def test_shortest_common_supersequence_disjoint():
    check("abc", "def", 6)


def test_shortest_common_supersequence_single_chars():
    check("a", "a", 1)


def test_shortest_common_supersequence_partial_overlap():
    check("geek", "eke", 5)


def test_shortest_common_supersequence_one_contains_other():
    check("abcde", "ace", 5)
