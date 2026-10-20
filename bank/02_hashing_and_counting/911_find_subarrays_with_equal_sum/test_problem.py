from solution import find_subarrays


def test_find_subarrays_overlapping_pairs():
    assert find_subarrays([4, 2, 4]) is True


def test_find_subarrays_strictly_increasing():
    assert find_subarrays([1, 2, 3, 4, 5]) is False


def test_find_subarrays_all_zero():
    assert find_subarrays([0, 0, 0]) is True


def test_find_subarrays_only_one_pair():
    assert find_subarrays([1, 1]) is False


def test_find_subarrays_negative_values():
    assert find_subarrays([-1, 2, 1, 0]) is True


def test_find_subarrays_large_values():
    assert find_subarrays([10**9, -(10**9), 10**9, 5]) is True
