from solution import best_team_score


def test_best_team_score_everyone():
    assert best_team_score([1, 3, 5, 10, 15], [1, 2, 3, 4, 5]) == 34


def test_best_team_score_same_age_allowed():
    assert best_team_score([4, 5, 6, 5], [2, 1, 2, 1]) == 16


def test_best_team_score_drop_young_star():
    assert best_team_score([1, 2, 3, 5], [8, 9, 10, 1]) == 6


def test_best_team_score_single_player():
    assert best_team_score([7], [3]) == 7


def test_best_team_score_all_same_age():
    assert best_team_score([9, 1, 4], [5, 5, 5]) == 14


def test_best_team_score_pick_one_star():
    assert best_team_score([10, 1, 1, 1], [1, 2, 3, 4]) == 10
