from solution import find_cheapest_price


def test_find_cheapest_price_normal_case():
    flights = [[0, 1, 100], [1, 2, 100], [0, 2, 500]]

    assert find_cheapest_price(3, flights, 0, 2, 1) == 200


def test_find_cheapest_price_no_valid_route():
    assert find_cheapest_price(3, [[0, 1, 100]], 0, 2, 1) == -1
