from solution import num_rolls_to_target


def test_num_rolls_to_target_one_die():
    assert num_rolls_to_target(1, 6, 3) == 1


def test_num_rolls_to_target_two_dice():
    assert num_rolls_to_target(2, 6, 7) == 6


def test_num_rolls_to_target_unreachable():
    assert num_rolls_to_target(2, 2, 5) == 0


def test_num_rolls_to_target_minimum_sum():
    assert num_rolls_to_target(3, 2, 3) == 1


def test_num_rolls_to_target_large_modulo():
    assert num_rolls_to_target(30, 30, 500) == 222616187
