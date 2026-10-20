from solution import make_connected


def test_make_connected_one_move():
    assert make_connected(4, [[0, 1], [0, 2], [1, 2]]) == 1


def test_make_connected_two_moves():
    assert make_connected(6, [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3]]) == 2


def test_make_connected_not_enough_cables():
    assert make_connected(6, [[0, 1], [0, 2], [0, 3], [1, 2]]) == -1


def test_make_connected_single_computer():
    assert make_connected(1, []) == 0


def test_make_connected_already_connected():
    assert make_connected(3, [[0, 1], [1, 2]]) == 0


def test_make_connected_two_groups():
    assert make_connected(5, [[0, 1], [0, 2], [1, 2], [3, 4]]) == 1
