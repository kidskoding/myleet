from solution import min_absolute_difference


def test_min_absolute_difference_equal_values_far_apart():
    assert min_absolute_difference([4, 3, 2, 4], 2) == 0


def test_min_absolute_difference_adjacent_allowed():
    assert min_absolute_difference([5, 3, 2, 10, 15], 1) == 1


def test_min_absolute_difference_only_ends():
    assert min_absolute_difference([1, 2, 3, 4], 3) == 3


def test_min_absolute_difference_zero_distance():
    assert min_absolute_difference([7, 3], 0) == 0


def test_min_absolute_difference_skips_close_neighbours():
    assert min_absolute_difference([1, 10, 5, 20], 2) == 4
