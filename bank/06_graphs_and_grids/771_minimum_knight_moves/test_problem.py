from solution import min_knight_moves


def test_min_knight_moves_one_jump():
    assert min_knight_moves(2, 1) == 1


def test_min_knight_moves_diagonal_five():
    assert min_knight_moves(5, 5) == 4


def test_min_knight_moves_origin():
    assert min_knight_moves(0, 0) == 0


def test_min_knight_moves_adjacent_diagonal():
    assert min_knight_moves(1, 1) == 2


def test_min_knight_moves_adjacent_straight():
    assert min_knight_moves(1, 0) == 3


def test_min_knight_moves_negative_coordinates():
    assert min_knight_moves(-2, -2) == 4


def test_min_knight_moves_far_target():
    assert min_knight_moves(300, 0) == 150
