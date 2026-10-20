from solution import MyCalendarThree


def test_my_calendar_three_tracks_max_overlap():
    calendar = MyCalendarThree()

    assert calendar.book(10, 20) == 1
    assert calendar.book(50, 60) == 1
    assert calendar.book(10, 40) == 2
    assert calendar.book(5, 15) == 3
    assert calendar.book(5, 10) == 3
    assert calendar.book(25, 55) == 3


def test_my_calendar_three_disjoint_bookings_stay_at_one():
    calendar = MyCalendarThree()

    assert calendar.book(10, 20) == 1
    assert calendar.book(30, 40) == 1


def test_my_calendar_three_touching_intervals_do_not_overlap():
    calendar = MyCalendarThree()

    assert calendar.book(10, 20) == 1
    assert calendar.book(20, 30) == 1


def test_my_calendar_three_triple_overlap():
    calendar = MyCalendarThree()
    calendar.book(10, 20)
    calendar.book(15, 25)

    assert calendar.book(12, 18) == 3
