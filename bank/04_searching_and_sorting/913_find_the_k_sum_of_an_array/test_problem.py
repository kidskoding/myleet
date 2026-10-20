from solution import k_sum


def test_k_sum_small_mixed():
    assert k_sum([2, 4, -2], 5) == 2


def test_k_sum_larger_example():
    assert k_sum([1, -2, 3, 4, -10, 12], 16) == 10


def test_k_sum_first_is_sum_of_positives():
    assert k_sum([3, -1, 5], 1) == 8


def test_k_sum_all_negative():
    assert k_sum([-1, -2], 1) == 0
    assert k_sum([-1, -2], 2) == -1
    assert k_sum([-1, -2], 4) == -3


def test_k_sum_duplicate_sums_count_separately():
    assert k_sum([1, 1, 1], 4) == 2


def test_k_sum_single_element():
    assert k_sum([7], 2) == 0
