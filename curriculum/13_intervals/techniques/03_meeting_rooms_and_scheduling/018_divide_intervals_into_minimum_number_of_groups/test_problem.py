from solution import min_groups


def test_min_groups_overlapping():
    assert min_groups([[5, 10], [6, 8], [1, 5], [2, 3], [1, 10]]) == 3


def test_min_groups_disjoint():
    assert min_groups([[1, 3], [5, 6], [8, 10], [11, 13]]) == 1
