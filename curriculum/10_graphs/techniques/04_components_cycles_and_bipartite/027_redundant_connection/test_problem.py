from solution import find_redundant_connection


def test_find_redundant_connection_normal_case():
    assert find_redundant_connection([[1, 2], [1, 3], [2, 3]]) == [2, 3]


def test_find_redundant_connection_last_edge_closes_cycle():
    assert find_redundant_connection([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]) == [1, 4]
