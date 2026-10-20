from solution import length_of_longest_substring_k_distinct


def test_length_of_longest_substring_k_distinct_single():
    assert length_of_longest_substring_k_distinct("a", 1) == 1


def test_length_of_longest_substring_k_distinct_normal():
    assert length_of_longest_substring_k_distinct("eceba", 2) == 3


def test_length_of_longest_substring_k_distinct_zero_k():
    assert length_of_longest_substring_k_distinct("abc", 0) == 0


def test_length_of_longest_substring_k_distinct_k_exceeds_distinct():
    assert length_of_longest_substring_k_distinct("aa", 5) == 2
