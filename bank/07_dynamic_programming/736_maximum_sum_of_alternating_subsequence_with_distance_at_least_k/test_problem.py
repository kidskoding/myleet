from solution import max_alternating_sum


def test_max_alternating_sum_distance_two():
    assert max_alternating_sum([5, 4, 2], 2) == 7


def test_max_alternating_sum_zigzag():
    assert max_alternating_sum([3, 5, 4, 2, 4], 1) == 14


def test_max_alternating_sum_single():
    assert max_alternating_sum([5], 1) == 5


def test_max_alternating_sum_equal_values_cannot_pair():
    assert max_alternating_sum([4, 4, 4], 1) == 4


def test_max_alternating_sum_increasing_run():
    assert max_alternating_sum([1, 2, 3], 1) == 5


def test_max_alternating_sum_distance_too_large():
    assert max_alternating_sum([1, 2, 3], 3) == 3
