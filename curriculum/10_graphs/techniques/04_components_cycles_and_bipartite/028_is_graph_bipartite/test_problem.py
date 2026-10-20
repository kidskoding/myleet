from solution import is_bipartite


def test_is_bipartite_true():
    assert is_bipartite([[1, 3], [0, 2], [1, 3], [0, 2]]) is True


def test_is_bipartite_false():
    assert is_bipartite([[1, 2, 3], [0, 2], [0, 1, 3], [0, 2]]) is False


def test_is_bipartite_no_edges():
    assert is_bipartite([[], []]) is True
