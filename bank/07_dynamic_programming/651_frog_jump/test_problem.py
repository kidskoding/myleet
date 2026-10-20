from solution import can_cross


def test_can_cross_example_true():
    assert can_cross([0, 1, 3, 5, 6, 8, 12, 17]) is True


def test_can_cross_example_false():
    assert can_cross([0, 1, 2, 3, 4, 8, 9, 11]) is False


def test_can_cross_two_stones():
    assert can_cross([0, 1]) is True


def test_can_cross_first_gap_too_big():
    assert can_cross([0, 2]) is False


def test_can_cross_growing_jumps():
    assert can_cross([0, 1, 3, 6, 10, 15, 21]) is True


def test_can_cross_needs_slowdown():
    assert can_cross([0, 1, 3, 4, 5, 7, 9, 10, 12]) is True
