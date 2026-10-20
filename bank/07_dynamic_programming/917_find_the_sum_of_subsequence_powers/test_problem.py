from solution import sum_of_powers


def test_sum_of_powers_consecutive_values():
    assert sum_of_powers([1, 2, 3, 4], 3) == 4


def test_sum_of_powers_equal_pair():
    assert sum_of_powers([2, 2], 2) == 0


def test_sum_of_powers_negative_values():
    assert sum_of_powers([4, 3, -1], 2) == 10


def test_sum_of_powers_whole_array():
    assert sum_of_powers([10, 1, 4], 3) == 3


def test_sum_of_powers_duplicates_mixed():
    assert sum_of_powers([1, 1, 5, 9], 3) == 8


def test_sum_of_powers_needs_modulo():
    nums = [-(10**8), 10**8, -(10**8) + 1, 10**8 - 1, 0, 3, 7 * 10**7, -(6 * 10**7)]
    assert sum_of_powers(nums, 2) == 789999979
