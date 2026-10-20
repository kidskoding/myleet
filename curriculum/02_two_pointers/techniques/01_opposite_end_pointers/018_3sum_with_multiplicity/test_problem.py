from solution import three_sum_multi


def test_three_sum_multi_distinct_values():
    assert three_sum_multi([1, 1, 2, 2, 3, 3, 4, 4, 5, 5], 8) == 20


def test_three_sum_multi_repeated_values():
    assert three_sum_multi([1, 1, 2, 2, 2, 2], 5) == 12
