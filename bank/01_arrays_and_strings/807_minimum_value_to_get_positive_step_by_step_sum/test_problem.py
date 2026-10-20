from solution import min_start_value


def test_min_start_value_mixed():
    assert min_start_value([-3, 2, -3, 4, 2]) == 5


def test_min_start_value_all_positive():
    assert min_start_value([1, 2]) == 1


def test_min_start_value_dips_late():
    assert min_start_value([1, -2, -3]) == 5


def test_min_start_value_single_negative():
    assert min_start_value([-5]) == 6


def test_min_start_value_single_positive():
    assert min_start_value([5]) == 1
