from solution import sum_of_power


def test_sum_of_power_example_one():
    assert sum_of_power([1, 2, 3], 3) == 6


def test_sum_of_power_example_two():
    assert sum_of_power([2, 3, 3], 5) == 4


def test_sum_of_power_unreachable():
    assert sum_of_power([1, 2, 3], 7) == 0


def test_sum_of_power_single():
    assert sum_of_power([1], 1) == 1


def test_sum_of_power_duplicates():
    assert sum_of_power([1, 1], 1) == 4


def test_sum_of_power_modulo():
    assert sum_of_power([1] * 100, 1) == 100 * pow(2, 99, 10**9 + 7) % (10**9 + 7)
