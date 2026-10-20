from solution import winner_of_game


def test_winner_of_game_alice_wins():
    assert winner_of_game("AAABABB") is True


def test_winner_of_game_no_moves():
    assert winner_of_game("AA") is False


def test_winner_of_game_bob_has_more():
    assert winner_of_game("ABBBBBBBAAA") is False


def test_winner_of_game_long_a_run():
    assert winner_of_game("AAAA") is True


def test_winner_of_game_single_piece():
    assert winner_of_game("A") is False


def test_winner_of_game_equal_moves_bob_wins():
    assert winner_of_game("AAABBB") is False
