from solution import minimum_cost


def test_minimum_cost_normal_case():
    edges = [[0, 1, 10], [1, 2, 10], [2, 5, 10], [0, 3, 1], [3, 4, 10], [4, 5, 15]]
    passing_fees = [5, 1, 2, 20, 20, 3]

    assert minimum_cost(30, edges, passing_fees) == 11


def test_minimum_cost_no_valid_route():
    assert minimum_cost(5, [[0, 1, 10]], [0, 5]) == -1
