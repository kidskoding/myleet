from solution import create_sorted_array


def test_create_sorted_array_example_one():
    assert create_sorted_array([1, 5, 6, 2]) == 1


def test_create_sorted_array_example_two():
    assert create_sorted_array([1, 2, 3, 6, 5, 4]) == 3


def test_create_sorted_array_with_duplicates():
    assert create_sorted_array([1, 3, 3, 3, 2, 4, 2, 1, 2]) == 4


def test_create_sorted_array_single():
    assert create_sorted_array([5]) == 0


def test_create_sorted_array_all_equal():
    assert create_sorted_array([2, 2, 2]) == 0


def test_create_sorted_array_middle_insertions():
    assert create_sorted_array([4, 1, 3, 2]) == 2
