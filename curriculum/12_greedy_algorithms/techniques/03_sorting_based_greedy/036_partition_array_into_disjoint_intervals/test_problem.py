from solution import partition_disjoint


def test_partition_disjoint_normal():
    assert partition_disjoint([5, 0, 3, 8, 6]) == 3


def test_partition_disjoint_longer():
    assert partition_disjoint([1, 1, 1, 0, 6, 12]) == 4
