from solution import count_range_sum


def test_count_range_sum_normal():
    assert count_range_sum([-2, 5, -1], -2, 2) == 3


def test_count_range_sum_single_element():
    assert count_range_sum([0], 0, 0) == 1


def test_count_range_sum_no_valid_ranges():
    assert count_range_sum([10, 20], -5, 5) == 0
