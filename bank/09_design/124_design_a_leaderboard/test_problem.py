from solution import Leaderboard


def test_leaderboard_top_sums_best_scores():
    board = Leaderboard()
    board.add_score(1, 10)
    board.add_score(2, 20)
    board.add_score(3, 30)
    assert board.top(2) == 50


def test_leaderboard_add_score_accumulates():
    board = Leaderboard()
    board.add_score(1, 5)
    board.add_score(1, 7)
    assert board.top(1) == 12


def test_leaderboard_reset_then_rejoin():
    board = Leaderboard()
    board.add_score(1, 50)
    board.add_score(2, 40)
    board.reset(1)
    assert board.top(1) == 40
    board.add_score(1, 5)
    assert board.top(2) == 45


def test_leaderboard_top_all_players():
    board = Leaderboard()
    for player, score in ((1, 3), (2, 9), (3, 1), (4, 9)):
        board.add_score(player, score)
    assert board.top(4) == 22
    assert board.top(2) == 18


def test_leaderboard_ties_count_each_player():
    board = Leaderboard()
    board.add_score(7, 15)
    board.add_score(8, 15)
    board.add_score(9, 2)
    assert board.top(2) == 30
