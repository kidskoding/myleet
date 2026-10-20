from solution import find_smallest_set_of_vertices


def test_find_smallest_set_of_vertices_normal_case():
    edges = [[0, 1], [2, 1], [3, 1], [1, 4], [2, 4]]

    assert sorted(find_smallest_set_of_vertices(5, edges)) == [0, 2, 3]


def test_find_smallest_set_of_vertices_no_edges():
    assert sorted(find_smallest_set_of_vertices(3, [])) == [0, 1, 2]
