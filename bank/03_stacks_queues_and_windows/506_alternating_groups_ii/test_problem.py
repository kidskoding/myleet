from solution import number_of_alternating_groups


def test_number_of_alternating_groups_fully_alternating_odd_circle():
    assert number_of_alternating_groups([0, 1, 0, 1, 0], 3) == 3


def test_number_of_alternating_groups_long_window():
    assert number_of_alternating_groups([0, 1, 0, 0, 1, 0, 1], 6) == 2


def test_number_of_alternating_groups_none():
    assert number_of_alternating_groups([1, 1, 0, 1], 4) == 0


def test_number_of_alternating_groups_even_circle_whole_length():
    assert number_of_alternating_groups([0, 1, 0, 1], 4) == 4


def test_number_of_alternating_groups_all_same():
    assert number_of_alternating_groups([1, 1, 1, 1, 1], 3) == 0


def test_number_of_alternating_groups_wraps_around():
    assert number_of_alternating_groups([1, 0, 0, 1, 0], 3) == 3
