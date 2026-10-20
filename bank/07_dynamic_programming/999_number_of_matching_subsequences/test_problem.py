from solution import num_matching_subseq


def test_num_matching_subseq_example_one():
    assert num_matching_subseq("abcde", ["a", "bb", "acd", "ace"]) == 3


def test_num_matching_subseq_example_two():
    assert num_matching_subseq("dsahjpjauf", ["ahjpjau", "ja", "ahbwzgqnuk", "tnmlanowax"]) == 2


def test_num_matching_subseq_duplicate_words_count_separately():
    assert num_matching_subseq("a", ["a", "a"]) == 2


def test_num_matching_subseq_word_longer_than_s():
    assert num_matching_subseq("abc", ["abcd"]) == 0


def test_num_matching_subseq_order_matters():
    assert num_matching_subseq("abc", ["c", "cb", "bc"]) == 2


def test_num_matching_subseq_repeated_letters():
    assert num_matching_subseq("aaab", ["aaa", "aaaa", "ab", "bb"]) == 2
