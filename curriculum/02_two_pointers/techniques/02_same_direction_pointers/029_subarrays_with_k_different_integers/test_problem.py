from solution import subarrays_with_k_distinct


def test_subarrays_with_k_distinct_normal():
    assert subarrays_with_k_distinct([1, 2, 1, 2, 3], 2) == 7


def test_subarrays_with_k_distinct_three():
    assert subarrays_with_k_distinct([1, 2, 1, 3, 4], 3) == 3
