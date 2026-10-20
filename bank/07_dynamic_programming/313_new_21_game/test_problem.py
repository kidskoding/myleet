from solution import new21_game

TOLERANCE = 1e-5


def test_new21_game_one_draw_always_fine():
    assert abs(new21_game(10, 1, 10) - 1.0) < TOLERANCE


def test_new21_game_one_draw_partial():
    assert abs(new21_game(6, 1, 10) - 0.6) < TOLERANCE


def test_new21_game_blackjack_like():
    assert abs(new21_game(21, 17, 10) - 0.73278) < TOLERANCE


def test_new21_game_never_draws():
    assert abs(new21_game(0, 0, 1) - 1.0) < TOLERANCE


def test_new21_game_two_draws():
    assert abs(new21_game(2, 2, 2) - 0.75) < TOLERANCE
