from solution import count_distinct


def test_count_distinct_example_repeats():
    assert count_distinct("aabbaba") == 21


def test_count_distinct_example_all_unique():
    assert count_distinct("abcdefg") == 28


def test_count_distinct_single_character():
    assert count_distinct("a") == 1


def test_count_distinct_one_letter_repeated():
    assert count_distinct("aaaa") == 4


def test_count_distinct_alternating():
    assert count_distinct("abab") == 7
