from solution import shortest_path_length


def test_shortest_path_length_normal_case():
    assert shortest_path_length([[1, 2, 3], [0], [0], [0]]) == 4


def test_shortest_path_length_two_nodes():
    assert shortest_path_length([[1], [0]]) == 1
