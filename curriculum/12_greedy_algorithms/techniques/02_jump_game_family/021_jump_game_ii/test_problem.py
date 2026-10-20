from solution import jump


def test_jump_normal():
    assert jump([2, 3, 1, 1, 4]) == 2


def test_jump_single_index():
    assert jump([0]) == 0


def test_jump_already_at_end_with_zeros():
    assert jump([1, 1, 1, 1]) == 3


def test_jump_large_first_step():
    assert jump([5, 1, 1, 1, 1]) == 1
