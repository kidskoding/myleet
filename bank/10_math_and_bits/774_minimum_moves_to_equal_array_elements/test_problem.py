from solution import min_moves


def test_min_moves_increasing():
    assert min_moves([1, 2, 3]) == 3


def test_min_moves_already_equal():
    assert min_moves([1, 1, 1]) == 0


def test_min_moves_single():
    assert min_moves([5]) == 0


def test_min_moves_negative_values():
    assert min_moves([-1, 1]) == 2


def test_min_moves_large_gap():
    assert min_moves([1, 1_000_000_000]) == 999_999_999
