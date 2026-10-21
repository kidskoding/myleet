from solution import maximum_sum_of_heights


def test_maximum_sum_of_heights_example_one():
    assert maximum_sum_of_heights([5, 3, 4, 1, 1]) == 13


def test_maximum_sum_of_heights_example_two():
    assert maximum_sum_of_heights([6, 5, 3, 9, 2, 7]) == 22


def test_maximum_sum_of_heights_example_three():
    assert maximum_sum_of_heights([3, 2, 5, 5, 2, 3]) == 18


def test_maximum_sum_of_heights_single():
    assert maximum_sum_of_heights([7]) == 7


def test_maximum_sum_of_heights_decreasing():
    assert maximum_sum_of_heights([5, 4, 3, 2, 1]) == 15
