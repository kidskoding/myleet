from solution import find_array


def test_find_array_example():
    assert find_array([5, 2, 0, 3, 1]) == [5, 7, 2, 3, 2]


def test_find_array_single():
    assert find_array([13]) == [13]


def test_find_array_all_zero():
    assert find_array([0, 0, 0]) == [0, 0, 0]


def test_find_array_repeated_prefix():
    assert find_array([1, 1, 1]) == [1, 0, 0]


def test_find_array_back_to_zero():
    assert find_array([7, 0]) == [7, 7]
