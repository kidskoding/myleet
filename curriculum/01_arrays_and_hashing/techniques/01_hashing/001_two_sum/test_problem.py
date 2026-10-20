from solution import two_sum


def test_two_sum_normal():
    assert two_sum([2, 7, 11, 15], 9) == [0, 1]


def test_two_sum_middle_pair():
    assert two_sum([3, 2, 4], 6) == [1, 2]


def test_two_sum_duplicate_values():
    assert two_sum([3, 3], 6) == [0, 1]


def test_two_sum_all_negative():
    assert two_sum([-1, -2, -3, -4, -5], -8) == [2, 4]


def test_two_sum_mixed_signs():
    assert two_sum([-3, 4, 3, 90], 0) == [0, 2]


def test_two_sum_no_pair():
    assert two_sum([1, 2, 3], 100) == []
