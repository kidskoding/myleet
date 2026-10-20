from solution import mice_and_cheese


def test_mice_and_cheese_split():
    assert mice_and_cheese([1, 1, 3, 4], [4, 4, 1, 1], 2) == 15


def test_mice_and_cheese_first_eats_all():
    assert mice_and_cheese([1, 1], [1, 1], 2) == 2


def test_mice_and_cheese_k_zero():
    assert mice_and_cheese([9, 9], [1, 2], 0) == 3


def test_mice_and_cheese_forced_bad_pick():
    assert mice_and_cheese([1, 2], [10, 20], 1) == 21


def test_mice_and_cheese_single():
    assert mice_and_cheese([5], [3], 1) == 5
