from solution import find_the_city


def test_find_the_city_prefers_farthest_threshold():
    edges = [[0, 1, 3], [1, 2, 1], [1, 3, 4], [2, 3, 1]]
    assert find_the_city(4, edges, 4) == 3


def test_find_the_city_tiebreak_largest_index():
    edges = [[0, 1, 2], [0, 4, 8], [1, 2, 3], [1, 4, 2], [2, 3, 1], [3, 4, 1]]
    assert find_the_city(5, edges, 2) == 0


def test_find_the_city_minimal_graph():
    assert find_the_city(2, [[0, 1, 1]], 1) in (0, 1)
