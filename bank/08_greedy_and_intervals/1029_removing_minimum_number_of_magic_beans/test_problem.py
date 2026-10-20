from solution import minimum_removal


def test_minimum_removal_example_one():
    assert minimum_removal([4, 1, 6, 5]) == 4


def test_minimum_removal_example_two():
    assert minimum_removal([2, 10, 3, 2]) == 7


def test_minimum_removal_single_bag():
    assert minimum_removal([5]) == 0


def test_minimum_removal_all_equal():
    assert minimum_removal([3, 3, 3]) == 0


def test_minimum_removal_empty_small_bag():
    assert minimum_removal([1, 100]) == 1
