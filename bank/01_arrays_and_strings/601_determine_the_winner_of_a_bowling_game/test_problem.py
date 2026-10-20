from solution import is_winner


def test_is_winner_player_one():
    assert is_winner([5, 10, 3, 2], [6, 5, 7, 3]) == 1


def test_is_winner_player_two():
    assert is_winner([3, 5, 7, 6], [8, 10, 10, 2]) == 2


def test_is_winner_draw():
    assert is_winner([2, 3], [4, 1]) == 0


def test_is_winner_late_strikes_matter():
    assert is_winner([1, 1, 1, 10, 10, 10, 10], [10, 10, 10, 10, 1, 1, 1]) == 2


def test_is_winner_single_turn():
    assert is_winner([10], [9]) == 1


def test_is_winner_bonus_only_lasts_two_turns():
    assert is_winner([10, 0, 0, 5], [0, 0, 8, 8]) == 2
