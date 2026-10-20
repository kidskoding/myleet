from solution import SnakeGame


def play(game: SnakeGame, moves: str) -> list[int]:
    return [game.move(direction) for direction in moves]


def test_move_eats_food_in_order_then_hits_wall():
    game = SnakeGame(3, 2, [[1, 2], [0, 1]])
    assert play(game, "RDRULU") == [0, 0, 1, 1, 2, -1]


def test_move_into_wall_immediately():
    game = SnakeGame(2, 2, [])
    assert game.move("L") == -1


def test_move_bites_itself():
    game = SnakeGame(4, 4, [[0, 1], [0, 2], [1, 2], [1, 1]])
    assert play(game, "RRDLU") == [1, 2, 3, 4, -1]


def test_move_can_follow_its_own_tail():
    game = SnakeGame(3, 3, [[0, 1], [1, 1], [1, 0]])
    assert play(game, "RDLUR") == [1, 2, 3, 3, 3]


def test_move_food_appears_only_after_previous_is_eaten():
    game = SnakeGame(3, 2, [[0, 2], [0, 1]])
    assert play(game, "RRDLU") == [0, 1, 1, 1, 2]
