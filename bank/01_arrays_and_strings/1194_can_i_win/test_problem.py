from solution import can_i_win


def test_can_i_win_example_one():
    assert can_i_win(10, 11) is False


def test_can_i_win_example_two():
    assert can_i_win(10, 0) is True


def test_can_i_win_example_three():
    assert can_i_win(10, 1) is True


def test_can_i_win_impossible_sum():
    assert can_i_win(5, 50) is False


def test_can_i_win_small_win():
    assert can_i_win(4, 6) is True
