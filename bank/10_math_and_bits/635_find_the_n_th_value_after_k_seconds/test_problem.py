from solution import value_after_k_seconds


def test_value_after_k_seconds_example_one():
    assert value_after_k_seconds(4, 5) == 56


def test_value_after_k_seconds_example_two():
    assert value_after_k_seconds(5, 3) == 35


def test_value_after_k_seconds_single_element():
    assert value_after_k_seconds(1, 7) == 1


def test_value_after_k_seconds_one_second():
    assert value_after_k_seconds(5, 1) == 5


def test_value_after_k_seconds_limits_mod():
    assert value_after_k_seconds(1000, 1000) == 36237869
