from solution import remove_stones


def test_remove_stones_normal():
    assert remove_stones([[0, 0], [0, 1], [1, 0], [1, 2], [2, 1], [2, 2]]) == 5


def test_remove_stones_partial():
    assert remove_stones([[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]]) == 3


def test_remove_stones_isolated():
    assert remove_stones([[0, 0]]) == 0


def test_remove_stones_two_disconnected():
    assert remove_stones([[0, 0], [1, 1]]) == 0
