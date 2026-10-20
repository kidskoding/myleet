from solution import find_target_sum_ways


def test_find_target_sum_ways_normal():
    assert find_target_sum_ways([1, 1, 1, 1, 1], 3) == 5


def test_find_target_sum_ways_single_zero_target():
    assert find_target_sum_ways([1], 1) == 1


def test_find_target_sum_ways_no_way():
    assert find_target_sum_ways([1], 2) == 0
