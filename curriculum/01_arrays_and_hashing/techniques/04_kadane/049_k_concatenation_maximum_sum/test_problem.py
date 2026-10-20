from solution import k_concatenation_max_sum


def test_k_concatenation_max_sum_positive_total():
    assert k_concatenation_max_sum([1, 2], 3) == 9


def test_k_concatenation_max_sum_non_positive_total():
    assert k_concatenation_max_sum([1, -2, 1], 5) == 2


def test_k_concatenation_max_sum_all_negative():
    assert k_concatenation_max_sum([-1, -2], 7) == 0
