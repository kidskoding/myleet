from solution import subarrays_div_by_k


def test_subarrays_div_by_k_normal():
    assert subarrays_div_by_k([4, 5, 0, -2, -3, 1], 5) == 7


def test_subarrays_div_by_k_single_element_divisible():
    assert subarrays_div_by_k([5], 5) == 1


def test_subarrays_div_by_k_no_match():
    assert subarrays_div_by_k([1, 2, 3], 100) == 0
