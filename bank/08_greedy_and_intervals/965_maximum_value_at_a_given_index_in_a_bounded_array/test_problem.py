from solution import max_value


def test_max_value_example_one():
    assert max_value(4, 2, 6) == 2


def test_max_value_example_two():
    assert max_value(6, 1, 10) == 3


def test_max_value_single_element():
    assert max_value(1, 0, 5) == 5


def test_max_value_only_ones_fit():
    assert max_value(3, 0, 3) == 1


def test_max_value_middle_peak():
    assert max_value(3, 1, 6) == 2


def test_max_value_large_budget():
    assert max_value(1, 0, 10**9) == 10**9
