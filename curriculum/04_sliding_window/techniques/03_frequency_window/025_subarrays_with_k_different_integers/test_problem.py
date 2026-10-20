from solution import subarrays_with_k_distinct


def test_subarrays_with_k_distinct_normal():
    assert subarrays_with_k_distinct([1, 2, 1, 2, 3], 2) == 7


def test_subarrays_with_k_distinct_normal_two():
    assert subarrays_with_k_distinct([1, 2, 1, 3, 4], 3) == 3


def test_subarrays_with_k_distinct_single_element():
    assert subarrays_with_k_distinct([1], 1) == 1


def test_subarrays_with_k_distinct_k_exceeds_distinct():
    assert subarrays_with_k_distinct([1, 2], 3) == 0
