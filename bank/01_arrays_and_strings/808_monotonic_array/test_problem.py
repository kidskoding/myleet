from solution import is_monotonic


def test_is_monotonic_increasing_with_repeat():
    assert is_monotonic([1, 2, 2, 3]) is True


def test_is_monotonic_decreasing_with_repeat():
    assert is_monotonic([6, 5, 4, 4]) is True


def test_is_monotonic_up_then_down():
    assert is_monotonic([1, 3, 2]) is False


def test_is_monotonic_single():
    assert is_monotonic([1]) is True


def test_is_monotonic_all_equal():
    assert is_monotonic([2, 2, 2]) is True


def test_is_monotonic_late_change():
    assert is_monotonic([5, 4, 4, 3, 4]) is False
