from solution import meeting_rooms_ii


def test_meeting_rooms_ii_normal():
    assert meeting_rooms_ii([[0, 30], [5, 10], [15, 20]]) == 2


def test_meeting_rooms_ii_no_overlap():
    assert meeting_rooms_ii([[7, 10], [2, 4]]) == 1


def test_meeting_rooms_ii_empty():
    assert meeting_rooms_ii([]) == 0


def test_meeting_rooms_ii_single():
    assert meeting_rooms_ii([[1, 5]]) == 1
