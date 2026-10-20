from solution import is_self_crossing


def test_is_self_crossing_true():
    assert is_self_crossing([2, 1, 1, 2]) is True


def test_is_self_crossing_spiral_out():
    assert is_self_crossing([1, 2, 3, 4]) is False


def test_is_self_crossing_square():
    assert is_self_crossing([1, 1, 1, 1]) is True
