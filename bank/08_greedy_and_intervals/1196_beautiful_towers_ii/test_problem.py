from solution import maximum_sum_of_heights


def test_beautiful_towers_example_one():
    assert maximum_sum_of_heights([5, 3, 4, 1, 1]) == 13


def test_beautiful_towers_example_two():
    assert maximum_sum_of_heights([6, 5, 3, 9, 2, 7]) == 22


def test_beautiful_towers_example_three():
    assert maximum_sum_of_heights([3, 2, 5, 5, 2, 3]) == 18


def test_beautiful_towers_single():
    assert maximum_sum_of_heights([10]) == 10


def test_beautiful_towers_increasing():
    assert maximum_sum_of_heights([1, 2, 3, 4]) == 10
