from solution import corp_flight_bookings


def test_corp_flight_bookings_normal():
    bookings = [[1, 2, 10], [2, 3, 20], [2, 5, 25]]
    assert corp_flight_bookings(bookings, 5) == [10, 55, 45, 25, 25]


def test_corp_flight_bookings_single_flight():
    assert corp_flight_bookings([[1, 2, 10], [2, 2, 15]], 2) == [10, 25]
