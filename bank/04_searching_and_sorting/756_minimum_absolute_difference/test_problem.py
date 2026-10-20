from solution import minimum_abs_difference


def test_minimum_abs_difference_consecutive():
    assert minimum_abs_difference([4, 2, 1, 3]) == [[1, 2], [2, 3], [3, 4]]


def test_minimum_abs_difference_single_pair():
    assert minimum_abs_difference([1, 3, 6, 10, 15]) == [[1, 3]]


def test_minimum_abs_difference_negatives():
    assert minimum_abs_difference([3, 8, -10, 23, 19, -4, -14, 27]) == [[-14, -10], [19, 23], [23, 27]]


def test_minimum_abs_difference_two_elements():
    assert minimum_abs_difference([5, 1]) == [[1, 5]]


def test_minimum_abs_difference_around_zero():
    assert minimum_abs_difference([-1, -3, 2, 0]) == [[-1, 0]]
