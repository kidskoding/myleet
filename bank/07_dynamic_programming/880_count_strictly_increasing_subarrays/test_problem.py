from solution import count_subarrays


def test_count_subarrays_example():
    assert count_subarrays([1, 3, 5, 4, 4, 6]) == 10


def test_count_subarrays_fully_increasing():
    assert count_subarrays([1, 2, 3, 4, 5]) == 15


def test_count_subarrays_single():
    assert count_subarrays([7]) == 1


def test_count_subarrays_all_equal():
    assert count_subarrays([2, 2, 2]) == 3


def test_count_subarrays_decreasing():
    assert count_subarrays([3, 2, 1]) == 3


def test_count_subarrays_repeating_pattern():
    assert count_subarrays([1, 2, 1, 2]) == 6
