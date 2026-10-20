from solution import maximum_top


def test_maximum_top_example_one():
    assert maximum_top([5, 2, 2, 4, 0, 6], 4) == 5


def test_maximum_top_single_odd_moves():
    assert maximum_top([2], 1) == -1


def test_maximum_top_single_even_moves():
    assert maximum_top([7], 2) == 7


def test_maximum_top_zero_moves():
    assert maximum_top([1, 9], 0) == 1


def test_maximum_top_k_equals_length():
    assert maximum_top([1, 2, 3], 3) == 2


def test_maximum_top_k_beyond_length():
    assert maximum_top([1, 5, 2], 5) == 5


def test_maximum_top_one_move_reveals_next():
    assert maximum_top([3, 9], 1) == 9
