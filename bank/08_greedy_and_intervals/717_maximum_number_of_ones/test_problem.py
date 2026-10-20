from solution import maximum_number_of_ones


def test_maximum_number_of_ones_one_per_square():
    assert maximum_number_of_ones(3, 3, 2, 1) == 4


def test_maximum_number_of_ones_two_per_square():
    assert maximum_number_of_ones(3, 3, 2, 2) == 6


def test_maximum_number_of_ones_no_ones_allowed():
    assert maximum_number_of_ones(4, 4, 2, 0) == 0


def test_maximum_number_of_ones_square_is_whole_grid():
    assert maximum_number_of_ones(2, 2, 2, 3) == 3


def test_maximum_number_of_ones_side_one():
    assert maximum_number_of_ones(3, 5, 1, 1) == 15


def test_maximum_number_of_ones_rectangular_grid():
    assert maximum_number_of_ones(5, 2, 2, 1) == 3
