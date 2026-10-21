from solution import minimum_difference


def test_minimum_difference_exact():
    assert minimum_difference([1, 2, 4, 5], 3) == 0


def test_minimum_difference_example_two():
    assert minimum_difference([1, 3, 1, 3], 2) == 1


def test_minimum_difference_single():
    assert minimum_difference([1], 10) == 9


def test_minimum_difference_all_large():
    assert minimum_difference([8, 8, 8], 1) == 7


def test_minimum_difference_match_element():
    assert minimum_difference([5, 7, 9], 7) == 0
