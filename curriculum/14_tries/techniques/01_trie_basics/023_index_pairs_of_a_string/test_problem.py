from solution import index_pairs


def test_index_pairs_normal():
    text = "thestoryofleetcodeandme"
    words = ["story", "fleet", "leetcode"]
    assert index_pairs(text, words) == [[3, 7], [9, 13], [10, 17]]


def test_index_pairs_overlapping():
    assert index_pairs("ababa", ["aba", "ab"]) == [[0, 1], [0, 2], [2, 3], [2, 4]]


def test_index_pairs_no_matches():
    assert index_pairs("abcdef", ["xyz", "zz"]) == []


def test_index_pairs_single_char_words():
    assert index_pairs("aaa", ["a"]) == [[0, 0], [1, 1], [2, 2]]
