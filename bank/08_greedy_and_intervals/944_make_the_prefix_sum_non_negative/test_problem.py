from solution import make_pref_sum_non_negative


def test_make_pref_sum_non_negative_already_fine():
    assert make_pref_sum_non_negative([2, 3, -5, 4]) == 0


def test_make_pref_sum_non_negative_one_move():
    assert make_pref_sum_non_negative([3, -5, -2, 6]) == 1


def test_make_pref_sum_non_negative_single_zero():
    assert make_pref_sum_non_negative([0]) == 0


def test_make_pref_sum_non_negative_negative_first():
    assert make_pref_sum_non_negative([-1, 1]) == 1


def test_make_pref_sum_non_negative_move_earlier_bigger_negative():
    assert make_pref_sum_non_negative([1, -10, 2, -1, 10]) == 1


def test_make_pref_sum_non_negative_several_moves():
    assert make_pref_sum_non_negative([-3, -2, -1, 10]) == 3
