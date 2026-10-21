from solution import num_matching_subseq


def test_num_matching_subseq_normal():
    assert num_matching_subseq("abcde", ["a", "bb", "acd", "ace"]) == 3


def test_num_matching_subseq_duplicates():
    assert num_matching_subseq("dsahjpjauf", ["ahjpjau", "ja", "ahbwzgqnuk", "tnmlanowax"]) == 2


def test_num_matching_subseq_none():
    assert num_matching_subseq("abc", ["d", "e", "f"]) == 0


def test_num_matching_subseq_all_match():
    assert num_matching_subseq("abc", ["a", "b", "c", "ab", "ac", "bc", "abc"]) == 7


def test_num_matching_subseq_empty_words():
    assert num_matching_subseq("abc", []) == 0
