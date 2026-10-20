from solution import min_cost_connecting_cities


def test_min_cost_connecting_cities_normal():
    connections = [[1, 2, 5], [1, 3, 6], [2, 3, 1]]
    assert min_cost_connecting_cities(3, connections) == 6


def test_min_cost_connecting_cities_disconnected():
    connections = [[1, 2, 3], [3, 4, 4]]
    assert min_cost_connecting_cities(4, connections) == -1


def test_min_cost_connecting_cities_single_city():
    assert min_cost_connecting_cities(1, []) == 0
