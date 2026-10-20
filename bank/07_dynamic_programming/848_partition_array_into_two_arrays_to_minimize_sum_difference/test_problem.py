from solution import minimum_difference


def test_minimum_difference_example_four():
    assert minimum_difference([3, 9, 7, 3]) == 2


def test_minimum_difference_example_two():
    assert minimum_difference([-36, 36]) == 72


def test_minimum_difference_example_negative_mix():
    assert minimum_difference([2, -1, 0, 4, -2, -9]) == 0


def test_minimum_difference_equal_values():
    assert minimum_difference([5, 5, 5, 5]) == 0


def test_minimum_difference_must_split_evenly():
    assert minimum_difference([1, 1, 1, 100]) == 99
