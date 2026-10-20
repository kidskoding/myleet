from solution import length_of_longest_substring


def test_length_of_longest_substring_empty():
    assert length_of_longest_substring("") == 0


def test_length_of_longest_substring_single():
    assert length_of_longest_substring("a") == 1


def test_length_of_longest_substring_normal():
    assert length_of_longest_substring("abcabcbb") == 3


def test_length_of_longest_substring_all_repeats():
    assert length_of_longest_substring("bbbbb") == 1
