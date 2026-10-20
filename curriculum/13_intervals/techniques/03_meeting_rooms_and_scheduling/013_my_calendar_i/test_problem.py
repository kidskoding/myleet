from solution import MyCalendar


def test_my_calendar_accepts_non_overlapping():
    calendar = MyCalendar()
    assert calendar.book(10, 20) is True
    assert calendar.book(20, 30) is True


def test_my_calendar_rejects_overlap():
    calendar = MyCalendar()
    assert calendar.book(10, 20) is True
    assert calendar.book(15, 25) is False
