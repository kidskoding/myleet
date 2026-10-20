from solution import min_moves


def test_min_moves_mixed():
    assert min_moves([2, 1, 3]) == 3


def test_min_moves_one_larger():
    assert min_moves([4, 4, 5]) == 2


def test_min_moves_single():
    assert min_moves([7]) == 0


def test_min_moves_two_far_apart():
    assert min_moves([1, 100]) == 99


def test_min_moves_many_below_max():
    assert min_moves([1, 1, 100]) == 198
