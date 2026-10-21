from solution import prim_mst


def test_prim_mst_normal():
    adj = [
        [[1, 1], [2, 3]],
        [[0, 1], [2, 2], [3, 4]],
        [[0, 3], [1, 2], [3, 4]],
        [[1, 4], [2, 4]],
    ]
    assert prim_mst(4, adj) == 7


def test_prim_mst_disconnected():
    adj: list[list[list[int]]] = [[[1, 5]], [[0, 5]], []]
    assert prim_mst(3, adj) == -1


def test_prim_mst_single():
    assert prim_mst(1, [[]]) == 0
