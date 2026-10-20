from solution import good_binary_strings


def test_good_binary_strings_example_short_range():
    assert good_binary_strings(2, 3, 1, 2) == 5


def test_good_binary_strings_example_single_length():
    assert good_binary_strings(4, 4, 4, 3) == 1


def test_good_binary_strings_groups_of_one():
    assert good_binary_strings(1, 3, 1, 1) == 14


def test_good_binary_strings_impossible_length():
    assert good_binary_strings(1, 1, 2, 3) == 0


def test_good_binary_strings_mixed_groups():
    assert good_binary_strings(5, 7, 2, 3) == 7


def test_good_binary_strings_large_is_reduced():
    assert good_binary_strings(1, 60, 1, 1) == (2**61 - 2) % (10**9 + 7)
