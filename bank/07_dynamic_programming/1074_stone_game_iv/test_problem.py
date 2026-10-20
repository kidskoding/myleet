from solution import winner_square_game


def test_winner_square_game_one():
    assert winner_square_game(1) is True


def test_winner_square_game_two():
    assert winner_square_game(2) is False


def test_winner_square_game_perfect_square():
    assert winner_square_game(4) is True


def test_winner_square_game_three():
    assert winner_square_game(3) is True


def test_winner_square_game_seven():
    assert winner_square_game(7) is False


def test_winner_square_game_seventeen():
    assert winner_square_game(17) is False
