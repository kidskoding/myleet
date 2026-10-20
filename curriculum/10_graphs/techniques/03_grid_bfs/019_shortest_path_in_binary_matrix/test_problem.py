from solution import shortest_path_binary_matrix


def test_shortest_path_binary_matrix_normal_case():
    assert shortest_path_binary_matrix([[0, 1], [1, 0]]) == 2


def test_shortest_path_binary_matrix_blocked():
    assert shortest_path_binary_matrix([[0, 1], [1, 1]]) == -1


def test_shortest_path_binary_matrix_single_cell():
    assert shortest_path_binary_matrix([[0]]) == 1
