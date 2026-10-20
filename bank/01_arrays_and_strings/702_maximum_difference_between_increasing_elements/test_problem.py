from solution import maximum_difference


def test_maximum_difference_example_one():
    assert maximum_difference([7, 1, 5, 4]) == 4


def test_maximum_difference_decreasing():
    assert maximum_difference([9, 4, 3, 2]) == -1


def test_maximum_difference_example_three():
    assert maximum_difference([1, 5, 2, 10]) == 9


def test_maximum_difference_equal_values():
    assert maximum_difference([1, 1]) == -1


def test_maximum_difference_two_increasing():
    assert maximum_difference([1, 2]) == 1
