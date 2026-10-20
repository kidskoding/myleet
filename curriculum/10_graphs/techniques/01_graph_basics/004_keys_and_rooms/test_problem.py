from solution import can_visit_all_rooms


def test_can_visit_all_rooms_true():
    assert can_visit_all_rooms([[1], [2], [3], []]) is True


def test_can_visit_all_rooms_false():
    assert can_visit_all_rooms([[1, 3], [3, 0, 1], [2], [0]]) is False


def test_can_visit_all_rooms_single_room():
    assert can_visit_all_rooms([[]]) is True
