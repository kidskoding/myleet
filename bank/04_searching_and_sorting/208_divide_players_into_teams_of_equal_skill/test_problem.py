from solution import divide_players


def test_divide_players_example():
    assert divide_players([3, 2, 5, 1, 3, 4]) == 22


def test_divide_players_single_team():
    assert divide_players([3, 4]) == 12


def test_divide_players_impossible():
    assert divide_players([1, 1, 2, 3]) == -1


def test_divide_players_all_equal():
    assert divide_players([2, 2, 2, 2]) == 8


def test_divide_players_large_values():
    assert divide_players([1, 1000, 500, 501]) == 251500
