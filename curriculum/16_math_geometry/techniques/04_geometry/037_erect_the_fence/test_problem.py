from solution import outer_trees


def test_outer_trees_normal():
    trees = [[1, 1], [2, 2], [2, 0], [2, 4], [3, 3], [4, 2]]
    result = outer_trees(trees)

    assert sorted(result) == sorted([[1, 1], [2, 0], [2, 4], [3, 3], [4, 2]])


def test_outer_trees_collinear():
    result = outer_trees([[1, 2], [2, 2], [4, 2]])

    assert sorted(result) == sorted([[1, 2], [2, 2], [4, 2]])
