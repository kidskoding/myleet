from solution import cherry_pickup


def test_cherry_pickup_normal():
    assert cherry_pickup([[0, 1, -1], [1, 0, -1], [1, 1, 1]]) == 5


def test_cherry_pickup_blocked():
    assert cherry_pickup([[1, 1, -1], [1, -1, 1], [-1, 1, 1]]) == 0


def test_cherry_pickup_open_grid():
    assert cherry_pickup([[1, 1, 1], [1, 1, 1], [1, 1, 1]]) == 8
