from solution import count_good_subsequences


def test_count_good_subsequences_two_pairs():
    assert count_good_subsequences("aabb") == 11


def test_count_good_subsequences_one_repeated_letter():
    assert count_good_subsequences("leet") == 12


def test_count_good_subsequences_distinct_letters():
    assert count_good_subsequences("abcd") == 15


def test_count_good_subsequences_single_char():
    assert count_good_subsequences("a") == 1


def test_count_good_subsequences_mixed_counts():
    assert count_good_subsequences("aaabbc") == 31


def test_count_good_subsequences_long_single_letter_modulo():
    assert count_good_subsequences("a" * 10000) == 905611804
