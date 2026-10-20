from solution import get_kth


def test_get_kth_tie_broken_by_value():
    assert get_kth(12, 15, 2) == 13


def test_get_kth_mixed_powers():
    assert get_kth(7, 11, 4) == 7


def test_get_kth_single_value():
    assert get_kth(1, 1, 1) == 1


def test_get_kth_small_range():
    assert get_kth(1, 5, 3) == 4


def test_get_kth_wider_range():
    assert get_kth(10, 20, 5) == 13
