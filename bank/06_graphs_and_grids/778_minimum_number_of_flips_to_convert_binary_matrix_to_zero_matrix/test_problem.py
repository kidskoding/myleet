from solution import min_flips


def test_min_flips_two_by_two():
    assert min_flips([[0, 0], [0, 1]]) == 3


def test_min_flips_already_zero():
    assert min_flips([[0]]) == 0


def test_min_flips_impossible():
    assert min_flips([[1, 0, 0], [1, 0, 0]]) == -1


def test_min_flips_single_one():
    assert min_flips([[1]]) == 1


def test_min_flips_single_cross():
    assert min_flips([[0, 1, 0], [1, 1, 1], [0, 1, 0]]) == 1


def test_min_flips_row_of_ones():
    assert min_flips([[1, 1, 1]]) == 1
