from solution import special_nodes


def test_special_nodes_example_star():
    assert special_nodes(4, [[0, 1], [0, 2], [0, 3]], 1, 2, 3) == 3


def test_special_nodes_example_path_none():
    assert special_nodes(4, [[0, 1], [1, 2], [2, 3]], 0, 3, 2) == 0


def test_special_nodes_example_branch():
    assert special_nodes(4, [[0, 1], [1, 2], [1, 3]], 1, 3, 0) == 1


def test_special_nodes_middle_of_path():
    assert special_nodes(5, [[0, 1], [1, 2], [2, 3], [3, 4]], 0, 2, 4) == 1


def test_special_nodes_three_four_five():
    edges = [[i, i + 1] for i in range(8)]
    assert special_nodes(9, edges, 0, 7, 8) == 1
