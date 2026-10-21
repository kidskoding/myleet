from solution import create_sorted_array


def test_create_sorted_array_normal():
    assert create_sorted_array([1, 5, 6, 2]) == 1


def test_create_sorted_array_another():
    assert create_sorted_array([1, 2, 3, 6, 5, 4]) == 3


def test_create_sorted_array_duplicates():
    assert create_sorted_array([1, 3, 3, 3, 2, 4, 2, 1, 2]) == 4


def test_create_sorted_array_single():
    assert create_sorted_array([1]) == 0
