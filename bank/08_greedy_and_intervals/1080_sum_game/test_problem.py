from solution import sum_game


def test_sum_game_no_moves_equal():
    assert sum_game("5023") is False


def test_sum_game_alice_wins():
    assert sum_game("25??") is True


def test_sum_game_bob_wins():
    assert sum_game("?3295???") is False


def test_sum_game_mirror():
    assert sum_game("??") is False


def test_sum_game_odd_marks():
    assert sum_game("9?") is True


def test_sum_game_even_marks_gap_too_big():
    assert sum_game("?9?0") is True


def test_sum_game_no_moves_unequal():
    assert sum_game("1200") is True
