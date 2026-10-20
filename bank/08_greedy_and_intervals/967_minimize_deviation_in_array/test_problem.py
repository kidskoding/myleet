from solution import minimum_deviation


def test_minimum_deviation_example_one():
    assert minimum_deviation([1, 2, 3, 4]) == 1


def test_minimum_deviation_example_two():
    assert minimum_deviation([4, 1, 5, 20, 3]) == 3


def test_minimum_deviation_example_three():
    assert minimum_deviation([2, 10, 8]) == 3


def test_minimum_deviation_two_odds():
    assert minimum_deviation([3, 5]) == 1


def test_minimum_deviation_already_equal():
    assert minimum_deviation([6, 6, 6]) == 0


def test_minimum_deviation_powers_of_two():
    assert minimum_deviation([1, 1024]) == 0
