from solution import find_center


def test_find_center_of_star_graph_triangle_edges():
    assert find_center([[1, 2], [2, 3], [4, 2]]) == 2


def test_find_center_of_star_graph_minimal():
    assert find_center([[1, 2]]) == 1
