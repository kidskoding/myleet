from solution import game_of_life


def test_game_of_life_still_life():
    board = [[1, 1], [1, 1]]
    game_of_life(board)
    assert board == [[1, 1], [1, 1]]


def test_game_of_life_blinker():
    board = [[0, 1, 0], [0, 1, 0], [0, 1, 0]]
    game_of_life(board)
    assert board == [[0, 0, 0], [1, 1, 1], [0, 0, 0]]


def test_game_of_life_all_dead():
    board = [[0, 0], [0, 0]]
    game_of_life(board)
    assert board == [[0, 0], [0, 0]]
