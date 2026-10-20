from solution import can_reach_end


def test_can_reach_end_reachable():
    assert can_reach_end("011010", 2, 3) is True


def test_can_reach_end_blocked():
    assert can_reach_end("01101110", 2, 3) is False
