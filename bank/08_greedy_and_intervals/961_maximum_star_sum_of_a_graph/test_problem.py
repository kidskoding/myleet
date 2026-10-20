from solution import max_star_sum


def test_max_star_sum_example_one():
    vals = [1, 2, 3, 4, 10, -10, -20]
    edges = [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [3, 6]]
    assert max_star_sum(vals, edges, 2) == 16


def test_max_star_sum_single_node():
    assert max_star_sum([-5], [], 0) == -5


def test_max_star_sum_zero_edges_allowed():
    assert max_star_sum([1, 5, 3], [[0, 1], [1, 2]], 0) == 5


def test_max_star_sum_skips_negative_neighbors():
    assert max_star_sum([1, -2, -3], [[0, 1], [0, 2]], 2) == 1


def test_max_star_sum_limited_by_k():
    assert max_star_sum([0, 4, 5, 6], [[0, 1], [0, 2], [0, 3]], 2) == 11
