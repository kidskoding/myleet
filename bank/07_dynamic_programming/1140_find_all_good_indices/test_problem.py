from solution import good_indices


def test_good_indices_two_good():
    assert good_indices([2, 1, 1, 1, 3, 4, 1], 2) == [2, 3]


def test_good_indices_none():
    assert good_indices([2, 1, 1, 2], 2) == []


def test_good_indices_all_equal():
    assert good_indices([1, 1, 1, 1, 1], 2) == [2]


def test_good_indices_smallest_input():
    assert good_indices([3, 2, 1], 1) == [1]


def test_good_indices_valley_max_k():
    assert good_indices([5, 4, 3, 2, 1, 2, 3, 4, 5], 4) == [4]


def test_good_indices_valley_smaller_k():
    assert good_indices([5, 4, 3, 2, 1, 2, 3, 4, 5], 3) == [3, 4, 5]
