from solution import is_n_straight_hand


def test_is_n_straight_hand_possible():
    assert is_n_straight_hand([1, 2, 3, 6, 2, 3, 4, 7, 8], 3) is True


def test_is_n_straight_hand_wrong_group_size():
    assert is_n_straight_hand([1, 2, 3, 4, 5], 4) is False
