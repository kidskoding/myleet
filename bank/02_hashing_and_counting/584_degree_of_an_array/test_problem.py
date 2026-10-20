from solution import find_shortest_sub_array


def test_find_shortest_sub_array_tie_on_degree():
    assert find_shortest_sub_array([1, 2, 2, 3, 1]) == 2


def test_find_shortest_sub_array_spread_out():
    assert find_shortest_sub_array([1, 2, 2, 3, 1, 4, 2]) == 6


def test_find_shortest_sub_array_single():
    assert find_shortest_sub_array([1]) == 1


def test_find_shortest_sub_array_all_distinct():
    assert find_shortest_sub_array([1, 2, 3]) == 1


def test_find_shortest_sub_array_competing_values():
    assert find_shortest_sub_array([2, 1, 1, 2, 1, 3, 3, 3, 1, 3, 1, 3, 2]) == 7
