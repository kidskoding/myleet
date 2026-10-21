from solution import count_subarrays


def test_count_subarrays_example_one():
    assert count_subarrays([3, 2, 1, 4, 5], 4) == 3


def test_count_subarrays_example_two():
    assert count_subarrays([2, 3, 1, 4, 5], 4) == 3


def test_count_subarrays_single():
    assert count_subarrays([7], 7) == 1


def test_count_subarrays_k_at_end():
    assert count_subarrays([1, 2, 3], 3) == 1
