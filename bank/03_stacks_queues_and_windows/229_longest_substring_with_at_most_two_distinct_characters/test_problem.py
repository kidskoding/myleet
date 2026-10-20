from solution import length_of_longest_substring_two_distinct


def test_length_of_longest_substring_two_distinct_basic():
    assert length_of_longest_substring_two_distinct("eceba") == 3


def test_length_of_longest_substring_two_distinct_long_run():
    assert length_of_longest_substring_two_distinct("ccaabbb") == 5


def test_length_of_longest_substring_two_distinct_empty():
    assert length_of_longest_substring_two_distinct("") == 0


def test_length_of_longest_substring_two_distinct_single():
    assert length_of_longest_substring_two_distinct("a") == 1


def test_length_of_longest_substring_two_distinct_window_at_end():
    assert length_of_longest_substring_two_distinct("abaccc") == 4


def test_length_of_longest_substring_two_distinct_whole_string():
    assert length_of_longest_substring_two_distinct("ababab") == 6
