from solution import max_alternating_sum


def test_max_alternating_sum_example_one():
    assert max_alternating_sum([1, 2, 3]) == 12


def test_max_alternating_sum_example_two():
    assert max_alternating_sum([1, -1, 2, -2, 3, -3]) == 16


def test_max_alternating_sum_single():
    assert max_alternating_sum([-5]) == 25


def test_max_alternating_sum_two():
    assert max_alternating_sum([4, 1]) == 15


def test_max_alternating_sum_zeros():
    assert max_alternating_sum([0, 0, 0]) == 0
