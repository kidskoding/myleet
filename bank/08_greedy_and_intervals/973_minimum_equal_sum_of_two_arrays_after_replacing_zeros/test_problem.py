from solution import min_sum


def test_min_sum_example_one():
    assert min_sum([3, 2, 0, 1, 0], [6, 5, 0]) == 12


def test_min_sum_impossible():
    assert min_sum([2, 0, 2, 0], [1, 4]) == -1


def test_min_sum_no_zeros_equal():
    assert min_sum([1, 2], [3]) == 3


def test_min_sum_no_zeros_unequal():
    assert min_sum([1, 2], [4]) == -1


def test_min_sum_all_zeros():
    assert min_sum([0, 0], [0]) == 2
