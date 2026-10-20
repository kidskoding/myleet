from solution import can_reach


def test_can_reach_true():
    assert can_reach([4, 2, 3, 0, 3, 1, 2], 5) is True


def test_can_reach_false():
    assert can_reach([4, 2, 3, 0, 3, 1, 2], 3) is False


def test_can_reach_start_is_zero_value():
    assert can_reach([3, 0, 2, 1, 2], 2) is True


def test_can_reach_single_element():
    assert can_reach([0], 0) is True
