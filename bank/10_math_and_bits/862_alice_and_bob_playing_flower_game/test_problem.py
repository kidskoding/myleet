from solution import flower_game


def test_flower_game_example():
    assert flower_game(3, 2) == 3


def test_flower_game_single_choice_each():
    assert flower_game(1, 1) == 0


def test_flower_game_one_and_two():
    assert flower_game(1, 2) == 1


def test_flower_game_square():
    assert flower_game(4, 4) == 8


def test_flower_game_odd_by_odd():
    assert flower_game(3, 3) == 4


def test_flower_game_limits():
    assert flower_game(100000, 100000) == 5000000000
