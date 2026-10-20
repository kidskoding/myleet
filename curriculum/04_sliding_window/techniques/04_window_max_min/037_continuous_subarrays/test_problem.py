from solution import continuous_subarrays


def test_continuous_subarrays_normal():
    assert continuous_subarrays([5, 4, 2, 4]) == 8


def test_continuous_subarrays_all_within_range():
    assert continuous_subarrays([1, 2, 3]) == 6
