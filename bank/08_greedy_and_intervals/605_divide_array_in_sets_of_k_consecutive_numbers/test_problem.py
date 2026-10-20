from solution import is_possible_divide


def test_is_possible_divide_two_groups():
    assert is_possible_divide([1, 2, 3, 3, 4, 4, 5, 6], 4) is True


def test_is_possible_divide_four_groups():
    assert is_possible_divide([3, 2, 1, 2, 3, 4, 3, 4, 5, 9, 10, 11], 3) is True


def test_is_possible_divide_length_not_multiple():
    assert is_possible_divide([1, 2, 3, 4], 3) is False


def test_is_possible_divide_duplicates_stacked():
    assert is_possible_divide([3, 3, 2, 2, 1, 1], 3) is True


def test_is_possible_divide_k_one():
    assert is_possible_divide([5, 1, 5], 1) is True


def test_is_possible_divide_gap():
    assert is_possible_divide([1, 3], 2) is False
