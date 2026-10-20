from solution import min_refuel_stops


def test_min_refuel_stops_normal():
    assert min_refuel_stops(100, 10, [[10, 60], [20, 30], [30, 30], [60, 40]]) == 2


def test_min_refuel_stops_no_stations_needed():
    assert min_refuel_stops(1, 1, []) == 0


def test_min_refuel_stops_unreachable():
    assert min_refuel_stops(100, 1, [[10, 100]]) == -1
