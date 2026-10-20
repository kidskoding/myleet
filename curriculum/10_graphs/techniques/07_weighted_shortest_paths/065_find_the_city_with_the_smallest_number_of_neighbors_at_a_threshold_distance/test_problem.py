from solution import find_the_city


def test_find_the_city_normal_case():
    edges = [[0, 1, 3], [1, 2, 1], [1, 3, 4], [2, 3, 1]]

    assert find_the_city(4, edges, 4) == 3


def test_find_the_city_all_reachable_picks_highest_index():
    edges = [[0, 1, 2], [0, 4, 8], [1, 2, 3], [1, 4, 2], [2, 3, 1], [3, 4, 1]]

    assert find_the_city(5, edges, 2) == 0
