from solution import maximum_importance


def test_maximum_importance_dense():
    assert maximum_importance(5, [[0, 1], [1, 2], [2, 3], [0, 2], [1, 3], [2, 4]]) == 43


def test_maximum_importance_sparse():
    assert maximum_importance(5, [[0, 3], [2, 4], [1, 3]]) == 20


def test_maximum_importance_single_road():
    assert maximum_importance(2, [[0, 1]]) == 3


def test_maximum_importance_isolated_cities():
    assert maximum_importance(4, [[0, 1]]) == 7


def test_maximum_importance_star():
    assert maximum_importance(4, [[0, 1], [0, 2], [0, 3]]) == 18
