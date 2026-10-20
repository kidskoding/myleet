from solution import UnionFind, number_of_provinces


def test_number_of_provinces_all_connected():
    assert number_of_provinces([[1, 1, 0], [1, 1, 0], [0, 0, 1]]) == 2


def test_number_of_provinces_none_connected():
    assert number_of_provinces([[1, 0, 0], [0, 1, 0], [0, 0, 1]]) == 3


def test_number_of_provinces_single_city():
    assert number_of_provinces([[1]]) == 1


def test_union_find_merges_and_counts():
    union_find = UnionFind(5)

    assert union_find.union(0, 1) is True
    assert union_find.union(0, 1) is False
    assert union_find.find(0) == union_find.find(1)


def test_union_find_keeps_disjoint_sets_apart():
    union_find = UnionFind(4)
    union_find.union(0, 1)
    union_find.union(2, 3)

    assert union_find.find(0) != union_find.find(2)
