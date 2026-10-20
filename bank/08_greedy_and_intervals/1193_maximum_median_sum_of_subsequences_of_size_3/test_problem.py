from solution import maximum_median_sum


def test_maximum_median_sum_example_one():
    assert maximum_median_sum([2, 1, 3, 2, 1, 3]) == 5


def test_maximum_median_sum_example_two():
    assert maximum_median_sum([1, 1, 10, 10, 10, 10]) == 20


def test_maximum_median_sum_single_group():
    assert maximum_median_sum([7, 1, 4]) == 4


def test_maximum_median_sum_all_equal():
    assert maximum_median_sum([5] * 6) == 10


def test_maximum_median_sum_three_groups():
    assert maximum_median_sum([1, 2, 3, 4, 5, 6, 7, 8, 9]) == 18
