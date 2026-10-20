from solution import minimum_diameter_after_merge


def test_minimum_diameter_after_merge_star_and_edge():
    assert minimum_diameter_after_merge([[0, 1], [0, 2], [0, 3]], [[0, 1]]) == 3


def test_minimum_diameter_after_merge_same_trees():
    edges = [[0, 1], [0, 2], [0, 3], [2, 4], [2, 5], [3, 6], [2, 7]]
    assert minimum_diameter_after_merge(edges, edges) == 5


def test_minimum_diameter_after_merge_two_single_nodes():
    assert minimum_diameter_after_merge([], []) == 1


def test_minimum_diameter_after_merge_large_tree_dominates():
    assert minimum_diameter_after_merge([], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]]) == 6


def test_minimum_diameter_after_merge_two_paths():
    path = [[0, 1], [1, 2], [2, 3]]
    assert minimum_diameter_after_merge(path, path) == 5
