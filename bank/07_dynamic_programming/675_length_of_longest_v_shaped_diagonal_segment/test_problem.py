from solution import len_of_v_diagonal


def test_len_of_v_diagonal_example_one():
    grid = [[2, 2, 1, 2, 2], [2, 0, 2, 2, 0], [2, 0, 1, 1, 0], [1, 0, 2, 2, 2], [2, 0, 0, 2, 2]]
    assert len_of_v_diagonal(grid) == 5


def test_len_of_v_diagonal_example_two():
    grid = [[2, 2, 2, 2, 2], [2, 0, 2, 2, 0], [2, 0, 1, 1, 0], [1, 0, 2, 2, 2], [2, 0, 0, 2, 2]]
    assert len_of_v_diagonal(grid) == 4


def test_len_of_v_diagonal_straight_diagonal():
    grid = [[1, 2, 2, 2, 2], [2, 2, 2, 2, 0], [2, 0, 0, 0, 0], [0, 0, 2, 2, 2], [2, 0, 0, 2, 0]]
    assert len_of_v_diagonal(grid) == 5


def test_len_of_v_diagonal_lone_one():
    assert len_of_v_diagonal([[1]]) == 1


def test_len_of_v_diagonal_no_start():
    assert len_of_v_diagonal([[2, 0], [0, 2]]) == 0


def test_len_of_v_diagonal_counterclockwise_turn_not_allowed():
    grid = [[1, 1, 0], [1, 2, 1], [2, 1, 2]]
    assert len_of_v_diagonal(grid) == 2
