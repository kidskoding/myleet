from solution import split_array


def test_split_array_basic():
    assert split_array([7, 2, 5, 10, 8], 2) == 18


def test_split_array_single_group():
    assert split_array([1, 2, 3, 4, 5], 1) == 15


def test_split_array_groups_equal_length():
    assert split_array([1, 4, 4], 3) == 4


def test_split_array_single_element():
    assert split_array([5], 1) == 5
