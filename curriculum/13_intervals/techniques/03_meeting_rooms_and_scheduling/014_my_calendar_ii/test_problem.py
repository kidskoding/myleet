from solution import MyCalendarTwo


def test_my_calendar_two_allows_double_book():
    calendar = MyCalendarTwo()
    assert calendar.book(10, 20) is True
    assert calendar.book(50, 60) is True
    assert calendar.book(10, 40) is True


def test_my_calendar_two_rejects_triple_book():
    calendar = MyCalendarTwo()
    calendar.book(10, 20)
    calendar.book(50, 60)
    calendar.book(10, 40)
    assert calendar.book(5, 15) is False
    assert calendar.book(5, 10) is True
