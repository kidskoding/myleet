from solution import minimize_array_value


def test_minimize_array_value_example():
    assert minimize_array_value([3, 7, 1, 6]) == 5


def test_minimize_array_value_first_dominates():
    assert minimize_array_value([10, 1]) == 10


def test_minimize_array_value_spread_from_end():
    assert minimize_array_value([0, 0, 0, 9]) == 3


def test_minimize_array_value_split_pair():
    assert minimize_array_value([0, 6]) == 3


def test_minimize_array_value_large_values():
    assert minimize_array_value([10**9, 10**9]) == 10**9
