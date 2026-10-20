from solution import max_value


def test_max_value_two_events():
    assert max_value([[1, 2, 4], [3, 4, 3], [2, 3, 1]], 2) == 7


def test_max_value_one_big_event_wins():
    assert max_value([[1, 2, 4], [3, 4, 3], [2, 3, 10]], 2) == 10
