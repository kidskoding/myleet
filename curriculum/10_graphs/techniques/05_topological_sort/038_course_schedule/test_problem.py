from solution import can_finish


def test_can_finish_true():
    assert can_finish(2, [[1, 0]]) is True


def test_can_finish_cycle_false():
    assert can_finish(2, [[1, 0], [0, 1]]) is False


def test_can_finish_no_prerequisites():
    assert can_finish(3, []) is True
