from solution import shortest_path_length


def test_shortest_path_length_star_graph():
    assert shortest_path_length([[1, 2, 3], [0], [0], [0]]) == 4


def test_shortest_path_length_branching_tree():
    assert shortest_path_length([[1], [0, 2, 4], [1, 3], [2], [1, 5], [4]]) == 6
