from solution import count_sub_trees


def test_count_sub_trees_example_one():
    edges = [[0, 1], [0, 2], [1, 4], [1, 5], [2, 3], [2, 6]]
    assert count_sub_trees(7, edges, "abaedcd") == [2, 1, 1, 1, 1, 1, 1]


def test_count_sub_trees_all_same_label():
    assert count_sub_trees(4, [[0, 1], [1, 2], [0, 3]], "bbbb") == [4, 2, 1, 1]


def test_count_sub_trees_example_three():
    assert count_sub_trees(5, [[0, 1], [0, 2], [1, 3], [0, 4]], "aabab") == [3, 2, 1, 1, 1]


def test_count_sub_trees_single_node():
    assert count_sub_trees(1, [], "z") == [1]


def test_count_sub_trees_edges_listed_child_first():
    assert count_sub_trees(3, [[1, 0], [2, 1]], "aaa") == [3, 2, 1]
