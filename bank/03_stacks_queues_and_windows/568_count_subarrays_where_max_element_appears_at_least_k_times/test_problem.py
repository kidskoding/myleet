from solution import count_subarrays


def test_count_subarrays_example_one():
    assert count_subarrays([1, 3, 2, 3, 3], 2) == 6


def test_count_subarrays_not_enough_maxes():
    assert count_subarrays([1, 4, 2, 1], 3) == 0


def test_count_subarrays_single_element():
    assert count_subarrays([5], 1) == 1


def test_count_subarrays_all_equal():
    assert count_subarrays([2, 2, 2], 2) == 3


def test_count_subarrays_k_one_counts_windows_with_max():
    assert count_subarrays([1, 3, 1, 3, 1], 1) == 12
