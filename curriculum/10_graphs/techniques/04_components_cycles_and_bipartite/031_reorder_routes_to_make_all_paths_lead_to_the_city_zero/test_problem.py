from solution import min_reorder


def test_min_reorder_normal_case():
    assert min_reorder(6, [[0, 1], [1, 3], [2, 3], [4, 0], [4, 5]]) == 3


def test_min_reorder_already_oriented():
    assert min_reorder(3, [[1, 0], [2, 0]]) == 0
