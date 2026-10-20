from solution import can_jump


def test_can_jump_reachable():
    assert can_jump([2, 3, 1, 1, 4]) is True


def test_can_jump_unreachable():
    assert can_jump([3, 2, 1, 0, 4]) is False


def test_can_jump_single_index():
    assert can_jump([0]) is True


def test_can_jump_empty():
    assert can_jump([]) is True
