from solution import is_power_of_two


def test_is_power_of_two_true():
    assert is_power_of_two(16) is True


def test_is_power_of_two_false():
    assert is_power_of_two(18) is False


def test_is_power_of_two_zero():
    assert is_power_of_two(0) is False


def test_is_power_of_two_one():
    assert is_power_of_two(1) is True


def test_is_power_of_two_negative():
    assert is_power_of_two(-4) is False
