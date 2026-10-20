from solution import find_cheapest_price


def test_find_cheapest_price_within_stops():
    flights = [[0, 1, 100], [1, 2, 100], [0, 2, 500]]
    assert find_cheapest_price(3, flights, 0, 2, 1) == 200


def test_find_cheapest_price_no_route():
    flights = [[0, 1, 100]]
    assert find_cheapest_price(3, flights, 0, 2, 1) == -1


def test_find_cheapest_price_direct_is_cheapest():
    flights = [[0, 1, 100], [1, 2, 100], [0, 2, 100]]
    assert find_cheapest_price(3, flights, 0, 2, 0) == 100
