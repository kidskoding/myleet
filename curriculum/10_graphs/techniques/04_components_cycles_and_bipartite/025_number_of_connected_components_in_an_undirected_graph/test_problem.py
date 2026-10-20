from solution import count_components


def test_count_components_two_components():
    assert count_components(5, [[0, 1], [1, 2], [3, 4]]) == 2


def test_count_components_no_edges():
    assert count_components(3, []) == 3


def test_count_components_single_node():
    assert count_components(1, []) == 1
