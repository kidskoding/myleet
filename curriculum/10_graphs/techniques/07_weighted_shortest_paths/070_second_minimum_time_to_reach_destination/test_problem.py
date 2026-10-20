from solution import second_minimum_time


def test_second_minimum_time_normal_case():
    edges = [[1, 2], [1, 3], [1, 4], [3, 4], [4, 5]]

    assert second_minimum_time(5, edges, 3, 5) == 13


def test_second_minimum_time_two_nodes():
    assert second_minimum_time(2, [[1, 2]], 3, 2) == 11
