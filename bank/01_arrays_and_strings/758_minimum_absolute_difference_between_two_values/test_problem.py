from solution import min_absolute_difference


def test_min_absolute_difference_two_candidates():
    assert min_absolute_difference([1, 0, 0, 2, 0, 1]) == 2


def test_min_absolute_difference_no_two():
    assert min_absolute_difference([1, 0, 1, 0]) == -1


def test_min_absolute_difference_adjacent():
    assert min_absolute_difference([2, 1]) == 1


def test_min_absolute_difference_no_one():
    assert min_absolute_difference([2, 2]) == -1


def test_min_absolute_difference_alternating():
    assert min_absolute_difference([1, 2, 1, 2]) == 1
