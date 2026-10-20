from solution import possible_bipartition


def test_possible_bipartition_true():
    assert possible_bipartition(4, [[1, 2], [1, 3], [2, 4]]) is True


def test_possible_bipartition_false():
    assert possible_bipartition(3, [[1, 2], [1, 3], [2, 3]]) is False
