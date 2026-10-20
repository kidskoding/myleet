from solution import get_ancestors


def test_get_ancestors_normal_case():
    edges = [[0, 1], [0, 2], [1, 3], [2, 3]]

    result = get_ancestors(4, edges)

    assert result == [[], [0], [0], [0, 1, 2]]


def test_get_ancestors_no_edges():
    assert get_ancestors(3, []) == [[], [], []]
