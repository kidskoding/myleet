from solution import can_partition_k_subsets


def test_can_partition_k_subsets_possible():
    assert can_partition_k_subsets([4, 3, 2, 3, 5, 2, 1], 4) is True


def test_can_partition_k_subsets_impossible():
    assert can_partition_k_subsets([1, 2, 3, 4], 3) is False
