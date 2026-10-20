from solution import is_happy


def test_is_happy_true():
    assert is_happy(19) is True


def test_is_happy_false():
    assert is_happy(2) is False


def test_is_happy_one():
    assert is_happy(1) is True
