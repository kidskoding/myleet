from solution import count_subgraphs_for_each_diameter


def test_count_subgraphs_for_each_diameter_path():
    assert count_subgraphs_for_each_diameter(4, [[1, 2], [2, 3], [2, 4]]) == [3, 4, 0]


def test_count_subgraphs_for_each_diameter_two_nodes():
    assert count_subgraphs_for_each_diameter(2, [[1, 2]]) == [1]


def test_count_subgraphs_for_each_diameter_star():
    assert count_subgraphs_for_each_diameter(3, [[1, 2], [2, 3]]) == [2, 1]
