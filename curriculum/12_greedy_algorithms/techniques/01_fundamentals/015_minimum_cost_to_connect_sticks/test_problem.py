from solution import connect_sticks


def test_connect_sticks_three():
    assert connect_sticks([2, 4, 3]) == 14


def test_connect_sticks_four():
    assert connect_sticks([1, 8, 3, 5]) == 30


def test_connect_sticks_single():
    assert connect_sticks([5]) == 0
