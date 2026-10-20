from solution import count_subarrays


def test_count_subarrays_normal():
    assert count_subarrays([1, 3, 5, 2, 7, 5], 1, 5) == 2


def test_count_subarrays_all_equal():
    assert count_subarrays([1, 1, 1, 1], 1, 1) == 10
