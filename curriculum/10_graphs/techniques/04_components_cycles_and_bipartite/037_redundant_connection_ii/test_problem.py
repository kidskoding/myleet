from solution import find_redundant_directed_connection


def test_find_redundant_directed_connection_cycle_only():
    assert find_redundant_directed_connection([[1, 2], [1, 3], [2, 3]]) == [2, 3]


def test_find_redundant_directed_connection_two_parents_in_cycle():
    assert find_redundant_directed_connection([[1, 2], [2, 3], [3, 4], [4, 1], [1, 5]]) == [4, 1]


def test_find_redundant_directed_connection_returns_last_candidate():
    assert find_redundant_directed_connection([[2, 1], [3, 1], [4, 2], [1, 4]]) == [2, 1]
