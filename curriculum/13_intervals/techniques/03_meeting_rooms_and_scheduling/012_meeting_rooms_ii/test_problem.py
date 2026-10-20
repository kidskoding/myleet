from solution import min_meeting_rooms


def test_min_meeting_rooms_empty():
    assert min_meeting_rooms([]) == 0


def test_min_meeting_rooms_single_meeting():
    assert min_meeting_rooms([[1, 5]]) == 1


def test_min_meeting_rooms_normal():
    assert min_meeting_rooms([[0, 30], [5, 10], [15, 20]]) == 2


def test_min_meeting_rooms_back_to_back():
    assert min_meeting_rooms([[7, 10], [2, 4]]) == 1
