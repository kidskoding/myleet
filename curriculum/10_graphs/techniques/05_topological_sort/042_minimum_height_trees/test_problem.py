from solution import find_min_height_trees


def test_find_min_height_trees_normal_case():
    edges = [[1, 0], [1, 2], [1, 3]]

    assert sorted(find_min_height_trees(4, edges)) == [1]


def test_find_min_height_trees_single_node():
    assert find_min_height_trees(1, []) == [0]
