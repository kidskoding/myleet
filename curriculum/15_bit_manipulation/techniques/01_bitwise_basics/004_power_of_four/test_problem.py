from solution import is_power_of_four


def test_is_power_of_four_true():
    assert is_power_of_four(16) is True


def test_is_power_of_four_false_power_of_two():
    assert is_power_of_four(8) is False


def test_is_power_of_four_zero():
    assert is_power_of_four(0) is False


def test_is_power_of_four_one():
    assert is_power_of_four(1) is True


def test_is_power_of_four_negative():
    assert is_power_of_four(-4) is False
