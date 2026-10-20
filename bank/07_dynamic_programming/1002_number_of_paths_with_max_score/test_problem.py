from solution import paths_with_max_score


def test_paths_with_max_score_single_best_path():
    assert paths_with_max_score(["E23", "2X2", "12S"]) == [7, 1]


def test_paths_with_max_score_tied_paths():
    assert paths_with_max_score(["E12", "1X1", "21S"]) == [4, 2]


def test_paths_with_max_score_blocked():
    assert paths_with_max_score(["E11", "XXX", "11S"]) == [0, 0]


def test_paths_with_max_score_two_by_two_ties():
    assert paths_with_max_score(["E1", "1S"]) == [1, 2]


def test_paths_with_max_score_only_diagonal():
    assert paths_with_max_score(["EX", "XS"]) == [0, 1]


def test_paths_with_max_score_larger_board():
    assert paths_with_max_score(["E3283", "47715", "31479", "X1X32", "721XS"]) == [40, 1]
