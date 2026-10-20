from solution import max_vacation_days


def test_max_vacation_days_example():
    flights = [[0, 1, 1], [1, 0, 1], [1, 1, 0]]
    days = [[1, 3, 1], [6, 0, 3], [3, 3, 3]]
    assert max_vacation_days(flights, days) == 12


def test_max_vacation_days_no_flights():
    flights = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    days = [[1, 1, 1], [7, 7, 7], [7, 7, 7]]
    assert max_vacation_days(flights, days) == 3


def test_max_vacation_days_move_every_week():
    flights = [[0, 1, 1], [1, 0, 1], [1, 1, 0]]
    days = [[7, 0, 0], [0, 7, 0], [0, 0, 7]]
    assert max_vacation_days(flights, days) == 21


def test_max_vacation_days_single_city():
    assert max_vacation_days([[0]], [[5, 2]]) == 7


def test_max_vacation_days_one_way_flight_timing():
    flights = [[0, 1], [0, 0]]
    days = [[1, 1, 1], [0, 9, 0]]
    assert max_vacation_days(flights, days) == 10
