from solution import num_teams


def test_num_teams_normal():
    assert num_teams([2, 5, 3, 4, 1]) == 3


def test_num_teams_increasing():
    assert num_teams([2, 1, 3]) == 0


def test_num_teams_long_increasing():
    assert num_teams([1, 2, 3, 4]) == 4


def test_num_teams_short():
    assert num_teams([1, 2]) == 0
