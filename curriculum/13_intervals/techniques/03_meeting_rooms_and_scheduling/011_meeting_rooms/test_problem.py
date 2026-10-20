from solution import can_attend_meetings


def test_can_attend_meetings_empty():
    assert can_attend_meetings([]) is True


def test_can_attend_meetings_no_overlap():
    assert can_attend_meetings([[0, 30], [35, 40]]) is True


def test_can_attend_meetings_true():
    assert can_attend_meetings([[7, 10], [2, 4]]) is True


def test_can_attend_meetings_false():
    assert can_attend_meetings([[0, 30], [5, 10], [15, 20]]) is False
